"""MyHealthVault OCR service (PaddleOCR behind a tiny FastAPI app).

Security properties:
- Requires a shared secret (OCR_SERVICE_TOKEN) on every request; refuses to
  start without one.
- Intended to listen on 127.0.0.1 only (see README / run command).
- Enforces size, page and pixel limits; rejects anything but PDF/JPEG/PNG.
- Never logs recognised text or file contents.

POST /ocr  (multipart: file=<bytes>, pages="2,3" optional for PDFs)
  -> {"pages": [{"page": 1, "text": "...", "confidence": 0.93}], "engine": "paddleocr"}
"""

from __future__ import annotations

import hmac
import io
import logging
import os
import threading
from statistics import mean

import pymupdf
import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import Image

from ocr_engine import build_engine, model_tier

MAX_BYTES = 5 * 1024 * 1024
MAX_PAGES = 20
MAX_SIDE_PX = 2000  # resize longest side to this before OCR
PDF_RENDER_DPI = 200
Image.MAX_IMAGE_PIXELS = 40_000_000  # decompression-bomb guard

MODEL_TIER = model_tier()

TOKEN = os.environ.get("OCR_SERVICE_TOKEN", "")
if len(TOKEN) < 32:
    raise SystemExit("OCR_SERVICE_TOKEN must be set to 32+ random characters.")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ocr")

app = FastAPI(title="MyHealthVault OCR", docs_url=None, redoc_url=None, openapi_url=None)

_engine = None
_engine_lock = threading.Lock()


def engine():
    """Lazily create one PaddleOCR instance (model load is slow)."""
    global _engine
    with _engine_lock:
        if _engine is None:
            _engine = build_engine(MODEL_TIER)
        return _engine


def require_token(authorization: str = Header(default="")) -> None:
    expected = f"Bearer {TOKEN}"
    if not hmac.compare_digest(authorization.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="unauthorized")


def downscale(img: Image.Image) -> Image.Image:
    img = img.convert("RGB")
    longest = max(img.size)
    if longest > MAX_SIDE_PX:
        scale = MAX_SIDE_PX / longest
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    return img


def recognise(img: Image.Image) -> tuple[str, float | None]:
    """OCR one page image; lines ordered top-to-bottom, left-to-right."""
    results = engine().predict(np.array(downscale(img)))
    lines: list[tuple[float, float, str, float]] = []
    for res in results:
        texts = res.get("rec_texts", []) or []
        scores = res.get("rec_scores", []) or []
        polys = res.get("rec_polys", []) or []
        for text, score, poly in zip(texts, scores, polys):
            if not text or not str(text).strip():
                continue
            pts = np.asarray(poly)
            lines.append((float(pts[:, 1].min()), float(pts[:, 0].min()), str(text).strip(), float(score)))
    # Group into rows: items whose top edges are within ~12px share a row.
    lines.sort(key=lambda item: (round(item[0] / 12), item[1]))
    rows: list[list[tuple[float, float, str, float]]] = []
    for item in lines:
        if rows and abs(rows[-1][0][0] - item[0]) <= 12:
            rows[-1].append(item)
        else:
            rows.append([item])
    text = "\n".join(" ".join(i[2] for i in sorted(row, key=lambda i: i[1])) for row in rows)
    confidence = mean(i[3] for i in lines) if lines else None
    return text, confidence


def sniff(data: bytes) -> str | None:
    if data.startswith(b"%PDF-"):
        return "pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    return None


def parse_pages(raw: str | None, page_count: int) -> list[int]:
    if not raw:
        return list(range(1, page_count + 1))
    pages = []
    for part in raw.split(","):
        part = part.strip()
        if not part.isdigit():
            raise HTTPException(status_code=400, detail="invalid pages")
        n = int(part)
        if n < 1 or n > page_count:
            raise HTTPException(status_code=400, detail="page out of range")
        pages.append(n)
    return sorted(set(pages))


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine": "paddleocr", "tier": MODEL_TIER, "loaded": _engine is not None}


@app.post("/ocr", dependencies=[Depends(require_token)])
async def ocr(file: UploadFile = File(...), pages: str | None = Form(default=None)) -> dict:
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    kind = sniff(data)
    if kind is None:
        raise HTTPException(status_code=415, detail="unsupported file type")

    out = []
    try:
        if kind == "pdf":
            with pymupdf.open(stream=data, filetype="pdf") as doc:
                if doc.needs_pass:
                    raise HTTPException(status_code=422, detail="pdf is encrypted")
                if doc.page_count > MAX_PAGES:
                    raise HTTPException(status_code=422, detail="too many pages")
                for n in parse_pages(pages, doc.page_count):
                    pix = doc[n - 1].get_pixmap(dpi=PDF_RENDER_DPI, alpha=False)
                    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                    text, conf = recognise(img)
                    out.append({"page": n, "text": text, "confidence": conf})
        else:
            with Image.open(io.BytesIO(data)) as img:
                text, conf = recognise(img)
            out.append({"page": 1, "text": text, "confidence": conf})
    except HTTPException:
        raise
    except Image.DecompressionBombError:
        raise HTTPException(status_code=413, detail="image too large")
    except Exception:  # noqa: BLE001 - never echo internals or content
        log.exception("ocr failed (kind=%s)", kind)
        raise HTTPException(status_code=500, detail="ocr failed")

    # Metadata only: page count and characters, never the text itself.
    log.info("ocr ok kind=%s pages=%d chars=%d", kind, len(out), sum(len(p["text"]) for p in out))
    return {"pages": out, "engine": "paddleocr"}

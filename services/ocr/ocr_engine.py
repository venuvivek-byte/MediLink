"""PaddleOCR engine construction, shared by the service and the image build."""

from __future__ import annotations

import os

# "mobile" (default): PP-OCRv5 mobile models, ~4-7x faster on CPU. "server":
# larger models; on a CPU without oneDNN they took ~25s for a phone photo and
# 55-150s per A4 page in local benchmarks, too slow for an upload request.
# On the synthetic test set both tiers produced the same clinical values.
MODEL_TIERS = {
    "mobile": {"text_detection_model_name": "PP-OCRv5_mobile_det", "text_recognition_model_name": "en_PP-OCRv5_mobile_rec"},
    "server": {"lang": "en"},
}


def model_tier() -> str:
    tier = os.environ.get("OCR_MODEL_TIER", "mobile")
    if tier not in MODEL_TIERS:
        raise SystemExit(f"OCR_MODEL_TIER must be one of: {', '.join(MODEL_TIERS)}")
    return tier


def build_engine(tier: str):
    from paddleocr import PaddleOCR

    return PaddleOCR(
        **MODEL_TIERS[tier],
        device="cpu",
        # Paddle 3.x on Windows CPUs: the oneDNN backend raises
        # "ConvertPirAttribute2RuntimeAttribute not support" for the
        # text-detection model. Plain CPU inference works everywhere.
        enable_mkldnn=False,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )

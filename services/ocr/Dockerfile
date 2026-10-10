# MyHealthVault OCR service image (used for the Hugging Face Space deploy).
# Same code and exact package pins as the local service; models are baked in
# at build time so a cold start never downloads anything.
FROM python:3.13-slim

# OpenCV (pulled in by PaddleOCR) needs these system libraries.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces run containers as uid 1000.
RUN useradd --create-home --uid 1000 app
USER app
ENV HOME=/home/app \
    PATH=/home/app/.local/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True \
    OCR_MODEL_TIER=mobile
WORKDIR /home/app/service

COPY --chown=app requirements.lock.txt .
RUN pip install --no-cache-dir --user -r requirements.lock.txt

COPY --chown=app warmup.py app.py ./
# Download the OCR models now, not on the first patient request.
RUN python warmup.py

EXPOSE 7860
# OCR_SERVICE_TOKEN is provided at runtime as a Space secret; app.py refuses to
# start without it.
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]

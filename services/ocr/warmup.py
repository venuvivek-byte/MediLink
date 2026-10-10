"""Build-time step: download and load the OCR models, then run one tiny
prediction so a broken install fails the image build, not a patient upload."""

import numpy as np

from ocr_engine import build_engine, model_tier

engine = build_engine(model_tier())
engine.predict(np.full((64, 256, 3), 255, dtype=np.uint8))
print("ocr models ready:", model_tier())

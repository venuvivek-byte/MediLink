# Starts the OCR service on 127.0.0.1:8001 (localhost only).
# Reads OCR_SERVICE_TOKEN from the app's .env.local so both sides share it.
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File services/ocr/run.ps1
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $root ".env.local"
$line = Get-Content $envFile | Where-Object { $_ -match '^OCR_SERVICE_TOKEN=' } | Select-Object -First 1
if (-not $line) { throw "OCR_SERVICE_TOKEN is missing from .env.local" }
$env:OCR_SERVICE_TOKEN = $line.Substring("OCR_SERVICE_TOKEN=".Length).Trim()
# Skip PaddleX's online model-source connectivity check on every start.
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "True"
$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
Set-Location $PSScriptRoot
& $python -I -m uvicorn app:app --host 127.0.0.1 --port 8001 --workers 1

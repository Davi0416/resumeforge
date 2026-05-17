# ResumeForge — inicia Ollama, backend Python e frontend React
# Execute no PowerShell: .\start.ps1

$ProjectDir = $PSScriptRoot

# ── Ollama ────────────────────────────────────────────────────────
Write-Host "Iniciando Ollama com GPU AMD (Vulkan)..." -ForegroundColor Cyan
$env:OLLAMA_VULKAN = "1"
$env:OLLAMA_ORIGINS = "*"
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Minimized

Start-Sleep -Seconds 2

# ── Backend Python ────────────────────────────────────────────────
Write-Host "Iniciando backend Python (FastAPI)..." -ForegroundColor Cyan
$BackendDir = Join-Path $ProjectDir "backend"
Start-Process -FilePath "powershell" -ArgumentList `
    "-NoExit", "-Command", `
    "cd '$ProjectDir'; python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload" `
    -WindowStyle Normal

Start-Sleep -Seconds 3

# ── Frontend React ────────────────────────────────────────────────
Write-Host "Iniciando frontend React (Vite)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList `
    "-NoExit", "-Command", `
    "cd '$ProjectDir'; npm run dev" `
    -WindowStyle Normal

Write-Host ""
Write-Host "Tudo iniciado! Abrindo http://localhost:5173 ..." -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

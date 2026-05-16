# setup-model.ps1
# Cria o modelo customizado ResumeForge no Ollama a partir do Modelfile.
# Execute uma vez antes de rodar o projeto pela primeira vez.
#
# Uso:
#   .\setup-model.ps1

Write-Host ""
Write-Host "=== ResumeForge — Setup do modelo ==="  -ForegroundColor Cyan
Write-Host ""

# Verifica se o Ollama está rodando
try {
    $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
} catch {
    Write-Host "ERRO: Ollama nao esta rodando. Inicie com:" -ForegroundColor Red
    Write-Host '  $env:OLLAMA_ORIGINS="*"; ollama serve' -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Verifica se o modelo base llama3.1 existe
Write-Host "Verificando modelo base llama3.1..." -ForegroundColor Gray
$tags = (Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing | ConvertFrom-Json).models.name
$hasBase = $tags | Where-Object { $_ -like "llama3.1*" }

if (-not $hasBase) {
    Write-Host "Modelo base nao encontrado. Baixando llama3.1 (~4.7 GB)..." -ForegroundColor Yellow
    ollama pull llama3.1
}

# Cria o modelo customizado
Write-Host ""
Write-Host "Criando modelo resumeforge..." -ForegroundColor Cyan
ollama create resumeforge -f Modelfile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Modelo 'resumeforge' criado com sucesso!" -ForegroundColor Green
    Write-Host "Agora rode o projeto com: npx vite" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Falha ao criar o modelo. Verifique se o Ollama esta rodando e tente novamente." -ForegroundColor Red
    exit 1
}

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path $PSScriptRoot -Parent
$secretFile = Join-Path $projectDirectory '.env.local'
if (Test-Path -LiteralPath $secretFile) {
    throw 'An .env.local file already exists. Edit it locally to update the key; this prompt will not overwrite it.'
}
Write-Host 'Create a key in dev.meta.ai > API keys using your hackathon account.'
Write-Host 'The key is saved only in this project''s ignored .env.local file. Do not share that file.'
$secureKey = Read-Host 'Paste Meta Model API key (hidden)' -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $modelKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    if ([string]::IsNullOrWhiteSpace($modelKey) -or $modelKey -match '[\s"''`#]') { throw 'Enter a non-empty key without whitespace or quotes.' }
    [IO.File]::WriteAllText($secretFile, "MODEL_API_KEY=$modelKey`nMETA_MODEL=muse-spark-1.3`n", [Text.UTF8Encoding]::new($false))
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    $modelKey = $null
    $secureKey.Dispose()
}
Write-Host 'Key saved. Restart npm run dev to activate Muse Spark.'

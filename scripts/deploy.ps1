# LifoOS Deploy Script
# Builds web locally (server is too weak for next build), pushes to git,
# pulls + rebuilds API on the server, uploads static out/ and smoke-tests.
param(
  [string]$CommitMessage = "",
  [string]$SshHost = "lifeos",
  [switch]$SkipWebBuild,
  [switch]$SkipServerBuild,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
  Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function Invoke-Check([scriptblock]$Block) {
  if ($DryRun) {
    Write-Host "  [dry-run] skipped" -ForegroundColor DarkYellow
    return
  }
  & $Block
  if ($LASTEXITCODE -ne 0) { throw "command failed (exit $LASTEXITCODE)" }
}

function Invoke-Remote([string]$BashScript) {
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($BashScript))
  & ssh $SshHost "echo $b64 | base64 -d | bash"
  if ($LASTEXITCODE -ne 0) { throw "remote command failed (exit $LASTEXITCODE)" }
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

# --- 0. Sanity checks ------------------------------------------------
Write-Step "0. Checks"
if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
  throw "Not a git repo at $RepoRoot"
}
if ($CommitMessage -and $DryRun) {
  Write-Host "  [dry-run] commit skipped" -ForegroundColor DarkYellow
}

# --- 1. Commit + push ------------------------------------------------
Write-Step "1. Commit and push"
Push-Location $RepoRoot
try {
  $dirty = git status --porcelain
  if ($dirty) {
    if (-not $CommitMessage) {
      $CommitMessage = Read-Host "Commit message"
      if (-not $CommitMessage) { throw "Commit message required" }
    }
    if (-not $DryRun) {
      git add -A
      git commit -m $CommitMessage
      if ($LASTEXITCODE -ne 0) { throw "git commit failed" }
      Write-Host "  committed: $($CommitMessage)" -ForegroundColor Green
    }
  } else {
    Write-Host "  working tree clean, nothing to commit" -ForegroundColor Green
  }

  Write-Step "1b. Push to origin/master"
  if ($DryRun) {
    Write-Host "  [dry-run] git push skipped" -ForegroundColor DarkYellow
  } else {
    git push origin master
    if ($LASTEXITCODE -ne 0) { throw "git push failed" }
    Write-Host "  pushed" -ForegroundColor Green
  }
}
finally {
  Pop-Location
}

# --- 2. Server: pull + install + build api + restart ------------------
Write-Step "2. Server update (pull, install, api build, pm2 restart)"
if ($SkipServerBuild) {
  Write-Host "  skipped (-SkipServerBuild)" -ForegroundColor DarkYellow
} else {
  Invoke-Remote @"
set -e
cd /opt/lifeos
git pull origin master
pnpm install
pnpm --filter @lifeos/types build
pnpm --filter @lifeos/db db:push
pnpm --filter @lifeos/api build
pm2 restart lifeos >/dev/null
echo "SERVER_OK"
"@
}

# --- 3. Build web locally + package static ----------------------------
Write-Step "3. Build web (local)"
$tarFile = Join-Path $env:TEMP "lifeos-web-out.tar.gz"
if (Test-Path $tarFile) { Remove-Item $tarFile -Force }

$setupScript = Join-Path $RepoRoot "scripts\setup-second-pc.ps1"
$publicCopy = Join-Path $RepoRoot "apps\web\public\setup-second-pc.ps1"
if (Test-Path $setupScript) {
  Copy-Item -Force $setupScript $publicCopy
  Write-Host "  synced setup script into web/public" -ForegroundColor Green
}

if (-not $SkipWebBuild) {
  Push-Location $RepoRoot
  try {
    Invoke-Check { pnpm --filter @lifeos/web build }
  }
  finally {
    Pop-Location
  }
} else {
  Write-Host "  skipped (-SkipWebBuild)" -ForegroundColor DarkYellow
}

Write-Step "3b. Package web static"
$webOut = Join-Path $RepoRoot "apps\web\out"
if (-not (Test-Path $webOut)) { throw "web/out not found (run web build first)" }

if ($DryRun) {
  Write-Host "  [dry-run] tar skipped" -ForegroundColor DarkYellow
} else {
  Push-Location (Join-Path $RepoRoot "apps\web")
  try {
    tar -czf $tarFile out
    if ($LASTEXITCODE -ne 0) { throw "tar failed" }
  }
  finally {
    Pop-Location
  }
  $size = (Get-Item $tarFile).Length
  Write-Host "  packaged: $([math]::Round($size/1MB, 2)) MB" -ForegroundColor Green
}

# --- 4. Upload static to server ----------------------------------------
Write-Step "4. Upload web static to server"
if ($DryRun) {
  Write-Host "  [dry-run] scp skipped" -ForegroundColor DarkYellow
} else {
  scp -q $tarFile "$($SshHost):/tmp/lifeos-web-out.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw "scp failed" }

  Invoke-Remote @"
set -e
cd /opt/lifeos/apps/web
rm -rf out
tar -xzf /tmp/lifeos-web-out.tar.gz -C /opt/lifeos/apps/web
rm -f /tmp/lifeos-web-out.tar.gz
pm2 restart lifeos >/dev/null
echo "WEB_OK"
"@
  Remove-Item $tarFile -Force
}

# --- 5. Smoke tests ----------------------------------------------------
Write-Step "5. Smoke tests"
if ($DryRun) {
  Write-Host "  [dry-run] smoke tests skipped" -ForegroundColor DarkYellow
} else {
  $accessKey = ""
  $envScript = "grep -oP '(?<=LIFEOS_ACCESS_KEY=`")[^`"]+' /opt/lifeos/apps/api/.env"
  $envB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($envScript))
  $raw = & ssh $SshHost "echo $envB64 | base64 -d | bash" 2>$null
  if ($LASTEXITCODE -eq 0 -and $raw) { $accessKey = ($raw | Select-Object -First 1).Trim() }

  & (Join-Path $PSScriptRoot "smoke-test.ps1") -BaseUrl "http://138.124.74.151:4000" -AccessKey $accessKey
  if ($LASTEXITCODE -ne 0) {
    Write-Host "`nDeploy finished but smoke tests FAILED" -ForegroundColor Red
    exit 1
  }

  Write-Step "5b. Frontend check"
  $status = curl.exe -s -o NUL -w "%{http_code}" "http://138.124.74.151:4000/"
  Write-Host "  GET / -> HTTP $status"
}

Write-Host "`n=== Deploy complete ===" -ForegroundColor Green

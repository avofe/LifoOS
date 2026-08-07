#Requires -Version 5.1
<#
  LifeOS — автоматическое подключение Windows-ПК к мониторингу экранного времени.

  Что делает:
    1. Устанавливает ActivityWatch (winget), если его нет.
    2. Запускает ActivityWatch.
    3. Регистрирует устройство на сервере (нужен Access Key один раз).
    4. Создаёт папку %LOCALAPPDATA%\LifeOS с коллектором и конфигом.
    5. Создаёт задачи в Планировщике: запуск ActivityWatch при входе +
       сбор данных каждые 5 минут (выживает перезагрузки).
    6. Запускает первый сбор сразу и показывает результат.

  Как запустить (на втором ПК, в PowerShell):
    powershell -Command "iwr http://138.124.74.151:4000/setup-second-pc.ps1 -OutFile $env:TEMP\setup.ps1; powershell -ExecutionPolicy Bypass -File $env:TEMP\setup.ps1"

  Или:
    powershell -ExecutionPolicy Bypass -File setup-second-pc.ps1 -AccessKey "ТВОЙ_ACCESS_KEY"

  Параметры:
    -AccessKey   Master-ключ из настроек LifeOS (x-api-key). Если не задан — спросит.
    -ServerUrl   Адрес сервера, по умолчанию http://138.124.74.151:4000
    -DeviceName  Имя устройства, по умолчанию имя компьютера.
    -DeviceType  desktop | mobile | tablet, по умолчанию desktop.
    -SkipInstalls  Не устанавливать ActivityWatch (если уже стоит).
#>
param(
  [string]$AccessKey = "",
  [string]$ServerUrl = "http://138.124.74.151:4000",
  [string]$DeviceName = "",
  [string]$DeviceType = "desktop",
  [switch]$SkipInstalls
)

$ErrorActionPreference = "Stop"
$ServerUrl = $ServerUrl.TrimEnd("/")

function Write-Step([string]$msg) {
  Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

$LifeDir = Join-Path $env:LOCALAPPDATA "LifeOS"
$CollectorPath = Join-Path $LifeDir "collect-aw.ps1"
$ConfigPath = Join-Path $LifeDir "config.json"
$LogPath = Join-Path $LifeDir "collector.log"

# --- 1. ActivityWatch -----------------------------------------------
function Find-AwQt {
  $paths = @(
    (Join-Path $env:LOCALAPPDATA "Programs\ActivityWatch\aw-qt.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "ActivityWatch\aw-qt.exe"),
    (Join-Path ${env:ProgramFiles} "ActivityWatch\aw-qt.exe")
  )
  foreach ($p in $paths) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  $cmd = Get-Command aw-qt.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

Write-Step "1. ActivityWatch"
$awQt = Find-AwQt
if (-not $awQt) {
  if ($SkipInstalls) {
    Write-Host "  ActivityWatch не найден, но -SkipInstalls. Завершаю." -ForegroundColor Yellow
    exit 1
  }
  Write-Host "  ActivityWatch не установлен — ставлю через winget..." -ForegroundColor Yellow
  $wg = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $wg) {
    Write-Host "  winget не найден. Установи 'App Installer' из Microsoft Store или поставь ActivityWatch вручную:" -ForegroundColor Red
    Write-Host "    https://activitywatch.net/downloads/"
    exit 1
  }
  & $wg.Source install --id ActivityWatch.ActivityWatch --silent `
    --accept-package-agreements --accept-source-agreements | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  Установка ActivityWatch не удалась (exit $LASTEXITCODE)." -ForegroundColor Red
    exit 1
  }
  $awQt = Find-AwQt
  if (-not $awQt) {
    Write-Host "  ActivityWatch установлен, но aw-qt.exe не найден. Найди его и запусти вручную." -ForegroundColor Yellow
  }
} else {
  Write-Host "  ActivityWatch уже установлен: $awQt" -ForegroundColor Green
}

$awRunning = Get-Process aw-qt -ErrorAction SilentlyContinue
if (-not $awRunning) {
  if ($awQt) {
    Write-Host "  Запускаю ActivityWatch..." -ForegroundColor Yellow
    Start-Process -FilePath $awQt
    Start-Sleep -Seconds 8
  }
} else {
  Write-Host "  ActivityWatch уже запущен" -ForegroundColor Green
}

# --- 2. Регистрация устройства ---------------------------------------
Write-Step "2. Регистрация устройства"
if (-not $AccessKey) {
  $AccessKey = Read-Host "Введи Access Key (из Настроек LifeOS, x-api-key)"
  $AccessKey = $AccessKey.Trim()
}
if (-not $AccessKey) {
  Write-Host "  Access Key обязателен." -ForegroundColor Red
  exit 1
}
if (-not $DeviceName) {
  $DeviceName = $env:COMPUTERNAME
}

try {
  $regBody = @{ name = $DeviceName; type = $DeviceType } | ConvertTo-Json
  $reg = Invoke-RestMethod -Uri "$ServerUrl/api/devices/register" -Method Post `
    -Headers @{ "x-api-key" = $AccessKey } `
    -ContentType "application/json" -Body $regBody -TimeoutSec 20
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  if ($status -eq 401) {
    Write-Host "  Ошибка: неверный Access Key (401). Проверь ключ." -ForegroundColor Red
  } else {
    Write-Host "  Не удалось зарегистрировать устройство: $($_.Exception.Message)" -ForegroundColor Red
  }
  exit 1
}
$DeviceToken = $reg.token
Write-Host "  Устройство «$($reg.name)» зарегистрировано (id=$($reg.id))" -ForegroundColor Green

# --- 3. Коллектор + конфиг --------------------------------------------
Write-Step "3. Коллектор и конфиг"
New-Item -ItemType Directory -Force -Path $LifeDir | Out-Null

$collectorScript = @'
#Requires -Version 5.1
# LifeOS ActivityWatch collector (PowerShell).
# Reads local ActivityWatch window events and pushes them to the LifeOS server.
# Config: config.json in the same folder: { "server": "...", "token": "..." }
# Env overrides: LIFEOS_AW_URL (default http://127.0.0.1:5600/api/0/)

$ErrorActionPreference = "Stop"
$dir = $PSScriptRoot
if (-not $dir) { $dir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$cfgPath = Join-Path $dir "config.json"
$statePath = Join-Path $dir "state.json"
$logPath = Join-Path $dir "collector.log"

function Write-Log([string]$msg) {
  $line = "{0} [collect-aw] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  try { Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8 } catch {}
  Write-Host $line
}

$cfg = $null
try { $cfg = Get-Content -Raw -LiteralPath $cfgPath | ConvertFrom-Json } catch {}
if (-not $cfg -or -not $cfg.server -or -not $cfg.token) {
  Write-Log "config.json missing or incomplete — nothing to do"
  exit 0
}
$server = $cfg.server.TrimEnd("/")
$token = $cfg.token
$awBase = if ($env:LIFEOS_AW_URL) { $env:LIFEOS_AW_URL.TrimEnd("/") + "/" } else { "http://127.0.0.1:5600/api/0/" }

$state = @{ lastSync = $null }
try { $st = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json; if ($st.lastSync) { $state.lastSync = $st.lastSync } } catch {}

$now = [DateTime]::UtcNow
$start = if ($state.lastSync) { [DateTime]::Parse($state.lastSync).ToUniversalTime() } else { $now.AddHours(-48) }
if (($now - $start).TotalDays -gt 2) { $start = $now.AddHours(-48) }

# --- find window bucket ---
$buckets = $null
try {
  $buckets = Invoke-RestMethod -Uri "${awBase}buckets/" -TimeoutSec 5
} catch {
  Write-Log "ActivityWatch not reachable ($($_.Exception.Message))"
  exit 0
}
$bucketId = $null
foreach ($id in @($buckets.PSObject.Properties.Name)) {
  if ($id -like "*aw-watcher-window*") { $bucketId = $id; break }
}
if (-not $bucketId) {
  Write-Log "AW window bucket not found — is ActivityWatch running?"
  exit 0
}

# --- fetch events ---
$q = "start=$([uri]::EscapeDataString($start.ToString('o')))&end=$([uri]::EscapeDataString($now.ToString('o')))&limit=20000"
$evUrl = "${awBase}buckets/$([uri]::EscapeDataString($bucketId))/events?$q"
$events = @()
try {
  $res = Invoke-RestMethod -Uri $evUrl -TimeoutSec 10
  $events = @($res)
} catch {
  Write-Log "Failed to fetch events ($($_.Exception.Message))"
  exit 0
}

$valid = @()
foreach ($e in $events) {
  $dur = 0
  if ($e.duration -ne $null) { $dur = [double]$e.duration }
  if ($dur -lt 1) { continue }
  $app = ("$($e.data.app)$($e.data.application)" ).Trim()
  $title = ("$($e.data.title)").Trim()
  if ($app) {
    $valid += @{
      timestamp = ([DateTime]::Parse($e.timestamp).ToUniversalTime().ToString("o"))
      duration  = [int][Math]::Round($dur)
      app       = $app
      title     = $title
    }
  }
}

if ($valid.Count -eq 0) {
  Set-Content -LiteralPath $statePath -Value (@{ lastSync = $now.ToString("o") } | ConvertTo-Json)
  Write-Log "nothing new"
  exit 0
}

# --- send ---
try {
  $body = @{ events = $valid } | ConvertTo-Json -Depth 6
  $resp = Invoke-RestMethod -Uri "$server/api/screentime/events" -Method Post `
    -Headers @{ "content-type" = "application/json"; "x-device-token" = $token } `
    -Body $body -TimeoutSec 15
  $received = $resp.received
  Set-Content -LiteralPath $statePath -Value (@{ lastSync = $now.ToString("o") } | ConvertTo-Json)
  Write-Log "sent $received/$($valid.Count) events"
} catch {
  Write-Log "server responded $($_.Exception.Message)"
  exit 0
}
'@

Set-Content -LiteralPath $CollectorPath -Value $collectorScript -Encoding UTF8
@{ server = $ServerUrl; token = $DeviceToken } | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
Write-Host "  коллектор: $CollectorPath" -ForegroundColor Green
Write-Host "  конфиг:    $ConfigPath" -ForegroundColor Green

# --- 4. Задачи планировщика --------------------------------------------
Write-Step "4. Задачи планировщика"
try {
  # ActivityWatch при входе (если не запущен)
  if ($awQt) {
    $awStartAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument (
      "-NoProfile -ExecutionPolicy Bypass -Command `"if (-not (Get-Process aw-qt -ErrorAction SilentlyContinue)) { Start-Process '$awQt' }`""
    )
    $logonTrigger = New-ScheduledTaskTrigger -AtLogOn
    $set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName "LifeOS-ActivityWatch" -Action $awStartAction -Trigger $logonTrigger `
      -Settings $set -Description "LifeOS: запуск ActivityWatch при входе" -Force | Out-Null
    Write-Host "  LifeOS-ActivityWatch создана" -ForegroundColor Green
  }

  # Сбор каждые 5 минут
  $collectAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument (
    "-NoProfile -ExecutionPolicy Bypass -File `"$CollectorPath`""
  )
  $collectTrigger = @(
    (New-ScheduledTaskTrigger -AtLogOn),
    (New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([TimeSpan]::MaxValue))
  )
  $set2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
  Register-ScheduledTask -TaskName "LifeOS-Collector" -Action $collectAction -Trigger $collectTrigger `
    -Settings $set2 -Description "LifeOS: сбор данных ActivityWatch и отправка на сервер" -Force | Out-Null
  Write-Host "  LifeOS-Collector создана (каждые 5 минут)" -ForegroundColor Green
} catch {
  Write-Host "  Не удалось создать задачи планировщика: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "  Запусти PowerShell от имени администратора, либо запускай коллектор вручную." -ForegroundColor Yellow
}

# --- 5. Первый сбор ----------------------------------------------------
Write-Step "5. Первый сбор"
Start-Sleep -Seconds 3
try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $CollectorPath
} catch {
  Write-Host "  Ошибка при первом сборе: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Step "Готово"
Write-Host "  Устройство:    $DeviceName ($DeviceType)" -ForegroundColor Green
Write-Host "  Сервер:        $ServerUrl" -ForegroundColor Green
Write-Host "  Access Key в конфиге НЕ хранится — только device token." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Данные появятся на дашборде в течение ~5 минут."
Write-Host "  Логи коллектора: $LogPath" -ForegroundColor DarkGray

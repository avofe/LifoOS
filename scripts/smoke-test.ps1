# LifoOS API Smoke Tests
param(
  [string]$BaseUrl = "http://localhost:4000",
  [string]$AccessKey = ""
)

$pass = 0
$fail = 0

function Test-Status {
  param($Name, $Method, $Url, $Body, $ExpectedStatus)

  try {
    $req = [System.Net.HttpWebRequest]::Create("$BaseUrl$Url")
    $req.Method = $Method
    $req.Timeout = 5000

    if ($AccessKey) {
      $req.Headers["x-api-key"] = $AccessKey
    }

    if ($Body) {
      $req.ContentType = "application/json"
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
      $req.ContentLength = $bytes.Length
      $stream = $req.GetRequestStream()
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Close()
    }

    $resp = $req.GetResponse()
    $status = [int]$resp.StatusCode
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $content = $reader.ReadToEnd()
    $resp.Close()

    if ($status -eq $ExpectedStatus) {
      Write-Host "  OK $Name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL $Name (expected $ExpectedStatus, got $status)" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    $statusCode = 0
    try { $statusCode = [int]$_.Exception.InnerException.Response.StatusCode } catch {}

    if ($statusCode -eq $ExpectedStatus) {
      Write-Host "  OK $Name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL $Name (expected $ExpectedStatus, got $statusCode)" -ForegroundColor Red
      Write-Host "    $($_.Exception.Message)" -ForegroundColor DarkRed
      $script:fail++
    }
  }
}

Write-Host "`n=== LifoOS API Smoke Tests ===" -ForegroundColor Cyan
Write-Host "Server: $BaseUrl`n" -ForegroundColor Cyan

Test-Status -Name "GET /api/health" -Method GET -Url "/api/health" -ExpectedStatus 200

Test-Status -Name "GET /api/subscriptions" -Method GET -Url "/api/subscriptions" -ExpectedStatus 200

Test-Status -Name "GET /api/subscriptions/stats" -Method GET -Url "/api/subscriptions/stats" -ExpectedStatus 200

Test-Status -Name "POST /api/subscriptions (empty body → 400)" -Method POST -Url "/api/subscriptions" -Body '{}' -ExpectedStatus 400

Test-Status -Name "POST /api/subscriptions (missing name → 400)" -Method POST -Url "/api/subscriptions" -Body '{"cost":100}' -ExpectedStatus 400

Test-Status -Name "POST /api/subscriptions (missing cost → 400)" -Method POST -Url "/api/subscriptions" -Body '{"name":"Test"}' -ExpectedStatus 400

Test-Status -Name "POST /api/youtube/channels (empty → 400)" -Method POST -Url "/api/youtube/channels" -Body '{}' -ExpectedStatus 400

Test-Status -Name "POST /api/ai/chat (empty message → 400)" -Method POST -Url "/api/ai/chat" -Body '{"message":""}' -ExpectedStatus 400

Test-Status -Name "GET /api/screentime" -Method GET -Url "/api/screentime" -ExpectedStatus 200

Test-Status -Name "GET /api/screentime/analytics" -Method GET -Url "/api/screentime/analytics" -ExpectedStatus 200

Test-Status -Name "GET /api/twitch/streams" -Method GET -Url "/api/twitch/streams" -ExpectedStatus 200

Test-Status -Name "GET /api/youtube/videos" -Method GET -Url "/api/youtube/videos" -ExpectedStatus 200

Test-Status -Name "GET /api/timeline" -Method GET -Url "/api/timeline" -ExpectedStatus 200

Test-Status -Name "GET /api/habits" -Method GET -Url "/api/habits" -ExpectedStatus 200

Test-Status -Name "POST /api/habits (empty → 400)" -Method POST -Url "/api/habits" -Body '{}' -ExpectedStatus 400

Test-Status -Name "GET /api/tasks (missing date → 400)" -Method GET -Url "/api/tasks" -ExpectedStatus 400

Test-Status -Name "GET /api/tasks?date=2024-01-01" -Method GET -Url "/api/tasks?date=2024-01-01" -ExpectedStatus 200

Test-Status -Name "POST /api/tasks (empty → 400)" -Method POST -Url "/api/tasks" -Body '{}' -ExpectedStatus 400

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "Passed: $pass" -ForegroundColor Green
Write-Host "Failed: $fail" -ForegroundColor Red

if ($fail -gt 0) { exit 1 }

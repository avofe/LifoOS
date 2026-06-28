$projectRoot = "C:\Projects\LifoOS"
$tsxCli = "C:\Projects\LifoOS\node_modules\.pnpm\tsx@4.22.4\node_modules\tsx\dist\cli.mjs"
$nextCli = "C:\Projects\LifoOS\node_modules\.pnpm\next@14.2.35_react-dom@18.3.1_react@18.3.1__react@18.3.1\node_modules\next\dist\bin\next"

$apiLog = "$env:TEMP\lifeos-api.log"
$webLog = "$env:TEMP\lifeos-web.log"

$ErrorActionPreference = "SilentlyContinue"
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
$ErrorActionPreference = "Continue"

Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList @("$tsxCli", "watch", "src/index.ts") -WorkingDirectory "$projectRoot\apps\api" -RedirectStandardOutput $apiLog -RedirectStandardError "${apiLog}.err"

Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList @("$nextCli", "dev") -WorkingDirectory "$projectRoot\apps\web" -RedirectStandardOutput $webLog -RedirectStandardError "${webLog}.err"

param(
  [switch]$Clean
)

$ErrorActionPreference = "Stop"

function Join-Paths([string]$Root, [string[]]$Parts) {
  $result = $Root
  foreach ($part in $Parts) {
    $result = [System.IO.Path]::Combine($result, $part)
  }
  return $result
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$OutDir = Join-Paths $RepoRoot @("apps", "desktop", "resources", "api")

Write-Host "[bundle-api] Bundling API to: $OutDir"

# Step 1: Build all packages
Write-Host "[bundle-api] Building packages..."
Push-Location $RepoRoot

try {
  pnpm run --filter @lifeos/types build
  if (-not $?) { throw "types build failed" }

  pnpm run --filter @lifeos/db build
  if (-not $?) { throw "db build failed" }

  pnpm run --filter @lifeos/api build
  if (-not $?) { throw "api build failed" }
}
finally {
  Pop-Location
}

# Step 2: Clean and create bundle directory
if ($Clean -and (Test-Path $OutDir)) {
  Remove-Item -Recurse -Force $OutDir
}

$dirs = @(
  $OutDir,
  (Join-Paths $OutDir @("node_modules", "@prisma", "client", "runtime")),
  (Join-Paths $OutDir @(".prisma", "client"))
)

foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force -Path $d | Out-Null
}

# Step 3: Bundle API with esbuild (externalize Prisma)
Write-Host "[bundle-api] Running esbuild..."
$esbuild = Join-Paths $RepoRoot @("node_modules", ".pnpm", "node_modules", ".bin", "esbuild")
$apiEntry = Join-Paths $RepoRoot @("apps", "api", "src", "index.ts")
$bundleOut = Join-Path $OutDir "bundle.js"

$result = & $esbuild $apiEntry --bundle --platform=node --target=node22 --outfile=$bundleOut --external:@prisma/client 2>&1
if ($LASTEXITCODE -ne 0) { throw "esbuild failed: $result" }

# Step 4: Copy Prisma client runtime files
Write-Host "[bundle-api] Copying Prisma client files..."
$prismaPkg = Get-ChildItem (Join-Paths $RepoRoot @("node_modules", ".pnpm")) -Filter "@prisma+client@*" -Directory |
  Select-Object -First 1

if (-not $prismaPkg) { throw "Prisma client package not found in .pnpm store" }

$prismaDir = Join-Paths $prismaPkg.FullName @("node_modules", "@prisma", "client")
$prismaGenDir = Join-Paths $prismaPkg.FullName @("node_modules", ".prisma", "client")

# Copy @prisma/client module files (for `require('@prisma/client')`)
Copy-Item (Join-Paths $prismaDir @("runtime", "library.js")) `
  (Join-Paths $OutDir @("node_modules", "@prisma", "client", "runtime", "library.js")) -Force
Copy-Item (Join-Paths $prismaDir @("default.js")) `
  (Join-Paths $OutDir @("node_modules", "@prisma", "client", "default.js")) -Force
Copy-Item (Join-Paths $prismaDir @("package.json")) `
  (Join-Paths $OutDir @("node_modules", "@prisma", "client", "package.json")) -Force
Copy-Item (Join-Paths $prismaDir @("index.js")) `
  (Join-Paths $OutDir @("node_modules", "@prisma", "client", "index.js")) -Force

# Copy generated client files
foreach ($file in @("index.js", "default.js", "schema.prisma", "package.json")) {
  Copy-Item (Join-Paths $prismaGenDir @($file)) (Join-Paths $OutDir @(".prisma", "client", $file)) -Force
}

# Copy native engine DLL
Copy-Item (Join-Paths $prismaGenDir @("query_engine-windows.dll.node")) `
  (Join-Paths $OutDir @(".prisma", "client", "query_engine-windows.dll.node")) -Force

# Step 5: Copy configuration files
Write-Host "[bundle-api] Copying config files..."
$apiEnvFile = Join-Paths $RepoRoot @("apps", "api", ".env")
$dbEnvFile = Join-Paths $RepoRoot @("packages", "db", ".env")
$outEnvFile = Join-Path $OutDir ".env"

$apiContent = @(Get-Content $apiEnvFile -ErrorAction SilentlyContinue)
$dbContent = @(Get-Content $dbEnvFile -ErrorAction SilentlyContinue)
$combined = ($apiContent + $dbContent | Where-Object { $_ -and $_.Trim() }) -join "`r`n"
$combined | Set-Content $outEnvFile -Encoding UTF8
Write-Host "[bundle-api] .env merged"

# Step 6: Copy web static export
Write-Host "[bundle-api] Copying web static export..."
$webOutDir = Join-Paths $RepoRoot @("apps", "web", "out")
$webDest = Join-Path $OutDir "web"
if (Test-Path $webOutDir) {
  if (Test-Path $webDest) { Remove-Item -Recurse -Force $webDest }
  Copy-Item -Recurse $webOutDir $webDest
  $webSize = (Get-ChildItem -Recurse $webDest -File | Measure-Object -Property Length -Sum).Sum
  Write-Host "[bundle-api] Web static: $([math]::Round($webSize/1MB, 2)) MB"
} else {
  Write-Host "[bundle-api] WARNING: web/out not found at $webOutDir"
}

# Step 7: Create wrapper index.js
@"
process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();
require('./bundle.js');
"@ | Set-Content (Join-Path $OutDir "index.js") -Encoding UTF8

# Step 6: Summary
Write-Host "[bundle-api] Done!"
$totalSize = (Get-ChildItem -Recurse $OutDir -File | Measure-Object -Property Length -Sum).Sum
Write-Host "[bundle-api] Total bundle size: $([math]::Round($totalSize/1MB, 1)) MB"

Get-ChildItem -Recurse $OutDir -File | ForEach-Object {
  $sizeStr = if ($_.Length -gt 1MB) { "$([math]::Round($_.Length/1MB, 1)) MB" }
             elseif ($_.Length -gt 1KB) { "$([math]::Round($_.Length/1KB, 0)) KB" }
             else { "$($_.Length) B" }
  Write-Host "  $($_.Name): $sizeStr"
}

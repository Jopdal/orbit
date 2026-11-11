$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$outputRoot = Join-Path $projectRoot 'release/Orbit'
$sdkRoot = Join-Path $PSScriptRoot 'vendor/webview2'
New-Item -ItemType Directory -Path "$outputRoot/ui" -Force | Out-Null
Copy-Item -LiteralPath "$projectRoot/dist/index.html","$projectRoot/dist/style.css","$projectRoot/dist/categories.css","$projectRoot/dist/refinements.css","$projectRoot/dist/flow.css","$projectRoot/dist/flow.js","$projectRoot/dist/app.js" -Destination "$outputRoot/ui" -Force
Copy-Item -LiteralPath "$sdkRoot/lib/net462/Microsoft.Web.WebView2.Core.dll","$sdkRoot/lib/net462/Microsoft.Web.WebView2.WinForms.dll","$sdkRoot/runtimes/win-x64/native/WebView2Loader.dll" -Destination $outputRoot -Force
Copy-Item -LiteralPath "$projectRoot/dist/mail-core.js","$projectRoot/dist/mail.js","$projectRoot/dist/mail.css" -Destination "$outputRoot/ui" -Force
Copy-Item -LiteralPath "$projectRoot/mail-config.json" -Destination $outputRoot -Force
Copy-Item -LiteralPath "$projectRoot/README.KO.md" -Destination "$outputRoot/사용안내.md" -Force
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 64,64
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(121,100,233))
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White),4
$graphics.TranslateTransform(32,32)
$graphics.RotateTransform(-35)
$graphics.DrawEllipse($pen,-24,-12,48,24)
$graphics.FillEllipse([System.Drawing.Brushes]::White,-5,-5,10,10)
$appIcon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create("$outputRoot/Orbit.ico")
$appIcon.Save($stream)
$stream.Dispose()
$graphics.Dispose()
$pen.Dispose()
$compiler = "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319/csc.exe"
Push-Location $projectRoot
& $compiler /nologo /target:winexe /platform:x64 /optimize+ '/out:release\Orbit\Orbit.exe' '/win32icon:release\Orbit\Orbit.ico' '/win32manifest:desktop\app.manifest' /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.Web.Extensions.dll '/reference:release\Orbit\Microsoft.Web.WebView2.Core.dll' '/reference:release\Orbit\Microsoft.Web.WebView2.WinForms.dll' 'desktop\Orbit.cs'
Pop-Location
if ($LASTEXITCODE -ne 0) { throw 'C# build failed' }
Compress-Archive -LiteralPath $outputRoot -DestinationPath "$projectRoot/release/Orbit-Windows-x64.zip" -Force
Write-Output "Built: $outputRoot/Orbit.exe"


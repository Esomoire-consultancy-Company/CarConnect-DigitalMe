param(
  [string]$SdkRoot = "$env:LOCALAPPDATA\Android\Sdk",
  [string]$AndroidStudioRoot = "$env:LOCALAPPDATA\Programs\AndroidStudio-Quail4-RC2"
)

$ErrorActionPreference = 'Stop'

$CommandLineToolsUrl = 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip'
$CommandLineToolsSha256 = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
$RequiredPackages = @(
  'platform-tools',
  'platforms;android-36',
  'build-tools;36.0.0',
  'ndk;27.1.12297006'
)

$JavaExe = Join-Path $AndroidStudioRoot 'jbr\bin\java.exe'
if (-not (Test-Path $JavaExe)) {
  throw "Android Studio JBR was not found at $JavaExe"
}

$NodeExe = Join-Path $env:USERPROFILE 'node.exe'
if (-not (Test-Path $NodeExe)) {
  throw "Node was not found at $NodeExe"
}

Write-Host "WardenFM Android SDK bootstrap"
Write-Host "SDK root: $SdkRoot"
Write-Host "Java: $JavaExe"
Write-Host "Node: $NodeExe"
Write-Host ''
Write-Host 'This bootstrap does not accept Android SDK licenses on your behalf.'
Write-Host 'sdkmanager will prompt you interactively when licenses are required.'

$TempRoot = Join-Path $env:TEMP 'wardenfm-android-sdk-bootstrap'
$ZipPath = Join-Path $TempRoot 'commandlinetools-win.zip'
$ExtractRoot = Join-Path $TempRoot 'extract'
$CmdlineRoot = Join-Path $SdkRoot 'cmdline-tools\latest'

New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

if (-not (Test-Path (Join-Path $CmdlineRoot 'bin\sdkmanager.bat'))) {
  Write-Host 'Downloading official Android command-line tools...'
  Invoke-WebRequest -Uri $CommandLineToolsUrl -OutFile $ZipPath

  $ActualHash = (Get-FileHash -Algorithm SHA256 $ZipPath).Hash.ToLowerInvariant()
  if ($ActualHash -ne $CommandLineToolsSha256) {
    throw "Command-line tools checksum mismatch. Expected $CommandLineToolsSha256, got $ActualHash"
  }

  Remove-Item -Recurse -Force $ExtractRoot -ErrorAction SilentlyContinue
  Expand-Archive -Path $ZipPath -DestinationPath $ExtractRoot -Force
  New-Item -ItemType Directory -Force -Path (Split-Path $CmdlineRoot) | Out-Null
  Remove-Item -Recurse -Force $CmdlineRoot -ErrorAction SilentlyContinue
  Move-Item -Path (Join-Path $ExtractRoot 'cmdline-tools') -Destination $CmdlineRoot
}

$SdkManager = Join-Path $CmdlineRoot 'bin\sdkmanager.bat'
if (-not (Test-Path $SdkManager)) {
  throw "sdkmanager was not created at $SdkManager"
}

$env:JAVA_HOME = Join-Path $AndroidStudioRoot 'jbr'
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot

Write-Host ''
Write-Host 'Installing the project-required Android SDK packages.'
Write-Host 'If Google presents SDK license terms, review and accept them interactively to continue.'
Write-Host ("Packages: " + ($RequiredPackages -join ', '))

& $SdkManager --sdk_root=$SdkRoot @RequiredPackages
if ($LASTEXITCODE -ne 0) {
  throw "sdkmanager exited with code $LASTEXITCODE"
}

Write-Host ''
Write-Host 'Installed package verification:'
& $SdkManager --sdk_root=$SdkRoot --list_installed
if ($LASTEXITCODE -ne 0) {
  throw "sdkmanager verification exited with code $LASTEXITCODE"
}

$AdbExe = Join-Path $SdkRoot 'platform-tools\adb.exe'
if (-not (Test-Path $AdbExe)) {
  throw 'platform-tools installation completed without adb.exe'
}

Write-Host ''
Write-Host "ANDROID_SDK_ROOT=$SdkRoot"
Write-Host "ADB=$AdbExe"
Write-Host 'WardenFM Android SDK bootstrap complete.'

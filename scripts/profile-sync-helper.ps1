param (
    [string]$AppName,
    [string]$StoragePath,
    [string]$ProfilesFile,
    [string]$AppExePath
)

$LogFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "cecs_script.log")
Start-Transcript -Path $LogFile -Append -Force | Out-Null

Write-Host "--- Script started at $(Get-Date) ---"
Write-Host "APP_NAME: $AppName"
Write-Host "STORAGE_PATH: $StoragePath"
Write-Host "PROFILES_FILE: $ProfilesFile"
Write-Host "APP_EXE_PATH: $AppExePath"

Write-Host "[CECS Helper] Waiting for application to close..."

$MaxRetries = 60
$Count = 0

function Test-Process {
    if (-not [string]::IsNullOrWhiteSpace($AppExePath)) {
        $exeName = [System.IO.Path]::GetFileNameWithoutExtension($AppExePath)
        $procs = Get-Process -Name $exeName -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $AppExePath }
        return ($null -ne $procs -and ($procs.Count -gt 0 -or $procs.Id -gt 0))
    }
    else {
        $procs = Get-Process -Name $AppName -ErrorAction SilentlyContinue
        return ($null -ne $procs -and ($procs.Count -gt 0 -or $procs.Id -gt 0))
    }
}

if (-not [string]::IsNullOrWhiteSpace($AppExePath)) {
    Write-Host "[CECS Helper] Monitoring pattern: $AppExePath"
}
else {
    Write-Host "[CECS Helper] Monitoring pattern: $AppName"
}

# Initial check: allow up to 5 seconds to detect the process initially
for ($i = 1; $i -le 5; $i++) {
    if (Test-Process) {
        Write-Host "[CECS Helper] Process detected. Watching for exit..."
        break
    }
    Write-Host "[CECS Helper] Process not found yet, retrying ($i/5)..."
    Start-Sleep -Seconds 1
}

# Now wait for it to disappear
while (Test-Process) {
    Start-Sleep -Seconds 1
    $Count++
    if ($Count -ge $MaxRetries) {
        Write-Host "[CECS Helper] Timeout waiting for app to close."
        Stop-Transcript | Out-Null
        exit 1
    }
}

Write-Host "[CECS Helper] Application closed. Updating storage.json..."

# Update storage.json using PowerShell native JSON handling
try {
    if (Test-Path $StoragePath) {
        $storageContent = Get-Content -Raw -Path $StoragePath -Encoding UTF8
        $storageData = ConvertFrom-Json $storageContent

        if (Test-Path $ProfilesFile) {
            $profilesContent = Get-Content -Raw -Path $ProfilesFile -Encoding UTF8
            $newProfiles = ConvertFrom-Json $profilesContent

            $storageData.userDataProfiles = $newProfiles

            # Convert to JSON with depth and indentation
            $jsonOutput = ConvertTo-Json $storageData -Depth 100

            # Avoid using BOM if possible, UTF8 without BOM in PS 6+, or normal UTF8 in PS 5
            Set-Content -Path $StoragePath -Value $jsonOutput -Encoding UTF8

            Write-Host "[CECS Helper] Updated storage.json"
        }
        else {
            Write-Host "[CECS Helper] Profiles file not found: $ProfilesFile"
        }
    }
    else {
        Write-Host "[CECS Helper] Storage file not found: $StoragePath"
    }
}
catch {
    Write-Host "[CECS Helper] Error: $_"
}

# Clean up temp profiles file
if (Test-Path $ProfilesFile) {
    Remove-Item -Path $ProfilesFile -Force
}

# Relaunch function
function Start-App {
    Write-Host "Starting relaunch sequence..."

    if (-not [string]::IsNullOrWhiteSpace($AppExePath) -and (Test-Path $AppExePath)) {
        Write-Host "Executing: $AppExePath"
        try {
            Start-Process -FilePath $AppExePath
            return
        }
        catch {
            Write-Host "Launch via Start-Process failed: $_"
        }
    }

    Write-Host "Executing by Name: $AppName"
    try {
        Start-Process -FilePath $AppName
    }
    catch {
        Write-Host "Launch via Start-Process failed: $_"
    }
}

Start-App

# Verify relaunch
Write-Host "[CECS Helper] Verifying relaunch..."
$Detected = $false
for ($i = 1; $i -le 10; $i++) {
    if (Test-Process) {
        Write-Host "[CECS Helper] Application relaunched successfully!"
        $Detected = $true
        break
    }
    Start-Sleep -Seconds 1
}

if (-not $Detected) {
    Write-Host "[CECS Helper] Relaunch failed or too slow."
}

Write-Host "[CECS Helper] Done!"

Stop-Transcript | Out-Null

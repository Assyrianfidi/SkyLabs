# Check if running as admin, if not restart with admin rights
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Restarting with admin privileges..." -ForegroundColor Yellow
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`""
    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $arguments
    exit
}

# Ensure we're running in the script's directory
$scriptPath = $PSScriptRoot
if ($scriptPath) { Set-Location $scriptPath }

# Set error action preference
$ErrorActionPreference = "Stop"

# Function to write colored output
function Write-Step {
    param([string]$message)
    Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

try {
    # 1. Check and kill process on port 3000
    Write-Step "Checking port 3000..."
    $process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($process) {
        $processId = $process.OwningProcess
        $processName = (Get-Process -Id $processId -ErrorAction SilentlyContinue).ProcessName
        Write-Host "Port 3000 is in use by $processName (PID: $processId)" -ForegroundColor Yellow
        
        try {
            # Try graceful shutdown first
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "Successfully terminated process $processName (PID: $processId)" -ForegroundColor Green
        } catch {
            Write-Host "Failed to terminate process: $_" -ForegroundColor Red
            Write-Host "Trying alternative method..." -ForegroundColor Yellow
            
            # Try taskkill as fallback
            try {
                taskkill /F /PID $processId
                Write-Host "Successfully terminated process using taskkill" -ForegroundColor Green
            } catch {
                Write-Host "Failed to terminate process. Please close any applications using port 3000 and try again." -ForegroundColor Red
                exit 1
            }
        }
    } else {
        Write-Host "Port 3000 is available" -ForegroundColor Green
    }

    # 2. Install npm dependencies if needed
    Write-Step "Checking npm dependencies..."
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing npm dependencies..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install npm dependencies" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Dependencies already installed" -ForegroundColor Green
    }

    # 3. Install Playwright browsers
    Write-Step "Checking Playwright browsers..."
    $browsersPath = "$env:USERPROFILE\AppData\Local\ms-playwright"
    if (-not (Test-Path $browsersPath)) {
        Write-Host "Installing Playwright browsers..."
        npx playwright install --with-deps
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install Playwright browsers" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Playwright browsers already installed" -ForegroundColor Green
    }

    # 4. Start development server in background
    Write-Step "Starting development server..."
    $serverProcess = Start-Process -NoNewWindow -PassThru -FilePath "npm" -ArgumentList "run dev"
    
    # 6. Open browser after a short delay
    Start-Sleep -Seconds 5
    Write-Step "Opening browser..."
    Start-Process "http://localhost:3000"
    
    Write-Host "`n✅ Setup complete! Development server is running. Press Ctrl+C to stop." -ForegroundColor Green
    Write-Host "   Server URL: http://localhost:3000" -ForegroundColor Cyan
    
    # Keep script running until Ctrl+C
    $serverProcess.WaitForExit()
    
} catch {
    Write-Host "`n❌ An error occurred: $_" -ForegroundColor Red
    exit 1
}

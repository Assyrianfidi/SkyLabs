@echo off
echo ===========================================
echo  Starting SkyLabs Development Environment
echo ===========================================

echo.
echo [1/5] Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Port 3000 is in use by process ID: %%a
    tasklist /FI "PID eq %%a" 2>nul
    echo Killing process...
    taskkill /F /PID %%a
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to kill process.
        pause
        exit /b 1
    )
)

echo.
echo [2/5] Checking npm dependencies...
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install npm dependencies.
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

echo.
echo [3/5] Checking Playwright browsers...
if not exist "%USERPROFILE%\AppData\Local\ms-playwright" (
    echo Installing Playwright browsers...
    call npx playwright install --with-deps
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install Playwright browsers.
        pause
        exit /b 1
    )
) else (
    echo Playwright browsers already installed.
)

echo.
echo [4/5] Starting development server...
start "" "cmd" /c "npm run dev"

echo.
echo [5/5] Opening browser in 5 seconds...
timeout /t 5 >nul
start "" "http://localhost:3000"

echo.
echo ===========================================
echo   Development server is now running!
echo   Keep this window open while developing.
echo   Press any key to stop the server...
echo ===========================================
pause >nul

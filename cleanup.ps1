# Stop any running Node.js processes
try {
    Get-Process -Name "node" -ErrorAction Stop | Stop-Process -Force -ErrorAction Stop
    Write-Host "Stopped running Node.js processes."
} catch {
    Write-Host "No Node.js processes were running or could not be stopped."
}

# Remove node_modules and package-lock.json
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue ".\client\node_modules"
Remove-Item -Force -ErrorAction SilentlyContinue ".\client\package-lock.json"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue ".\client\.vite"

Write-Host "Cleanup complete. Navigate to the client directory and run 'npm install' to reinstall dependencies."

# Database configuration
$pgBin = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$pgUser = "postgres"
$pgPassword = "your_postgres_password_here"  # Replace with your PostgreSQL password
$sqlFile = ".\setup-db.sql"

# Set PostgreSQL password as environment variable
$env:PGPASSWORD = $pgPassword

# Check if psql exists
if (-not (Test-Path $pgBin)) {
    Write-Error "❌ PostgreSQL client not found at: $pgBin"
    exit 1
}

# Check if SQL file exists
if (-not (Test-Path $sqlFile)) {
    Write-Error "⚠️ $sqlFile not found."
    exit 1
}

try {
    # Run the SQL script
    Write-Host "🚀 Running database setup script..."
    & "$pgBin" -U $pgUser -d postgres -f $sqlFile
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to execute SQL script"
    }
    
    # Verify the database was created
    Write-Host "`n✅ Database setup completed successfully!"
    
    # List all databases to verify
    Write-Host "`n📋 Listing databases:"
    & "$pgBin" -U $pgUser -d postgres -c "\l"
    
    # Show tables in the new database
    Write-Host "`n📋 Tables in skylabs_dev:"
    & "$pgBin" -U $pgUser -d skylabs_dev -c "\dt"
    
} catch {
    Write-Error "❌ Error during database setup: $_"
    if ($_.Exception.Message -match "password authentication failed") {
        Write-Error "❌ Invalid username or password."
    }
    exit 1
} finally {
    # Clear the password from environment variables
    Remove-Item Env:\PGPASSWORD
}

Write-Host "`n✨ Database setup completed!"

@echo off
REM Fx Project - Development Environment Starter (Windows)
REM This script starts both API and Frontend servers with auto-reload

echo.
echo 🚀 Fx Development Environment
echo ================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call bun install
    echo ✓ Dependencies installed
    echo.
)

REM Load environment file if exists
if exist ".env" (
    echo ✓ .env file found
) else (
    echo ⚠️  .env file not found - using defaults
)

echo.
echo Starting services...
echo ================================
echo.

echo 📡 Starting API Server (port 3001)...
start "FX API Server" cmd /k "bun run api"
timeout /t 2 /nobreak

echo ✓ API Server started
echo.

echo 🎨 Starting UI Server (port 3000)...
start "FX UI Server" cmd /k "bun run dev"
timeout /t 3 /nobreak

echo.
echo ================================
echo ✅ Development Environment Ready!
echo ================================
echo.
echo 🌐 Open your browser:
echo    → http://localhost:3000
echo.
echo 📡 API Server:
echo    → http://localhost:3001
echo.
echo 📝 Test Credentials:
echo    Email: patron@enterprise.com
echo    Password: 123456
echo.
echo Close these windows to stop servers
echo.

pause

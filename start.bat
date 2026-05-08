@echo off
REM ============================================================
REM  ShodanIntel — Start Script (Windows)
REM ============================================================

set PORT=8080
set DIR=%~dp0

echo.
echo   ██████╗██╗  ██╗ ██████╗ ██████╗  █████╗ ███╗  ██╗
echo   ██╔═══╝██║  ██║██╔═══██╗██╔══██╗██╔══██╗████╗ ██║
echo   ███████╗███████║██║   ██║██║  ██║███████║██╔██╗██║
echo   SHODANINTEL // THREAT INTELLIGENCE DASHBOARD
echo.
echo   Edit config.js to add your API keys before use
echo   Opening on http://localhost:%PORT%
echo.

cd /d "%DIR%"

REM Try Python first
python --version >nul 2>&1
if %errorlevel% == 0 (
  echo   [OK] Starting with Python...
  start /b python -m http.server %PORT%
  goto :open
)

python3 --version >nul 2>&1
if %errorlevel% == 0 (
  echo   [OK] Starting with Python 3...
  start /b python3 -m http.server %PORT%
  goto :open
)

REM Try Node
npx --version >nul 2>&1
if %errorlevel% == 0 (
  echo   [OK] Starting with Node...
  start /b npx serve -p %PORT% .
  goto :open
)

echo   [ERROR] No server found. Install Python 3 from python.org or Node from nodejs.org
pause
exit /b 1

:open
timeout /t 1 /nobreak >nul
start http://localhost:%PORT%
echo   Server running. Close this window to stop.
echo.
pause

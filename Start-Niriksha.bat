@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or later is required. Install it, then reopen this file.
  pause
  exit /b 1
)
echo Starting the Niriksha demo backend at http://localhost:8080
echo Keep this window open while using the app.
node server.mjs
pause

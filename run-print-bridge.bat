@echo off
cd /d "%~dp0print-bridge"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required for Print Bridge.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules npm install
npm start

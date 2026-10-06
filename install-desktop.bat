@echo off
setlocal
cd /d "%~dp0"
set "TARGET=%USERPROFILE%\Desktop\Top-Kabda"
if exist "%TARGET%" rmdir /s /q "%TARGET%"
mkdir "%TARGET%"
xcopy /E /I /Y "app" "%TARGET%\app" >nul
xcopy /E /I /Y "print-bridge" "%TARGET%\print-bridge" >nul
copy /Y "firestore.rules" "%TARGET%\firestore.rules" >nul
copy /Y "README.md" "%TARGET%\README.md" >nul
copy /Y "run-print-bridge.bat" "%TARGET%\run-print-bridge.bat" >nul
copy /Y "Top-Kabda.url" "%TARGET%\Top-Kabda.url" >nul
start "" "%TARGET%"
echo.
echo Top Kabda installed to: %TARGET%
pause

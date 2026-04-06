@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -STA -File "%SCRIPT_DIR%NetLinkPublisher.ps1"
endlocal

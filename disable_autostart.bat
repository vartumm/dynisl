@echo off
title Dynamic Island Autostart Setup
cd /d "%~dp0"

echo [DynIsl] Removing Windows Autostart for Dynamic Island...
node -e "const { setAutoStart } = require('./electron/autostart'); setAutoStart(false);"

echo.
echo [DynIsl] Autostart successfully DISABLED.
echo.
pause

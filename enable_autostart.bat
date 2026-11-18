@echo off
title Dynamic Island Autostart Setup
cd /d "%~dp0"

echo [DynIsl] Configuring Windows Autostart for Dynamic Island...
node -e "const { setAutoStart } = require('./electron/autostart'); setAutoStart(true);"

echo.
echo [DynIsl] Autostart successfully ENABLED!
echo Dynamic Island will now start automatically when you log in to Windows.
echo.
pause

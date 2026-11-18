@echo off
title Push Dynamic Island to GitHub
cd /d "%~dp0"

echo ========================================================
echo   Dynamic Island - Push to GitHub
echo ========================================================
echo.

set "PATH=C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;%PATH%"

echo 1. Checking git status...
git status
echo.

echo 2. Pushing commits to https://github.com/vartumm/dynisl.git ...
echo [INFO] If a browser window opens, please click "Authorize" or login.
echo.
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   SUCCESS! All code has been pushed to GitHub!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   Push failed or pending authentication.
    echo.
    echo   Make sure repository "dynisl" is created on your GitHub:
    echo   https://github.com/new (Name: dynisl, Public)
    echo ========================================================
)
echo.
pause

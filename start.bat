@echo off
title Dynamic Island Windows
cd /d "%~dp0"

echo [DynIsl] Stopping existing instances...
taskkill /F /IM DynislCore.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1

if exist "D:\dotnet\dotnet.exe" (
    set "PATH=D:\dotnet;%PATH%"
)

echo [DynIsl] Checking backend build...
if not exist "core\bin\Release\net8.0-windows10.0.19041.0\DynislCore.exe" (
    echo Building DynislCore .NET service...
    cd core
    dotnet build -c Release
    cd ..
)

echo [DynIsl] Checking frontend build...
if not exist "dist\index.html" (
    echo Building React frontend...
    call npm run build
)

echo [DynIsl] Starting Dynamic Island...
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    call npm start
)

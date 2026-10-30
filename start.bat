@echo off
setlocal enabledelayedexpansion
echo ====================================================
echo Starting Sridattam E-Commerce Stack via Docker Compose
echo ====================================================

docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Docker daemon is not running.
    echo Launching Docker Desktop...
    start "" "C:\Users\madhu\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"
    echo Waiting for Docker engine to initialize (this may take a minute)...
    :wait_docker
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Still waiting for Docker engine...
        goto wait_docker
    )
    echo Docker engine is ready!
)

cd /d "%~dp0"
echo Building and starting containers...
docker compose up -d --build

echo Waiting for database to become ready...
timeout /t 10 /nobreak >nul

echo Syncing database schema...
docker exec sridattam_backend npx prisma db push --schema=./src/prisma/schema.prisma

echo Seeding database with demo catalog and staff accounts...
docker exec sridattam_backend npx prisma db seed

echo.
echo ====================================================
echo             SRIDATTAM STACK IS ONLINE!
echo ====================================================
echo Storefront:   http://localhost:3000
echo Admin Portal: http://localhost:3001
echo Backend API:  http://localhost:5000
echo.
echo Default Admin: admin@sridattam.com / password123
echo ====================================================
pause

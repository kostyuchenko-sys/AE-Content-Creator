@echo off
setlocal enabledelayedexpansion

set "REPO_URL=https://github.com/kostyuchenko-sys/AE-Content-Creator.git"
set "TARGET_DIR=%USERPROFILE%\AE-Content-Creator"

where git >nul 2>nul
if errorlevel 1 (
  echo [setup] Git not found. Install Git for Windows first:
  echo https://git-scm.com/download/win
  exit /b 1
)

if exist "%TARGET_DIR%\.git" (
  echo [setup] Repo already exists: %TARGET_DIR%
) else (
  echo [setup] Cloning repo to: %TARGET_DIR%
  git clone "%REPO_URL%" "%TARGET_DIR%"
  if errorlevel 1 exit /b 1
)

cd /d "%TARGET_DIR%"
call "%TARGET_DIR%\scripts\install.bat"

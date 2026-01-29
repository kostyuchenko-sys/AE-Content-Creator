@echo off
setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0.."
set "HOOKS_DIR=%REPO_ROOT%\.git\hooks"

if not exist "%HOOKS_DIR%" (
  echo [install] .git\hooks not found. Run from a git clone.
  exit /b 1
)

echo [install] Installing git hooks
copy /Y "%REPO_ROOT%\scripts\hooks\post-merge" "%HOOKS_DIR%\post-merge" >nul
copy /Y "%REPO_ROOT%\scripts\hooks\post-checkout" "%HOOKS_DIR%\post-checkout" >nul

echo [install] Running initial deploy
call "%REPO_ROOT%\scripts\deploy.bat"

echo [install] Done.

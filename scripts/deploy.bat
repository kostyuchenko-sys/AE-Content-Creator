@echo off
setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0.."
set "SRC_DIR=%REPO_ROOT%\extension\cep\AEContentConstructor"
set "DEST_DIR=%APPDATA%\Adobe\CEP\extensions\AEContentConstructor"

if not exist "%SRC_DIR%" (
  echo [deploy] CEP source dir not found: %SRC_DIR%
  exit /b 1
)

if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"

echo [deploy] Sync CEP panel to: %DEST_DIR%
robocopy "%SRC_DIR%" "%DEST_DIR%" /MIR >nul

if exist "%REPO_ROOT%\templates" (
  if not exist "%DEST_DIR%\templates" mkdir "%DEST_DIR%\templates"
  echo [deploy] Sync templates to: %DEST_DIR%\templates
  robocopy "%REPO_ROOT%\templates" "%DEST_DIR%\templates" /MIR >nul
)

if exist "%REPO_ROOT%\projects" (
  if not exist "%DEST_DIR%\projects" mkdir "%DEST_DIR%\projects"
  echo [deploy] Sync projects to: %DEST_DIR%\projects
  robocopy "%REPO_ROOT%\projects" "%DEST_DIR%\projects" /MIR >nul
)

echo [deploy] Done.

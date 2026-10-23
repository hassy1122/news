@echo off
rem ────────────────────────────────────────────────────────────────────────
rem  Personal Intel — one-click launcher
rem  • Starts the scheduler (background feed refresh + 8:00 briefing)
rem  • Starts the app server on http://localhost:3000
rem  • Opens the app in your default browser when the server is ready
rem  The minimized console windows it opens ARE the server/scheduler —
rem  closing them stops the app. Close this main window anytime.
rem ────────────────────────────────────────────────────────────────────────
setlocal
cd /d "%~dp0"
title Personal Intel

rem 1) background scheduler — keeps feeds fresh even while the browser is closed
start "Personal Intel - scheduler" /min cmd /c "npm run worker"

rem 2) app server (builds on the very first run)
if exist ".next\BUILD_ID" (
  start "Personal Intel - server" /min cmd /c "npm run start"
) else (
  echo First run: building app files, this takes about a minute...
  start "Personal Intel - build and server" /min cmd /c "npm run build && npm run start"
)

rem 3) wait until the server answers, then open the browser (max ~60 s)
set /a tries=0
:waitloop
powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Close();$c.Connect('127.0.0.1',3000);exit 0}catch{exit 1}" >nul 2>&1
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% GEQ 30 goto ready
timeout /t 2 /nobreak >nul
goto waitloop

:ready
start "" "http://localhost:3000"
exit 0

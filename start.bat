@echo off
cd /d C:\claudecode\port_app

netstat -an | findstr ":3030" | findstr "LISTENING" > nul
if %errorlevel% == 0 (
  start http://localhost:3030
) else (
  start /min "" cmd /c npm run dev
  timeout /t 3 /nobreak > nul
  start http://localhost:3030
)

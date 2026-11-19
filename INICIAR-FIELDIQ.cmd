@echo off
cd /d "%~dp0"
if not exist node_modules (
  call npm ci
  if errorlevel 1 exit /b 1
)
echo Abra http://127.0.0.1:4173 no navegador quando o servidor estiver pronto.
call npm start
pause

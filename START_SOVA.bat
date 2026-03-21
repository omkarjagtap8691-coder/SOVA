@echo off
echo Starting SOVA...
cd backend
start /B npm start
timeout /t 3 /nobreak > nul
start chrome http://localhost:3000
echo SOVA is running at http://localhost:3000

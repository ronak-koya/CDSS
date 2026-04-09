@echo off
echo Starting CDSS Backend...
cd /d "%~dp0backend"
pnpm run dev

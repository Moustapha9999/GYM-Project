@echo off
title GYM SYLLA - Machine A
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-machine-a.ps1"

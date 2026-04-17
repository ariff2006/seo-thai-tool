@echo off
setlocal enabledelayedexpansion

title SEO-Thai Deploy Tool

:MENU
cls
echo.
echo  ==========================================
echo    SEO-Thai Deploy Tool
echo  ==========================================
echo.
echo  [1] Google Apps Script  (clasp push)
echo  [2] GitHub              (git push)
echo  [3] Vercel              (vercel --prod)
echo  ------------------------------------------
echo  [4] Deploy ALL          (1 then 2 then 3)
echo  [5] Open Local          (open index.html)
echo  [6] Check Tools         (node/git/clasp/vercel)
echo  [Q] Quit
echo.
set /p choice="  Choose: "

if /i "%choice%"=="1" goto GAS
if /i "%choice%"=="2" goto GITHUB
if /i "%choice%"=="3" goto VERCEL
if /i "%choice%"=="4" goto ALL
if /i "%choice%"=="5" goto LOCAL
if /i "%choice%"=="6" goto TOOLS
if /i "%choice%"=="q" goto END
goto MENU

:: ============================================================
:GAS
cls
echo.
echo  [1/3] Google Apps Script -- clasp push
echo  ========================================
echo.
cd /d "%~dp0"

where clasp >nul 2>&1
if errorlevel 1 (
  echo  [X] clasp not found.
  echo      Install: npm install -g @google/clasp
  echo      Then run: clasp login
  echo.
  pause & goto MENU
)
echo  [OK] clasp found.
echo.

if not exist "%~dp0.clasp.json" (
  echo  [\!] .clasp.json not found -- first time setup needed.
  echo.
  echo  Steps:
  echo    1. Go to script.google.com and open your project
  echo    2. Settings - copy the Script ID
  echo    3. Paste it below
  echo.
  set /p sid="  Script ID: "
  if "\!sid\!"=="" ( echo Cancelled. & pause & goto MENU )
  echo {"scriptId":"\!sid\!","rootDir":"."} > "%~dp0.clasp.json"
  echo  [OK] .clasp.json created.
  echo.
)

echo  Pushing to Google Apps Script...
echo.
clasp push --force
if errorlevel 1 (
  echo.
  echo  [X] Push failed. Try: clasp login
) else (
  echo.
  echo  [OK] Push successful\!
  echo.
  set /p dep="  Deploy as new Web App too? (y/n): "
  if /i "\!dep\!"=="y" (
    clasp deploy --description "deploy %date%"
    echo  [OK] Deployed\! Copy the new URL to GAS_URL in script.js if it changed.
  )
)
echo.
pause & goto MENU

:: ============================================================
:GITHUB
cls
echo.
echo  [2/3] GitHub -- git push
echo  ==========================
echo.
cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo  [X] Git not found. Download: https://git-scm.com
  echo.
  pause & goto MENU
)
echo  [OK] Git found.
echo.

echo  Current status:
git status --short
echo.

git status --porcelain > "%TEMP%\gs.tmp" 2>&1
for %%A in ("%TEMP%\gs.tmp") do if %%~zA==0 (
  echo  [\!] Nothing to commit.
  echo.
  pause & goto MENU
)

set msg=update
set /p msg="  Commit message (Enter = 'update'): "

echo.
echo  Running: git add -A, commit, push...
echo.
git add -A
git commit -m "%msg%"
git push

if errorlevel 1 (
  echo.
  echo  [X] Push failed. Check your remote:
  echo      git remote -v
  echo.
  echo  If no remote set:
  echo      git remote add origin https://github.com/USERNAME/REPO.git
) else (
  echo.
  echo  [OK] Pushed to GitHub\!
)
echo.
pause & goto MENU

:: ============================================================
:VERCEL
cls
echo.
echo  [3/3] Vercel -- Deploy Production
echo  ====================================
echo.
cd /d "%~dp0"

where vercel >nul 2>&1
if errorlevel 1 (
  echo  [X] Vercel CLI not found.
  echo      Install: npm install -g vercel
  echo      Then run: vercel login
  echo.
  pause & goto MENU
)
echo  [OK] Vercel CLI found.
echo.
echo  Deploying to production...
echo.
vercel --prod

if errorlevel 1 (
  echo.
  echo  [X] Deploy failed. Try: vercel login
) else (
  echo.
  echo  [OK] Deployed to Vercel\! Site is live.
)
echo.
pause & goto MENU

:: ============================================================
:ALL
cls
echo.
echo  Deploy ALL: GAS - GitHub - Vercel
echo  =====================================
echo.
cd /d "%~dp0"

set GAS_OK=0
set GIT_OK=0
set VER_OK=0
where clasp  >nul 2>&1 && set GAS_OK=1
where git    >nul 2>&1 && set GIT_OK=1
where vercel >nul 2>&1 && set VER_OK=1

if "%GAS_OK%"=="0" echo  [SKIP] clasp not found -- skipping GAS
if "%GIT_OK%"=="0" echo  [SKIP] git not found   -- skipping GitHub
if "%VER_OK%"=="0" echo  [SKIP] vercel not found-- skipping Vercel
echo.

if "%GAS_OK%"=="1" (
  echo  [1/3] Pushing to Google Apps Script...
  clasp push --force
  if errorlevel 1 ( echo  [X] GAS failed ) else ( echo  [OK] GAS done )
  echo.
)

if "%GIT_OK%"=="1" (
  echo  [2/3] Pushing to GitHub...
  git status --porcelain > "%TEMP%\gs.tmp" 2>&1
  for %%A in ("%TEMP%\gs.tmp") do if %%~zA GTR 0 (
    git add -A
    git commit -m "deploy %date%"
  )
  git push
  if errorlevel 1 ( echo  [X] GitHub failed ) else ( echo  [OK] GitHub done )
  echo.
)

if "%VER_OK%"=="1" (
  echo  [3/3] Deploying to Vercel...
  vercel --prod
  if errorlevel 1 ( echo  [X] Vercel failed ) else ( echo  [OK] Vercel done )
  echo.
)

echo  ==========================================
echo    Done\!
echo  ==========================================
echo.
pause & goto MENU

:: ============================================================
:LOCAL
cls
echo.
echo  Opening index.html in browser...
echo.
echo  Tip: Set USE_LOCAL_MOCK: true in script.js to test without GAS.
echo.
start "" "%~dp0index.html"
echo  [OK] Opened\!
echo.
pause & goto MENU

:: ============================================================
:TOOLS
cls
echo.
echo  Checking installed tools...
echo  ================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [X] Node.js  -- NOT FOUND
  echo      Download: https://nodejs.org
) else (
  for /f %%v in ('node --version') do echo  [OK] Node.js  -- %%v
)
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo  [X] Git      -- NOT FOUND
  echo      Download: https://git-scm.com
) else (
  for /f "tokens=1-3" %%a in ('git --version') do echo  [OK] Git      -- %%a %%b %%c
)
echo.

where clasp >nul 2>&1
if errorlevel 1 (
  echo  [X] clasp    -- NOT FOUND (npm install -g @google/clasp)
) else (
  echo  [OK] clasp   -- found
)
echo.

where vercel >nul 2>&1
if errorlevel 1 (
  echo  [X] vercel   -- NOT FOUND (npm install -g vercel)
) else (
  echo  [OK] vercel  -- found
)
echo.

if exist "%~dp0.clasp.json" (
  echo  [OK] .clasp.json -- found (Script ID configured)
) else (
  echo  [\!] .clasp.json  -- NOT FOUND (run option 1 to set up)
)
echo.

for /f "tokens=*" %%r in ('git remote get-url origin 2^>nul') do echo  [OK] git remote -- %%r
echo.

where node >nul 2>&1
if not errorlevel 1 (
  set /p inst="  Install missing tools now? (y/n): "
  if /i "\!inst\!"=="y" (
    echo.
    echo  Installing @google/clasp ...
    npm install -g @google/clasp
    echo.
    echo  Installing vercel ...
    npm install -g vercel
    echo.
    echo  [OK] Done\! Now run: clasp login   and   vercel login
  )
)
echo.
pause & goto MENU

:: ============================================================
:END
echo.
echo  Goodbye\!
echo.
endlocal
exit /b 0

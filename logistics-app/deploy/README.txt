TAS App - Deployment Instructions
==================================

FIRST TIME SETUP (do this once on the server PC)
-------------------------------------------------
1. Install Node.js from https://nodejs.org  (choose LTS version)
2. Right-click "setup.ps1" -> "Run with PowerShell" (as Administrator)
3. Wait for it to finish. It will show the URL to share with users.
4. Done. Server starts automatically every time the PC boots.


DAILY USE
---------
- Just turn on the PC. Server starts by itself.
- Users open browser and go to: http://<this-pc-ip>:8080
- No need to open any terminal or program.


START SERVER MANUALLY (if needed)
----------------------------------
Double-click "start-now.bat"


AFTER UPDATING THE APP (pulling new code from GitHub)
------------------------------------------------------
1. Pull latest code from GitHub
2. Right-click "update.ps1" -> "Run with PowerShell" (as Administrator)
3. Done. Server restarts with new version.

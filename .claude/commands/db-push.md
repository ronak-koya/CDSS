# /db-push — Safe Prisma Schema Push

Safely push Prisma schema changes to the SQLite database and regenerate the client.
Handle the Windows DLL lock issue automatically.

## Steps to execute:

1. Check if anything is running on port 5000:
```bash
cmd /c "netstat -aon | findstr :5000"
```

2. If backend is running, find and kill the node process locking the Prisma DLL:
```bash
powershell -Command "Get-Process | Where-Object { try { $_.Modules | Where-Object { $_.FileName -like '*query_engine*' } } catch {} }"
```
Kill it with: `powershell -Command "Stop-Process -Id <PID> -Force"`

3. Remove the locked DLL and any leftover tmp files:
```bash
powershell -Command "
\$dir = 'C:\Users\Bacancy\Downloads\CDSS\backend\node_modules\.pnpm\@prisma+client@5.22.0_prisma@5.22.0\node_modules\.prisma\client'
Get-ChildItem \$dir -Filter '*.dll.node*' | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host 'Cleaned DLL files'
"
```

4. Push schema to DB:
```bash
cd c:/Users/Bacancy/Downloads/CDSS/backend && export PATH="$PATH:/c/Users/Bacancy/AppData/Roaming/npm" && pnpm exec prisma db push
```

5. Regenerate Prisma client:
```bash
cd c:/Users/Bacancy/Downloads/CDSS/backend && export PATH="$PATH:/c/Users/Bacancy/AppData/Roaming/npm" && pnpm exec prisma generate
```

6. Remind the user to restart the backend dev server.

> ⚠️ After this completes, start the backend again: `cd backend && pnpm run dev`

# /check-server — Check Dev Server Status

Check whether backend and frontend servers are running.

## Steps to execute:

1. Check backend (port 5000):
```bash
cmd /c "netstat -aon | findstr :5000"
```
If output shows `LISTENING` → backend is running.

2. Check frontend (port 5173):
```bash
cmd /c "netstat -aon | findstr :5173"
```
If output shows `LISTENING` → frontend is running.

3. If backend is running, verify API health:
```bash
curl -s http://localhost:5000/api/health || echo "No health endpoint"
```

4. Show all node processes:
```bash
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, CPU, WorkingSet, StartTime"
```

## If a server is not running:
Use `/dev` to start the servers.

## If a port is stuck / server won't start:
```bash
powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -ErrorAction SilentlyContinue"
```
Then kill with: `Stop-Process -Id <PID> -Force`

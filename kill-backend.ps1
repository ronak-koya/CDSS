$procs = Get-WmiObject Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -like '*CDSS*backend*' -or $_.CommandLine -like '*ts-node*' }
foreach ($p in $procs) {
    Write-Host "Killing PID $($p.ProcessId): $($p.CommandLine.Substring(0, [Math]::Min(80, $p.CommandLine.Length)))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Write-Host "Done"

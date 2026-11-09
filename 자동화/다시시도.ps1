# 앱의 [다시 시도] 버튼: 저장 못 한 카톡 방만 다시 저장 → 일정 정리 → 앱 자료 갱신
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$flag = Join-Path $here "오늘자료\다시시도_중.txt"
if (Test-Path -LiteralPath $flag) { if (((Get-Date) - (Get-Item -LiteralPath $flag).LastWriteTime).TotalMinutes -lt 40) { exit } }
Set-Content -LiteralPath $flag -Value (Get-Date) -Encoding UTF8
try {
  & $ps -NoProfile -ExecutionPolicy Bypass -STA -File (Join-Path $here "카톡_아침내보내기.ps1") -Retry
  & $ps -NoProfile -ExecutionPolicy Bypass -File (Join-Path $here "일정정리_실행.ps1")
  & $ps -NoProfile -ExecutionPolicy Bypass -File (Join-Path $here "화면자료_만들기.ps1")
} finally { Remove-Item -LiteralPath $flag -Force -ErrorAction SilentlyContinue }

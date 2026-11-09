# 처음 설정 화면에서 고른 대로 이 PC의 아침 예약을 만들거나 끈다. 3번은 앱을 --morning 으로 불러 정리·알림·동기화까지 한다.
param([string]$Time = "06:00", [string]$Sources = "kakao,sms", [string]$Engine = "gemini", [string]$AppExe = "", [string]$AppArgs = "--morning", [switch]$Off, [string]$Prefix = "RamBriefing")
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot; . (Join-Path $here "공통.ps1")
$names = "1 Kakao", "2 Messages", "3 Morning"
if ($Off) {
  foreach ($n in $names + "3 Schedule", "4 Screen") { $x = Get-ScheduledTask -TaskName "$Prefix $n" -ErrorAction SilentlyContinue; if ($x) { Disable-ScheduledTask -InputObject $x | Out-Null } }
  "off"; exit
}
if ($Time -notmatch '^([01]\d|2[0-3]):[0-5]\d$') { throw "시각 형식이 맞지 않습니다" }
if (-not $AppExe) { throw "앱 위치가 없습니다" }
$base = [datetime]::ParseExact($Time, "HH:mm", $null)
$picked = @($Sources -split "," | Where-Object { $_ })
$ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$set = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$psAct = { param($f) New-ScheduledTaskAction -Execute $ps -Argument ("-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File ""{0}""" -f (Join-Path $here $f)) }
$list = @(
  @{ n = "1 Kakao";    a = (& $psAct "카톡_아침내보내기.ps1"); m = -50; need = "kakao" },
  @{ n = "2 Messages"; a = (& $psAct "문자_읽기.ps1");         m = -10; need = "sms" },
  @{ n = "3 Morning";  a = (New-ScheduledTaskAction -Execute $AppExe -Argument $AppArgs); m = 0; need = "" })
foreach ($t in $list) {
  $name = "$Prefix $($t.n)"
  Register-ScheduledTask -TaskName $name -Action $t.a -Trigger (New-ScheduledTaskTrigger -Daily -At ($base.AddMinutes($t.m))) -Settings $set -Force | Out-Null
  if ($t.need -and $picked -notcontains $t.need) { Disable-ScheduledTask -TaskName $name | Out-Null } else { Enable-ScheduledTask -TaskName $name | Out-Null }
}
foreach ($n in "3 Schedule", "4 Screen") { $x = Get-ScheduledTask -TaskName "$Prefix $n" -ErrorAction SilentlyContinue; if ($x) { Unregister-ScheduledTask -InputObject $x -Confirm:$false } }
[IO.File]::WriteAllText($RB.cfg, (@{ sources = $picked; time = $Time; engine = $Engine } | ConvertTo-Json -Compress), [Text.UTF8Encoding]::new($false))
"on"

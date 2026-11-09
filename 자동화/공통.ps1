# 자동화 스크립트 공통: 작업 폴더 위치. 개발 폴더에서는 스크립트 옆, 설치본에서는 사용자 폴더(AppData)를 쓴다.
$RB = @{}
$__dev = Test-Path -LiteralPath (Join-Path (Split-Path $PSScriptRoot) "앱\main.js")
$RB.base = if ($__dev) { $PSScriptRoot } else { Join-Path $env:APPDATA "RamBriefing\briefing" }
$RB.work = Join-Path $RB.base "오늘자료"
$RB.out = Join-Path $RB.base "결과"
$RB.data = if ($__dev) { Join-Path (Split-Path $PSScriptRoot) "앱\data" } else { Join-Path $RB.base "data" }
$RB.cfg = Join-Path $RB.base "설정.json"
foreach ($d in $RB.work, $RB.out, $RB.data) { New-Item -ItemType Directory -Force $d | Out-Null }
# 카톡 찾기·켜기: 작업 표시줄이나 바탕화면에 없어도 윈도우 앱 목록에서 찾아 켠다. 없으면 설치 위치에서 찾는다.
function Find-Kakao {
  $a = Get-StartApps -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(카카오톡|KakaoTalk)$' } | Select-Object -First 1
  if ($a) { return "shell:AppsFolder\" + $a.AppID }
  foreach ($p in "${env:ProgramFiles(x86)}\Kakao\KakaoTalk\KakaoTalk.exe", "$env:ProgramFiles\Kakao\KakaoTalk\KakaoTalk.exe", "$env:LOCALAPPDATA\Kakao\KakaoTalk\KakaoTalk.exe") { if (Test-Path -LiteralPath $p) { return $p } }
  return ""
}
function Start-Kakao { $k = Find-Kakao; if (-not $k) { return $false }; if ($k -like "shell:*") { Start-Process explorer.exe $k } else { Start-Process -FilePath $k }; return $true }

# 자동화 스크립트 공통: 작업 폴더 위치. 개발 폴더에서는 스크립트 옆, 설치본에서는 사용자 폴더(AppData)를 쓴다.
$RB = @{}
$__dev = Test-Path -LiteralPath (Join-Path (Split-Path $PSScriptRoot) "앱\main.js")
$RB.base = if ($__dev) { $PSScriptRoot } else { Join-Path $env:APPDATA "RamBriefing\briefing" }
$RB.work = Join-Path $RB.base "오늘자료"
$RB.out = Join-Path $RB.base "결과"
$RB.data = if ($__dev) { Join-Path (Split-Path $PSScriptRoot) "앱\data" } else { Join-Path $RB.base "data" }
$RB.cfg = Join-Path $RB.base "설정.json"
foreach ($d in $RB.work, $RB.out, $RB.data) { New-Item -ItemType Directory -Force $d | Out-Null }

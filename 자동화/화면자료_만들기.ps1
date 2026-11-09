# 아침 자동화 결과를 RamBriefing 화면용 자료로 바꾼다. AI를 쓰지 않는다. 최근 14일치만 보관한다.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$src = Join-Path $here "오늘자료"
$app = Join-Path (Split-Path $here) "앱"
$dataDir = Join-Path $app "data"
New-Item -ItemType Directory -Force $dataDir | Out-Null
$today = Get-Date -Format "yyyy-MM-dd"

function Read-Text($p) { if (Test-Path -LiteralPath $p) { return [IO.File]::ReadAllLines($p, [Text.Encoding]::UTF8) } else { return @() } }

# ----- 일정 정리 결과: 오늘 결과 중 가장 최근 것 -----
$summary = New-Object System.Collections.ArrayList
$res = Get-ChildItem -LiteralPath (Join-Path $here "결과") -Filter "$today*.md" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($res) {
  $cur = $null; $front = 0
  foreach ($line in (Read-Text $res.FullName)) {
    if ($line -eq "---" -and $front -lt 2) { $front++; continue }
    if ($front -lt 2) { continue }
    if ($line -match '^##\s*(.+)$') { $cur = @{ title = $Matches[1].Trim(); items = New-Object System.Collections.ArrayList; para = New-Object System.Collections.ArrayList }; [void]$summary.Add($cur); continue }
    if ($cur -and $line.Trim()) { if ($line -match '^\s*[-*]\s+') { [void]$cur.items.Add(($line -replace '^\s*[-*]\s+', '').Trim()) } else { [void]$cur.para.Add($line.Trim()) } }
  }
}

# 글머리표가 있는 칸은 글머리표만, 없는 칸은 문장을 항목으로 쓴다
foreach ($s in $summary) { if ($s.items.Count -eq 0) { $s.items = $s.para }; $s.Remove("para") }

# ----- 저장 못 한 방 -----
$failed = @()
$logFile = Join-Path $src "카톡_실행기록.json"
if (Test-Path -LiteralPath $logFile) {
  $log = [IO.File]::ReadAllText($logFile, [Text.Encoding]::UTF8) | ConvertFrom-Json
  $failed = @(@($log.errors) | Where-Object { $_ } | ForEach-Object { @{ room = [string]$_.room; msg = [string]$_.msg } })
}

$json = @{ date = $today; time = (Get-Date -Format "M/d HH:mm"); summary = @($summary); failed = @($failed) } | ConvertTo-Json -Depth 5 -Compress
[IO.File]::WriteAllText((Join-Path $dataDir "$today.js"), "window.RAM_DATA=" + $json + ";", [Text.UTF8Encoding]::new($false))

# 14일 넘은 자료 지우기, 날짜 목록 다시 쓰기
Get-ChildItem -LiteralPath $dataDir -Filter "20*.js" -File | Where-Object { $_.BaseName -lt (Get-Date).AddDays(-14).ToString("yyyy-MM-dd") } | Remove-Item -Force
$days = @(Get-ChildItem -LiteralPath $dataDir -Filter "20*.js" -File | ForEach-Object { $_.BaseName } | Sort-Object -Descending)
[IO.File]::WriteAllText((Join-Path $dataDir "index.js"), "window.RAM_DAYS=" + (ConvertTo-Json @($days) -Compress) + ";", [Text.UTF8Encoding]::new($false))
"RamBriefing 자료: 일정 결과 $(if ($res) { '있음' } else { '없음' }), 저장 못 한 방 $(@($failed).Count)개"

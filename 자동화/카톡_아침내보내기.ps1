param([int]$MaxRooms = 0, [switch]$Retry)
# 매일 아침: 방 열고 Ctrl+S → 어제·오늘 대화만 모으기. AI를 쓰지 않는다.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot; . (Join-Path $here "공통.ps1"); $out = $RB.work; $raw = Join-Path $out "카톡원본"
New-Item -ItemType Directory -Force $raw | Out-Null
if (-not $Retry) { Get-ChildItem -LiteralPath $raw -Filter *.txt -File -ErrorAction SilentlyContinue | Remove-Item -Force }
$resFile = Join-Path $out "카톡_실행기록.json"; $recent = Join-Path $out "카카오톡_최근대화.txt"
$t0 = Get-Date
$ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
if ($Retry) {
  # 저장 못 한 방만 다시: 이번 결과를 지난 기록에 합친다
  $prev = Get-Content -LiteralPath $resFile -Raw -Encoding UTF8 | ConvertFrom-Json
  $names = @(@($prev.errors) | ForEach-Object { [string]$_.room } | Where-Object { $_ -and $_ -notmatch '^목록 위치' })
  if (-not $names.Count) {
    # 방 이름이 없는 실패(로그아웃 등)면 처음부터 다시 저장한다
    if (-not @(@($prev.errors) | Where-Object { $_ }).Count) { "다시 시도할 방이 없어요"; exit }
    & $ps -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -MaxRooms $MaxRooms; exit
  }
  $tmp = Join-Path $out "카톡_다시시도.json"
  & $ps -NoProfile -ExecutionPolicy Bypass -STA -File (Join-Path $here "카톡방_내보내기.ps1") -OutDir $raw -ResultFile $tmp -Days 7 -Only ($names -join ",")
  $now = Get-Content -LiteralPath $tmp -Raw -Encoding UTF8 | ConvertFrom-Json
  $ok = @(@($now.saved) | ForEach-Object { [string]$_.room })
  $still = @(@($now.errors) | Where-Object { $_ })
  $tried = @($still | ForEach-Object { [string]$_.room })
  $left = @(@($prev.errors) | Where-Object { $_ -and $ok -notcontains [string]$_.room -and $tried -notcontains [string]$_.room })
  @{ saved = @(@($prev.saved) + @($now.saved) | Where-Object { $_ }); errors = @($still + $left) } | ConvertTo-Json -Depth 5 | Out-File -LiteralPath $resFile -Encoding utf8
  Remove-Item -LiteralPath $tmp -Force
} else {
  & $ps -NoProfile -ExecutionPolicy Bypass -STA -File (Join-Path $here "카톡방_내보내기.ps1") -OutDir $raw -ResultFile $resFile -MaxRooms $MaxRooms
}
$r = Get-Content -LiteralPath $resFile -Raw -Encoding UTF8 | ConvertFrom-Json
$since = (Get-Date).Date.AddDays(-1); $sb = New-Object System.Text.StringBuilder; $kept = 0
foreach ($file in Get-ChildItem -LiteralPath $raw -Filter *.txt -File) {
  $take = $false; $body = New-Object System.Text.StringBuilder; $title = ""
  foreach ($line in [IO.File]::ReadLines($file.FullName, [Text.Encoding]::UTF8)) {
    if (-not $title) { $title = $line.TrimStart([char]0xFEFF) }
    if ($line -match '^-{5,} (\d{4})년 (\d{1,2})월 (\d{1,2})일') { $take = ([datetime]::new([int]$Matches[1], [int]$Matches[2], [int]$Matches[3])) -ge $since }
    if ($take) { [void]$body.AppendLine($line) }
  }
  if ($body.Length) { $kept++; [void]$sb.AppendLine("=== " + $title + " ==="); [void]$sb.Append($body.ToString()); [void]$sb.AppendLine() }
}
$head = "카카오톡 최근 대화 (어제·오늘) 뽑은 시각 {0}`r`n저장 {1}개, 실패 {2}개, 어제·오늘 대화 있는 방 {3}개, {4}분`r`n`r`n" -f (Get-Date -Format "yyyy-MM-dd HH:mm"), @($r.saved).Count, @($r.errors).Count, $kept, [int]((Get-Date) - $t0).TotalMinutes
[IO.File]::WriteAllText($recent, $head + $sb.ToString(), [Text.UTF8Encoding]::new($false))
$head
@($r.errors) | ForEach-Object { "실패: " + $_.msg }
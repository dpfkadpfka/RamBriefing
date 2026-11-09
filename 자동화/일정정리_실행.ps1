# RamBriefing 일정 정리: 메일·문자·카톡을 클로드(구독 로그인)로 읽어 캘린더에 넣고 카톡으로 보고한다. RamBot 없이 혼자 돈다.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot; . (Join-Path $here "공통.ps1"); $work = $RB.work; $out = $RB.out
foreach ($n in "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_API_KEY") { Remove-Item "Env:$n" -ErrorAction SilentlyContinue }
$tools = "mcp__claude_ai_Gmail__search_threads,mcp__claude_ai_Gmail__get_thread,mcp__claude_ai_Gmail__get_message,mcp__claude_ai_Google_Calendar__list_calendars,mcp__claude_ai_Google_Calendar__list_events,mcp__claude_ai_Google_Calendar__search_events,mcp__claude_ai_Google_Calendar__create_event,mcp__claude_ai_Google_Calendar__get_event,mcp__claude_ai_PlayMCP__KakaotalkChat-MemoChat,Read"
$prompt = [IO.File]::ReadAllText((Join-Path $here "일정정리_지시.md"), [Text.Encoding]::UTF8)
$cfg = $RB.cfg
if (Test-Path -LiteralPath $cfg) { $src = @((Get-Content -LiteralPath $cfg -Raw -Encoding UTF8 | ConvertFrom-Json).sources); $skip = @(@{ k = "mail"; n = "메일" }, @{ k = "sms"; n = "휴대폰 문자" }, @{ k = "kakao"; n = "카톡" }, @{ k = "school"; n = "학교 메신저" } | Where-Object { $src -notcontains $_.k } | ForEach-Object { $_.n }); if ($skip.Count) { $prompt = "이 사용자는 다음 자료를 쓰지 않습니다. 읽지 말고 '확인한 자료'에 '사용 안 함'으로 적습니다: " + ($skip -join ", ") + "`n`n" + $prompt } }
# 사람마다 고른 설정: 끈 일은 지시와 도구에서 함께 뺀다
if (Test-Path -LiteralPath $cfg) {
  $o = Get-Content -LiteralPath $cfg -Raw -Encoding UTF8 | ConvertFrom-Json; $off = @()
  if ($o.autoCal -eq $false) { $off += "캘린더에 일정을 넣지 않습니다. 3번을 건너뛰고 '넣은 일정'은 비워 둡니다. 날짜가 있는 일은 '확인 필요'에 씁니다."; $tools = (($tools -split ",") | Where-Object { $_ -notmatch 'create_event' }) -join "," }
  if ($o.report -eq $false) { $off += "카카오톡 보고를 보내지 않습니다. 4번을 건너뜁니다."; $tools = (($tools -split ",") | Where-Object { $_ -notmatch 'Kakaotalk' }) -join "," }
  if ($o.news -eq $false) { $off += "소소한 소식을 고르지 않습니다. 2-2번을 건너뛰고 '소소한 소식'은 비워 둡니다." }
  if ($off.Count) { $prompt = "이 사용자가 고른 설정입니다. " + ($off -join " ") + "`n`n" + $prompt }
}
$OutputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
Set-Location -LiteralPath $work
$claude = Join-Path $HOME ".local\bin\claude.exe"
$ok = "성공"
try { $text = ($prompt | & $claude -p --permission-mode default --allowedTools $tools) -join "`n"; if ($LASTEXITCODE -ne 0) { $ok = "실패" } }
catch { $text = $_.Exception.Message; $ok = "실패" }
$file = Join-Path $out ((Get-Date -Format "yyyy-MM-dd_HH-mm") + ".md")
[IO.File]::WriteAllText($file, "---`n시각: $(Get-Date -Format 'yyyy-MM-dd HH:mm')`n결과: $ok`n---`n`n$text`n", [Text.UTF8Encoding]::new($false))
Get-ChildItem -LiteralPath $out -Filter *.md -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force
$ok
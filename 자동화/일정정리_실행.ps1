# RamBriefing 일정 정리: 메일·문자·카톡을 클로드(구독 로그인)로 읽어 캘린더에 넣고 카톡으로 보고한다. RamBot 없이 혼자 돈다.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot; . (Join-Path $here "공통.ps1"); $work = $RB.work; $out = $RB.out
foreach ($n in "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_API_KEY") { Remove-Item "Env:$n" -ErrorAction SilentlyContinue }
$tools = "mcp__claude_ai_Gmail__search_threads,mcp__claude_ai_Gmail__get_thread,mcp__claude_ai_Gmail__get_message,mcp__claude_ai_Google_Calendar__list_calendars,mcp__claude_ai_Google_Calendar__list_events,mcp__claude_ai_Google_Calendar__search_events,mcp__claude_ai_Google_Calendar__create_event,mcp__claude_ai_Google_Calendar__get_event,mcp__claude_ai_PlayMCP__KakaotalkChat-MemoChat,Read"
$prompt = [IO.File]::ReadAllText((Join-Path $here "일정정리_지시.md"), [Text.Encoding]::UTF8)
$cfg = $RB.cfg
if (Test-Path -LiteralPath $cfg) { $src = @((Get-Content -LiteralPath $cfg -Raw -Encoding UTF8 | ConvertFrom-Json).sources); $skip = @(@{ k = "mail"; n = "메일" }, @{ k = "sms"; n = "휴대폰 문자" }, @{ k = "kakao"; n = "카톡" } | Where-Object { $src -notcontains $_.k } | ForEach-Object { $_.n }); if ($skip.Count) { $prompt = "이 사용자는 다음 자료를 쓰지 않습니다. 읽지 말고 '확인한 자료'에 '사용 안 함'으로 적습니다: " + ($skip -join ", ") + "`n`n" + $prompt } }
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
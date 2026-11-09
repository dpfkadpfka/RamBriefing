# RamBriefing 일정 정리: 메일·문자·카톡을 클로드(구독 로그인)로 읽어 캘린더에 넣고 카톡으로 보고한다. RamBot 없이 혼자 돈다.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot; $work = Join-Path $here "오늘자료"; $out = Join-Path $here "결과"
foreach ($n in "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_API_KEY") { Remove-Item "Env:$n" -ErrorAction SilentlyContinue }
$tools = "mcp__claude_ai_Gmail__search_threads,mcp__claude_ai_Gmail__get_thread,mcp__claude_ai_Gmail__get_message,mcp__claude_ai_Google_Calendar__list_calendars,mcp__claude_ai_Google_Calendar__list_events,mcp__claude_ai_Google_Calendar__search_events,mcp__claude_ai_Google_Calendar__create_event,mcp__claude_ai_Google_Calendar__get_event,mcp__claude_ai_PlayMCP__KakaotalkChat-MemoChat,Read"
$prompt = [IO.File]::ReadAllText((Join-Path $here "일정정리_지시.md"), [Text.Encoding]::UTF8)
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
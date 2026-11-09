# 휴대폰과 연결을 열고 메시지 탭에서 안 읽은 대화를 눌러 내용을 읽어 txt로 저장한다. AI를 쓰지 않는다.
# 대화 선택과 새로 고침만 한다. 답장·보내기·보관 버튼과 입력칸은 건드리지 않는다.
param([string]$Since = "")   # 예: 2026-10-01 이면 그 날짜 이후 문자를 대화 전체에서 읽음 (평소에는 안 읽은 대화만)
$ErrorActionPreference = "SilentlyContinue"
$SinceDate = $null; if ($Since) { $SinceDate = [datetime]$Since }
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$AE = [System.Windows.Automation.AutomationElement]
$Scope = [System.Windows.Automation.TreeScope]
$True_ = [System.Windows.Automation.Condition]::TrueCondition
. (Join-Path $PSScriptRoot "공통.ps1")
$Out = Join-Path $RB.work "휴대폰메시지.txt"
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
$sb = New-Object System.Text.StringBuilder
function Finish($note) {
  $head = "휴대폰 안 읽은 메시지 뽑은 시각 {0}`r`n{1}`r`n`r`n" -f (Get-Date -Format "yyyy-MM-dd HH:mm"), $note
  [IO.File]::WriteAllText($Out, $head + $sb.ToString(), [Text.UTF8Encoding]::new($false))
  $note; exit
}
Start-Process explorer.exe 'shell:AppsFolder\Microsoft.YourPhone_8wekyb3d8bbwe!App'
$pl = $null
for ($i = 0; $i -lt 30 -and -not $pl; $i++) {
  Start-Sleep -Seconds 1
  foreach ($w in $AE::RootElement.FindAll($Scope::Children, $True_)) { if ($w.Current.Name -match '휴대폰과 연결|Phone Link') { $pl = $w; break } }
}
if (-not $pl) { Finish "휴대폰과 연결 창을 찾지 못함" }
function ById($id) {
  $c = New-Object System.Windows.Automation.PropertyCondition($AE::AutomationIdProperty, $id)
  for ($i = 0; $i -lt 15; $i++) { $e = $pl.FindFirst($Scope::Descendants, $c); if ($e) { return $e }; Start-Sleep -Seconds 1 }
  return $null
}
function SelectIt($e) { $p = $null; if ($e.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$p)) { $p.Select(); return $true }; return $false }
$cn = ById "ConnectivityCardOpenButton"; $state = if ($cn) { $cn.Current.Name } else { "알 수 없음" }
$tab = ById "MessagingNodeAutomationId"; if ($tab) { SelectIt $tab | Out-Null }
Start-Sleep -Seconds 3
$rf = ById "RefreshButton"
if ($rf) { $p = $null; if ($rf.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { $p.Invoke() } }
Start-Sleep -Seconds 12
$lv = ById "CVSListView"; if (-not $lv) { Finish "대화 목록을 찾지 못함 (연결 상태: $state)" }
$cItem = New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, "ListViewItem")
$cList = New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::List)
$done = @{}; $read = 0; $ads = 0; $oldRun = 0; $t0 = Get-Date
function SepDate($s) { if ($s -match '구분 기호, (\d{1,2})월 (\d{1,2}), (\d{4})') { return [datetime]::new([int]$Matches[3], [int]$Matches[1], [int]$Matches[2]) }; return $null }
# 대화 안을 위로 올리며 기준 날짜까지 읽기
function ReadBack($msgs) {
  $all = New-Object System.Collections.ArrayList; $have = @{}
  for ($k = 0; $k -lt 40; $k++) {
    $rows = @($msgs.FindAll($Scope::Descendants, $cItem) | ForEach-Object { (($_.Current.Name -replace '[\u200e\u200f]', '') -replace '\s+', ' ').Trim() } | Where-Object { $_ })
    $new = @($rows | Where-Object { -not $have.ContainsKey($_) }); foreach ($r in $new) { $have[$r] = 1 }
    if ($new.Count) { $all.InsertRange(0, [string[]]$new) }
    $reached = $false; foreach ($r in $new) { $sd = SepDate $r; if ($sd -and $sd -lt $SinceDate) { $reached = $true } }
    $q = $null
    if ($reached -or -not $msgs.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern, [ref]$q) -or -not $q.Current.VerticalScrollable -or $q.Current.VerticalScrollPercent -le 0) { break }
    $q.Scroll([System.Windows.Automation.ScrollAmount]::NoAmount, [System.Windows.Automation.ScrollAmount]::LargeDecrement); Start-Sleep -Milliseconds 700
  }
  $keep = @(); $cur = $null; $lastSep = $null; $any = $false
  foreach ($r in $all) { $sd = SepDate $r; if ($sd) { $cur = $sd; $lastSep = $sd }; if ($r -match '구분 기호') { $any = $true }; if (-not $cur -or $cur -ge $SinceDate) { if (-not $any -and $k -gt 0) { continue }; $keep += $r } }
  return [pscustomobject]@{ Rows = $keep; Old = [bool]($lastSep -and $lastSep -lt $SinceDate -and -not (@($all | Select-Object -Last 8) -match '구분 기호, (오늘|어제|.요일)').Count) }
}
if ($SinceDate) { $p = $null; if ($lv.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern, [ref]$p)) { $p.SetScrollPercent(-1, 0); Start-Sleep -Seconds 1 } }
$maxPages = if ($SinceDate) { 60 } else { 12 }; $halt = $false
for ($page = 0; $page -lt $maxPages -and -not $halt; $page++) {
  $items = @($lv.FindAll($Scope::Descendants, $cItem))
  $fresh = 0
  foreach ($it in $items) {
    $full = $it.Current.Name; if (-not $full) { continue }
    $key = ($full -replace '\s+', ' '); if ($done.ContainsKey($key)) { continue }
    $done[$key] = 1; $fresh++
    if (-not $SinceDate -and $full -notmatch '읽지 않은') { continue }
    if ($SinceDate -and ((Get-Date) - $t0).TotalMinutes -gt 25) { $halt = $true; break }
    if ($full -match '\(광고\)') { $ads++; continue }
    $who = ($full -split '와의 대화|과의 대화')[0].Trim()
    if (-not (SelectIt $it)) { continue }
    Start-Sleep -Seconds 2
    $msgs = $null
    foreach ($l in $pl.FindAll($Scope::Descendants, $cList)) { if ($l.Current.Name -eq "메시지") { $msgs = $l; break } }
    if ($SinceDate) {
      if (-not $msgs) { continue }
      $rb = ReadBack $msgs
      if ($rb.Old) { $oldRun++; if ($oldRun -ge 6) { $halt = $true; break }; continue }
      $oldRun = 0
      if (-not @($rb.Rows).Count) { continue }
      [void]$sb.AppendLine("=== " + $who + " ===")
      foreach ($r in $rb.Rows) { [void]$sb.AppendLine($r) }
      [void]$sb.AppendLine(); $read++; continue
    }
    [void]$sb.AppendLine("=== " + $who + " ===")
    if ($msgs) {
      $rows = @($msgs.FindAll($Scope::Descendants, $cItem) | ForEach-Object { ($_.Current.Name -replace '\s+', ' ').Trim() } | Where-Object { $_ })
      foreach ($r in @($rows | Select-Object -Last 15)) { [void]$sb.AppendLine($r) }
    } else { [void]$sb.AppendLine("(내용을 읽지 못함)") }
    [void]$sb.AppendLine(); $read++
  }
  if ($fresh -eq 0) { break }
  $p = $null
  if ($lv.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern, [ref]$p)) {
    if ($p.Current.VerticalScrollPercent -ge 99.5) { break }
    $p.Scroll([System.Windows.Automation.ScrollAmount]::NoAmount, [System.Windows.Automation.ScrollAmount]::LargeIncrement); Start-Sleep -Seconds 1
    if ($SinceDate) { Start-Sleep -Seconds 1 }
  } else { break }
}
Finish "연결 상태: $state / 대화 $read 개 읽음$(if($SinceDate){" ($Since 이후 전체)"}else{" (안 읽은 대화)"}) / 광고 $ads 개 건너뜀 / 살펴본 대화 $($done.Count)개"

# 사용자가 고른 메신저의 창에 보이는 글자를 읽어 txt로 저장한다. 어떤 메신저든 같은 방법으로 읽는다. AI를 쓰지 않는다.
# 창의 글자를 먼저 읽고, 잘 안 잡히면 그 창만 찍어 윈도우 글자 인식으로 읽는다. 아무것도 누르거나 입력하지 않는다.
param([string]$Apps = "")
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Drawing, System.Runtime.WindowsRuntime
Add-Type @"
using System; using System.Runtime.InteropServices;
public class OM {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
}
"@
[OM]::SetProcessDPIAware() | Out-Null
. (Join-Path $PSScriptRoot "공통.ps1")
if (-not $Apps -and (Test-Path -LiteralPath $RB.cfg)) { $Apps = [string](Get-Content -LiteralPath $RB.cfg -Raw -Encoding UTF8 | ConvertFrom-Json).otherApps }
$Out = Join-Path $RB.work "기타메신저.txt"
$AE = [System.Windows.Automation.AutomationElement]; $Sc = [System.Windows.Automation.TreeScope]; $All = [System.Windows.Automation.Condition]::TrueCondition
$sb = New-Object System.Text.StringBuilder; $notes = New-Object System.Collections.ArrayList

$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait() | Out-Null; $t.Result }
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.DataWriter, Windows.Foundation, ContentType = WindowsRuntime]
$ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()

# 그 창만 찍어 글자를 읽는다. 다른 창에 가려져 있어도 다른 창의 글자를 읽지 않는다.
function OcrWindow($h) {
  $r = New-Object OM+RECT; [OM]::GetWindowRect($h, [ref]$r) | Out-Null
  $w = $r.R - $r.L; $hh = $r.B - $r.T; if ($w -lt 60 -or $hh -lt 60) { return @() }
  $Up = 2
  $s = New-Object System.Drawing.Bitmap $w, $hh; $g = [System.Drawing.Graphics]::FromImage($s); $dc = $g.GetHdc(); [OM]::PrintWindow($h, $dc, 2) | Out-Null; $g.ReleaseHdc($dc); $g.Dispose()
  $big = New-Object System.Drawing.Bitmap ($w * $Up), ($hh * $Up); $g = [System.Drawing.Graphics]::FromImage($big); $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $g.DrawImage($s, 0, 0, $big.Width, $big.Height); $g.Dispose(); $s.Dispose()
  $ms = New-Object System.IO.MemoryStream; $big.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $big.Dispose()
  $st = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new(); $dw = [Windows.Storage.Streams.DataWriter]::new($st)
  $dw.WriteBytes($ms.ToArray()); Await ($dw.StoreAsync()) ([uint32]) | Out-Null; $st.Seek(0); $ms.Dispose()
  $dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($st)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bm = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $res = Await ($ocr.RecognizeAsync($bm)) ([Windows.Media.Ocr.OcrResult])
  @($res.Lines | ForEach-Object {
    $ws = @($_.Words); $t = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $ws.Count; $i++) { if ($i) { $gap = $ws[$i].BoundingRect.X - ($ws[$i - 1].BoundingRect.X + $ws[$i - 1].BoundingRect.Width); if ($gap -gt ($ws[$i].BoundingRect.Height * 0.45)) { [void]$t.Append(" ") } }; [void]$t.Append($ws[$i].Text) }
    $t.ToString() } | Where-Object { $_.Length -ge 2 })
}
# 창의 글자: 메뉴·버튼 이름은 빼고 목록과 본문 글자만 모은다
function UiaLines($w) {
  $keep = "ControlType.Text", "ControlType.ListItem", "ControlType.DataItem", "ControlType.Document", "ControlType.TreeItem", "ControlType.Edit", "ControlType.Pane"
  $seen = @{}; $out = New-Object System.Collections.ArrayList
  foreach ($round in 1, 2) {   # 웹 기반 메신저는 처음 물어볼 때 글자를 준비하므로 두 번 읽는다
    foreach ($e in @($w.FindAll($Sc::Descendants, $All))) {
      $c = $e.Current; if ($keep -notcontains $c.ControlType.ProgrammaticName) { continue }
      if ($c.ClassName -match '^(Button|Chrome_|Intermediate|Afx|USkin|Ultari|UList)') { continue }
      $n = (([string]$c.Name) -replace '\s+', ' ').Trim(); if ($n.Length -lt 2 -or $seen.ContainsKey($n)) { continue }
      $seen[$n] = 1; [void]$out.Add($n)
    }
    if ($out.Count -ge 5) { break }; Start-Sleep -Seconds 2
  }
  ,$out
}
function ReadApp($name) {
  $a = Get-StartApps | Where-Object { $_.Name -eq $name } | Select-Object -First 1
  if (-not $a) { $a = Get-StartApps | Where-Object { $_.Name -like "*$name*" -and $_.Name -notmatch '제거|Uninstall|설치' } | Select-Object -First 1 }
  # 켜져 있는 창을 이름으로 먼저 찾고, 없으면 앱을 켠다
  $find = {
    $exe = if ($a -and $a.AppID -match '([^\\]+)\.exe$') { $Matches[1] } else { "" }
    $launcher = @("launcher", "update", "setup")
    $ids = if ($exe -and $launcher -notcontains $exe.ToLower()) { @(Get-Process -Name $exe -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }) } else { @() }
    @($AE::RootElement.FindAll($Sc::Children, $All) | Where-Object { $_.Current.Name -and (($ids -contains $_.Current.ProcessId) -or $_.Current.Name -like "*$name*") }) | Sort-Object { -([string]$_.Current.Name -like "*$name*") } | Select-Object -First 1
  }
  $w = & $find
  if (-not $w) {
    if (-not $a) { return "${name}: 설치된 앱에서 찾지 못함" }
    Start-Process explorer.exe ("shell:AppsFolder\" + $a.AppID)
    for ($i = 0; $i -lt 25 -and -not $w; $i++) { Start-Sleep -Seconds 1; $w = & $find }
    Start-Sleep -Seconds 4; if ($w) { $w = & $find }
  }
  if (-not $w) { return "${name}: 창을 찾지 못함 (로그인이 필요하거나 트레이에 숨어 있을 수 있음)" }
  $h = [IntPtr]$w.Current.NativeWindowHandle
  $wasMin = [OM]::IsIconic($h) -or -not [OM]::IsWindowVisible($h)
  if ($wasMin) { [OM]::ShowWindow($h, 4) | Out-Null; Start-Sleep -Seconds 2 }   # 앞으로 가져오지 않고 펼친다
  $lines = UiaLines $w; $how = "창 글자"
  if ((($lines | ForEach-Object { $_.Length } | Measure-Object -Sum).Sum) -lt 80) { $lines = @(OcrWindow $h); $how = "글자 인식" }
  if ($wasMin) { [OM]::ShowWindow($h, 6) | Out-Null }
  if (-not @($lines).Count) { return "${name}: 읽을 글자가 없음" }
  [void]$sb.AppendLine("=== $name ($how) ===")
  foreach ($l in $lines) { [void]$sb.AppendLine($l) }
  [void]$sb.AppendLine()
  return "$name $(@($lines).Count)줄 ($how)"
}
foreach ($n in @($Apps -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })) {
  try { [void]$notes.Add((ReadApp $n)) } catch { [void]$notes.Add("${n}: 읽기 실패 " + $_.Exception.Message) }
}
if (-not $notes.Count) { [void]$notes.Add("고른 메신저 없음") }
$note = $notes -join " / "
$head = "다른 메신저 창에 보이는 글자 (뽑은 시각 {0})`r`n{1}`r`n`r`n" -f (Get-Date -Format "yyyy-MM-dd HH:mm"), $note
$text = $head + $sb.ToString(); if ($text.Length -gt 60000) { $text = $text.Substring(0, 60000) }
[IO.File]::WriteAllText($Out, $text, [Text.UTF8Encoding]::new($false))
$note

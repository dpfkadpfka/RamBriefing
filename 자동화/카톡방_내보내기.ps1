param([string]$OutDir, [string]$ResultFile, [int]$MaxRooms = 0, [int]$Days = 1, [string]$StopFile = "", [string[]]$Only = @())
# RamTalk: 카톡 PC 단톡방 대화를 자동으로 내보내기(Ctrl+S) 하는 스크립트
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms, System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text; using System.Collections.Generic;
public class W32 {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  public static List<string[]> List() {
    var r = new List<string[]>();
    EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p);
      var t = new StringBuilder(512); GetWindowText(h, t, 512); var c = new StringBuilder(256); GetClassName(h, c, 256);
      r.Add(new string[] { h.ToInt64().ToString(), p.ToString(), t.ToString(), c.ToString(), IsWindowVisible(h) ? "1" : "0" }); return true; }, IntPtr.Zero);
    return r; }
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte sc, uint f, UIntPtr e);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  // Alt 키를 누르지 않고 앞으로 가져오기 (Alt를 누르면 카톡 창이 메뉴 모드가 돼서 다음 단축키가 씹힘)
  public static void Fg(IntPtr h) {
    if (IsIconic(h) || !IsWindowVisible(h)) ShowWindow(h, 9);
    IntPtr f = GetForegroundWindow(); if (f == h) return;
    uint p; uint ft = GetWindowThreadProcessId(f, out p); uint me = GetCurrentThreadId();
    if (ft != me) AttachThreadInput(me, ft, true);
    BringWindowToTop(h); SetForegroundWindow(h);
    if (ft != me) AttachThreadInput(me, ft, false);
    if (GetForegroundWindow() != h) { keybd_event(0x12,0,0,UIntPtr.Zero); SetForegroundWindow(h); keybd_event(0x12,0,2,UIntPtr.Zero); keybd_event(0x12,0,0,UIntPtr.Zero); keybd_event(0x12,0,2,UIntPtr.Zero); }
  }
  public static void CtrlKey(byte k) { keybd_event(0x11,0,0,UIntPtr.Zero); keybd_event(k,0,0,UIntPtr.Zero); System.Threading.Thread.Sleep(60); keybd_event(k,0,2,UIntPtr.Zero); keybd_event(0x11,0,2,UIntPtr.Zero); }
  public static void CtrlS() { keybd_event(0x11,0,0,UIntPtr.Zero); keybd_event(0x53,0,0,UIntPtr.Zero); System.Threading.Thread.Sleep(60); keybd_event(0x53,0,2,UIntPtr.Zero); keybd_event(0x11,0,2,UIntPtr.Zero); }
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc f, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public static IntPtr Child(IntPtr dlg, int id, string cls) { IntPtr found = IntPtr.Zero;
    EnumChildWindows(dlg, (h, l) => { var c = new StringBuilder(64); GetClassName(h, c, 64);
      if ((id <= 0 || GetDlgCtrlID(h) == id) && (cls == null || c.ToString() == cls)) { found = h; return false; } return true; }, IntPtr.Zero);
    return found; }
  // 저장 창: 파일 이름 칸(Edit, 1001 또는 ComboBox 안 Edit)에 경로 넣고 [저장](1) 누르기 — 마우스·키보드 없이 즉시
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, StringBuilder l);
  static string TextOf(IntPtr h) { var b = new StringBuilder(1024); SendMessage(h, 0x000D, (IntPtr)1024, b); return b.ToString(); }   // WM_GETTEXT
  // 저장 창: [파일 이름] 칸에 전체 경로를 넣고 들어갔는지 확인한 뒤 [저장](1) 누르기
  // 파일 이름 칸은 FileNameControlHost(1148) 안의 Edit(1001) — 다른 칸에 잘못 넣지 않도록 이것부터 찾음
  public static bool SaveAs(IntPtr dlg, string path) {
    IntPtr edit = IntPtr.Zero;
    IntPtr host = Child(dlg, 1148, null);
    if (host != IntPtr.Zero) { edit = Child(host, 1001, "Edit"); if (edit == IntPtr.Zero) edit = Child(host, 0, "Edit"); }
    if (edit == IntPtr.Zero) edit = Child(dlg, 1001, "Edit");
    if (edit == IntPtr.Zero) return false;
    SendMessage(edit, 0x000C, IntPtr.Zero, path);            // WM_SETTEXT
    System.Threading.Thread.Sleep(120);
    if (TextOf(edit) != path) return false;
    IntPtr ok = Child(dlg, 1, "Button"); if (ok == IntPtr.Zero) return false;
    SendMessage(ok, 0x00F5, IntPtr.Zero, IntPtr.Zero);        // BM_CLICK
    return true; }
  public static void Click(int x, int y) { SetCursorPos(x, y); mouse_event(2,0,0,0,UIntPtr.Zero); mouse_event(4,0,0,0,UIntPtr.Zero); }
  public static void DClick(int x, int y) { Click(x, y); System.Threading.Thread.Sleep(80); Click(x, y); }
}
"@
$AE = [System.Windows.Automation.AutomationElement]
$TS = [System.Windows.Automation.TreeScope]
$result = @{ saved = @(); errors = @() }
$script:dbg = @()
function Save { $result.debug = $script:dbg; $result | ConvertTo-Json -Depth 4 | Out-File $ResultFile -Encoding utf8 }
function Done {
  Save
  if ($script:hideAfter) { $m = MainWin; if ($m) { [W32]::PostMessage([IntPtr][long]$m[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null } }   # 처음에 안 보였으면 다시 숨긴다
  exit
}
function Stopped { return ($StopFile -and (Test-Path $StopFile)) }


. (Join-Path $PSScriptRoot "공통.ps1")
$kakao = Get-Process KakaoTalk -ErrorAction SilentlyContinue; $startedByUs = $false
if (-not $kakao) {   # 꺼져 있으면 윈도우 앱 목록에서 찾아 켠다 (작업 표시줄에 없어도 됨)
  if (Start-Kakao) { $startedByUs = $true; for ($i = 0; $i -lt 40 -and -not $kakao; $i++) { Start-Sleep -Milliseconds 500; $kakao = Get-Process KakaoTalk -ErrorAction SilentlyContinue } }
}
if (-not $kakao) { $result.errors += @{ room = ""; msg = "카카오톡 PC를 켜지 못했어요" }; Done }
$pids = @($kakao | ForEach-Object { $_.Id })
function KWins { [W32]::List() | Where-Object { $pids -contains [int]$_[1] -and $_[4] -eq "1" } }
function FindRoom($name) {
  $ws = @(KWins | Where-Object { $_[3] -ne "#32770" -and $_[2] -ne "카카오톡" -and $_[2] -ne "통합검색" -and $_[2] })
  $hit = $ws | Where-Object { $_[2] -eq $name } | Select-Object -First 1
  if (-not $hit) { $hit = $ws | Where-Object { $_[2].Contains($name) } | Select-Object -First 1 }
  if ($hit) { return ,$hit }
}
# 저장된 파일 찾기: 정한 이름이 있으면 그것, 없으면 저장 폴더에서 이번에 새로 생긴 txt
function FindOut($p, $since) {
  if (Test-Path -LiteralPath $p) { return (Get-Item -LiteralPath $p) }
  Get-ChildItem -LiteralPath $OutDir -Filter *.txt -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $since.AddSeconds(-5) } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
# 완료 창의 [확인] 버튼이 노란색으로 바뀌었는지 화면 색으로 확인 → 노란 버튼 가운데 좌표를 돌려줌
function YellowOk($wh) {
  $r = New-Object W32+RECT; [W32]::GetWindowRect([IntPtr][long]$wh, [ref]$r) | Out-Null
  $w = $r.R - $r.L; $hh = $r.B - $r.T; if ($w -lt 40 -or $hh -lt 40) { return $null }
  $y0 = [int]($hh * 0.62); $bh = $hh - $y0
  try {
    $bmp = New-Object System.Drawing.Bitmap $w, $bh
    $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($r.L, $r.T + $y0, 0, 0, $bmp.Size); $g.Dispose()
    $n = 0; $sx = 0; $sy = 0
    for ($y = 0; $y -lt $bh; $y += 2) { for ($x = [int]($w * 0.45); $x -lt $w; $x += 2) {
      $c = $bmp.GetPixel($x, $y); if ($c.R -gt 225 -and $c.G -gt 190 -and $c.B -lt 90) { $n++; $sx += $x; $sy += $y } } }
    $bmp.Dispose()
    if ($n -ge 30) { return @([int]($r.L + $sx / $n), [int]($r.T + $y0 + $sy / $n)) }
  } catch {}
  return $null
}
function Focus($h) { [W32]::Fg($h); Start-Sleep -Milliseconds 200 }
# 주의: 카톡 메인 창에서 Ctrl+A는 '친구 추가'라서 쓰지 않음 (End → Shift+Home 으로 지우기)
function Paste($text) { [System.Windows.Forms.Clipboard]::SetText($text); [System.Windows.Forms.SendKeys]::SendWait("{END}+{HOME}{BACKSPACE}"); Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait("^v") }

# 방이 안 열려 있으면 (카톡 PC에서 직접 확인한 순서)
#  1) 메인 창(숨어 있으면 꺼내기) → 왼쪽 채팅 아이콘
#  2) Ctrl+F(검색칸 열고 커서) → 방 이름 붙여넣기
#  3) 검색칸의 [통합검색] → [채팅] 탭(일반+오픈채팅 모두 나옴) → 첫 결과 더블클릭
# 좌표는 100% 배율 기준, DPI 인식 상태에서 창 위치(실제 픽셀) × 배율로 계산
[W32]::SetProcessDPIAware() | Out-Null
function MainWin {
  $all = @([W32]::List() | Where-Object { $pids -contains [int]$_[1] -and $_[2] -eq "카카오톡" -and $_[3] -like "EVA_Window*" })
  $v = $all | Where-Object { $_[4] -eq "1" } | Select-Object -First 1
  if ($v) { return $v }; return ($all | Select-Object -First 1)
}
function MainFocus {
  $m = MainWin; if (-not $m) { return $null }
  $h = [IntPtr][long]$m[0]; [W32]::ShowWindow($h, 9) | Out-Null; Start-Sleep -Milliseconds 150; Focus $h
  if ([W32]::GetForegroundWindow() -ne $h) { return $null }; return $h
}
function Scale($h) { $s = [W32]::GetDpiForWindow($h) / 96.0; if ($s -le 0) { $s = 1 }; return $s }
function ClickIn($h, $rx, $ry, [switch]$FromRight, [switch]$Double) {
  $r = New-Object W32+RECT; [W32]::GetWindowRect($h, [ref]$r) | Out-Null; $s = Scale $h
  $x = if ($FromRight) { [int]($r.R - $rx * $s) } else { [int]($r.L + $rx * $s) }; $y = [int]($r.T + $ry * $s)
  $script:dbg += ("click {0},{1} -> {2},{3} (창 {4},{5},{6},{7} 배율 {8})" -f $rx, $ry, $x, $y, $r.L, $r.T, $r.R, $r.B, $s)
  if ($x -le $r.L -or $x -ge $r.R -or $y -le $r.T -or $y -ge $r.B) { return $false }
  if ($Double) { [W32]::DClick($x, $y) } else { [W32]::Click($x, $y) }
  Start-Sleep -Milliseconds 350; return $true
}
function ClickFrac($h, $fx, $fy, [switch]$Double) {
  $r = New-Object W32+RECT; [W32]::GetWindowRect($h, [ref]$r) | Out-Null
  $x = [int]($r.L + ($r.R - $r.L) * $fx); $y = [int]($r.T + ($r.B - $r.T) * $fy)
  $script:dbg += ("frac {0},{1} -> {2},{3}" -f $fx, $fy, $x, $y)
  if ($Double) { [W32]::DClick($x, $y) } else { [W32]::Click($x, $y) }
  Start-Sleep -Milliseconds 400
}
# 방 창이 뜰 때까지 기다리기 — 제목에 방 이름이 들어 있는 창만 인정 (다른 방·개인톡은 절대 저장 안 함)
function WaitRoom($name, $n = 24) {
  for ($i = 0; $i -lt $n; $i++) {
    Start-Sleep -Milliseconds 250
    $w = FindRoom $name; if ($w) { $script:dbg += "방 찾음: " + $w[2]; return ,$w }
  }
  return $null
}
# 엉뚱하게 열린 창(다른 방, 친구 추가 등)은 닫기
function CloseStray($known, $name, $keep) {
  foreach ($w in @(KWins | Where-Object { $known -notcontains $_[0] -and $_[2] -ne "카카오톡" -and $_[0] -ne $keep -and -not ($_[2] -and $_[2].Contains($name)) })) {
    [W32]::PostMessage([IntPtr][long]$w[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null }
}
# ===== 여기부터 아침 자동화 부분: 목록에서 방을 열고 Ctrl+S (람그룹톡의 저장 순서를 그대로 사용, 검색 없음) =====
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class WH {
  public delegate bool P(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, P f, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, int d, UIntPtr e);
  public static IntPtr List(IntPtr m){IntPtr f=IntPtr.Zero;EnumChildWindows(m,(h,l)=>{var c=new StringBuilder(64);GetClassName(h,c,64);if(IsWindowVisible(h)&&c.ToString()=="EVA_VH_ListControl_Dblclk"){f=h;return false;}return true;},IntPtr.Zero);return f;}
  public static void Wheel(int x,int y,int d){SetCursorPos(x,y);mouse_event(0x0800,0,0,d,UIntPtr.Zero);}
}
"@
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait() | Out-Null; $t.Result }
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.DataWriter, Windows.Foundation, ContentType = WindowsRuntime]
$ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
function Read-Dates($q) {
  # 목록 오른쪽의 시각·날짜만 윈도우 내장 글자 인식으로 읽음 (AI 사용 없음, 화면은 PC 밖으로 안 나감)
  $lw = $q.R - $q.L; $lh = $q.B - $q.T; $Up = 3
  $bmp = New-Object System.Drawing.Bitmap $lw, $lh
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($q.L, $q.T, 0, 0, $bmp.Size); $g.Dispose()
  $big = New-Object System.Drawing.Bitmap ($lw * $Up), ($lh * $Up)
  $g = [System.Drawing.Graphics]::FromImage($big); $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($bmp, 0, 0, $big.Width, $big.Height); $g.Dispose(); $bmp.Dispose()
  $ms = New-Object System.IO.MemoryStream; $big.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $big.Dispose()
  $st = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new(); $w = [Windows.Storage.Streams.DataWriter]::new($st)
  $w.WriteBytes($ms.ToArray()); Await ($w.StoreAsync()) ([uint32]) | Out-Null; $st.Seek(0); $ms.Dispose()
  $dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($st)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $sb = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $res = Await ($ocr.RecognizeAsync($sb)) ([Windows.Media.Ocr.OcrResult])
  $today = (Get-Date).Date; $out = @()
  foreach ($ln in $res.Lines) {
    $ws = @($ln.Words); if (($ws[0].BoundingRect.X / $Up) -le ($lw * 0.76)) { continue }
    $s = (($ws | ForEach-Object { $_.Text }) -join "") -replace '\s', ''; $d = $null
    if ($s -match '오전|오후') { $d = $today } elseif ($s -match '어제') { $d = $today.AddDays(-1) }
    elseif ($s -match '(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})') { try { $d = [datetime]::new([int]$Matches[1], [int]$Matches[2], [int]$Matches[3]) } catch {} }
    if ($d) { $out += [pscustomobject]@{ Y = [int]($ws[0].BoundingRect.Y / $Up); Date = $d } }
  }
  return @($out | Sort-Object Y)
}
# 카톡이 정한 이름으로 저장해도 찾도록: 정한 이름 파일, 없으면 폴더의 새 txt (이미 번호를 붙인 파일은 제외)
function FindNew($p) {
  if (Test-Path -LiteralPath $p) { return (Get-Item -LiteralPath $p) }
  Get-ChildItem -LiteralPath $OutDir -Filter *.txt -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch '^\d{3}_' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $dl = Join-Path $HOME "Downloads"
  Get-ChildItem -LiteralPath $dl -Filter "KakaoTalk*.txt" -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $script:roomT0 } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
function Export-Room($hit, $name, $idx) {
  $script:roomT0 = (Get-Date).AddSeconds(-2)
  $h = [IntPtr][long]$hit[0]; Focus $h
  $before = @(KWins | ForEach-Object { $_[0] })
  $r = New-Object W32+RECT; [W32]::GetWindowRect($h, [ref]$r) | Out-Null
  $dlg = $null
  # 대화 내용(사진·링크)을 누르지 않도록 방 위쪽 빈 곳 → 입력칸(글자 입력 없음) → 원래 위치 순서로 시도
  foreach ($fy in @(0.03, 0.93, 0.35)) {
    if ($dlg) { break }
    Focus $h; [W32]::Click([int](($r.L + $r.R) / 2), [int]($r.T + ($r.B - $r.T) * $fy)); Start-Sleep -Milliseconds 300
    Focus $h; [W32]::CtrlS()
    for ($i = 0; $i -lt 30 -and -not $dlg; $i++) { Start-Sleep -Milliseconds 100; $d = KWins | Where-Object { $_[3] -eq "#32770" } | Select-Object -First 1; if ($d) { $dlg = $d } }
    if (-not $dlg) {
      $script:dbg += "저장 창 없음($fy): " + $name
      foreach ($w in @(KWins | Where-Object { $before -notcontains $_[0] -and $_[3] -like "EVA_Window*" })) { $script:dbg += "잘못 열린 창 닫음: " + $w[3]; [W32]::PostMessage([IntPtr][long]$w[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null; Start-Sleep -Milliseconds 300 }
    }
  }
  if (-not $dlg) { $result.errors += @{ room = $name; msg = "저장 창이 뜨지 않았어요" }; return }
  $safe = ($name -replace '[\\/:*?"<>|]', '_')
  $path = Join-Path $OutDir ("{0:d3}_{1}.txt" -f $idx, $safe)
  $dh = [IntPtr][long]$dlg[0]; $script:dbg += "저장 창: " + $dlg[2]
  # 경로는 저장 창 칸에 직접 넣는다. 실패해도 키보드로 치지 않는다 (대화 입력칸에 글자가 들어가는 일을 막기 위해)
  if (-not [W32]::SaveAs($dh, $path)) { $result.errors += @{ room = $name; msg = "저장 창 이름칸에 넣지 못했어요" }; [W32]::PostMessage($dh, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null; return }
  $last = -1; $same = 0; $t0 = Get-Date
  while (((Get-Date) - $t0).TotalSeconds -lt 240) {
    Start-Sleep -Milliseconds 250
    $pop = @(KWins | Where-Object { $before -notcontains $_[0] -and $_[3] -eq "EVA_Window_Dblclk" })
    $fo = FindNew $path; $size = if ($fo) { $fo.Length } else { -1 }
    if ($size -gt 0 -and $size -eq $last) { $same++ } else { $same = 0 }; $last = $size
    $ok = $null; foreach ($pw in $pop) { $ok = YellowOk $pw[0]; if ($ok) { break } }
    if ($ok) { Start-Sleep -Milliseconds 200; [W32]::Click($ok[0], $ok[1]); $script:dbg += "노란 확인 클릭"; for ($k = 0; $k -lt 40 -and -not (FindNew $path); $k++) { Start-Sleep -Milliseconds 150 }; break }
    if ($same -ge 8) { break }
    if ($size -lt 0 -and -not $pop.Count -and ((Get-Date) - $t0).TotalSeconds -gt 45) { $script:dbg += "45초 동안 저장 안 됨: " + $name; break }
  }
  Start-Sleep -Milliseconds 300
  foreach ($w in @(KWins | Where-Object { $before -notcontains $_[0] -and $_[3] -eq "EVA_Window_Dblclk" })) { [W32]::PostMessage([IntPtr][long]$w[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null }
  foreach ($w in @(KWins | Where-Object { $_[3] -eq "#32770" })) { [W32]::PostMessage([IntPtr][long]$w[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null }
  $fo = FindNew $path
  if ($fo) { if ($fo.FullName -ne $path) { Move-Item -LiteralPath $fo.FullName -Destination $path -Force }; $result.saved += @{ room = $name; path = $path } }
  else { $result.errors += @{ room = $name; msg = "저장이 끝나지 않았어요" } }
}

# '대화내용을 불러오는 중' 창은 방이 아니다. 뜨는 동안에는 방이 열릴 때까지 더 기다린다
function Loading { @(KWins | Where-Object { $_[2] -like "대화내용*" }).Count -gt 0 }
function NewRoom($known, $secs) {
  $t = Get-Date
  while (((Get-Date) - $t).TotalSeconds -lt $secs) {
    Start-Sleep -Milliseconds 250
    $n = KWins | Where-Object { $known -notcontains $_[0] -and $_[3] -like "EVA_Window*" -and $_[2] -and $_[2] -ne "카카오톡" -and $_[2] -ne "통합검색" -and $_[2] -notlike "KakaoTalk*" -and $_[2] -notlike "대화내용*" } | Select-Object -First 1
    if ($n) { return ,$n }
    if (Loading) { $secs = 90 }
  }
  return $null
}
function CloseNew($known) { foreach ($x in @(KWins | Where-Object { $known -notcontains $_[0] -and $_[3] -like "EVA_Window*" -and $_[2] -and $_[2] -ne "카카오톡" })) { [W32]::PostMessage([IntPtr][long]$x[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null; Start-Sleep -Milliseconds 150 } }   # 이 방 때문에 열린 창을 남기지 않는다
$cut = (Get-Date).Date.AddDays(-$Days)
$Only = @($Only | ForEach-Object { $_ -split "," } | Where-Object { $_ })
for ($i = 0; $i -lt 30 -and -not (MainWin); $i++) { Start-Sleep -Seconds 1 }   # 방금 켰으면 목록 창이 생길 때까지 기다린다
$wantHide = $startedByUs -or -not @(KWins | Where-Object { $_[2] -eq "카카오톡" -and $_[3] -like "EVA_Window*" }).Count
function LoginPopup { @(KWins | Where-Object { $_[3] -eq "EVA_Window_Dblclk" -and -not $_[2] }).Count -gt 0 }   # 로그인 중에 뜨는 제목 없는 안내창 ('다른 기기에서 로그인 중' 등)
# 시작 전에 열려 있는 방·검색 창 닫기 (목록 창은 그대로)
foreach ($w in @(KWins | Where-Object { $_[3] -like "EVA_Window*" -and $_[2] -and $_[2] -ne "카카오톡" -and $_[2] -notlike "KakaoTalk*" })) { [W32]::PostMessage([IntPtr][long]$w[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null; Start-Sleep -Milliseconds 150 }
# '다른 기기에서 로그인 중' 안내창인지 글자로 확인한 뒤 [확인]을 눌러 이 컴퓨터로 가져온다 (글자가 다르면 누르지 않는다)
function PopupText($pw) {
  $r = New-Object W32+RECT; [W32]::GetWindowRect([IntPtr][long]$pw[0], [ref]$r) | Out-Null
  $w = $r.R - $r.L; $hh = $r.B - $r.T; if ($w -lt 40 -or $hh -lt 40) { return "" }
  $bmp = New-Object System.Drawing.Bitmap ($w * 3), ($hh * 3); $s1 = New-Object System.Drawing.Bitmap $w, $hh
  $g = [System.Drawing.Graphics]::FromImage($s1); $g.CopyFromScreen($r.L, $r.T, 0, 0, $s1.Size); $g.Dispose()
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $g.DrawImage($s1, 0, 0, $bmp.Width, $bmp.Height); $g.Dispose(); $s1.Dispose()
  $ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  $st = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new(); $dw = [Windows.Storage.Streams.DataWriter]::new($st)
  $dw.WriteBytes($ms.ToArray()); Await ($dw.StoreAsync()) ([uint32]) | Out-Null; $st.Seek(0); $ms.Dispose()
  $dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($st)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $sb = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  return ((Await ($ocr.RecognizeAsync($sb)) ([Windows.Media.Ocr.OcrResult])).Text -replace '\s', '')
}
$lh = [IntPtr]::Zero; $h = $null; $esc = $false; $popup = $false; $taken = $false
for ($try = 0; $try -lt 25 -and $lh -eq [IntPtr]::Zero; $try++) {   # 자동 로그인이 끝날 때까지 기다린다
  if (-not $taken) {
    $pw = @(KWins | Where-Object { $_[3] -eq "EVA_Window_Dblclk" -and -not $_[2] }) | Select-Object -First 1
    if ($pw) {
      Focus ([IntPtr][long]$pw[0]); Start-Sleep -Milliseconds 300
      $txt = PopupText $pw; $script:dbg += "안내창 글자 길이: " + $txt.Length
      if ($txt -match '다른기기|강제로그아웃') { ClickFrac ([IntPtr][long]$pw[0]) 0.25 0.88; $taken = $true; $script:dbg += "다른 기기 안내창 확인 누름"; Start-Sleep -Seconds 3; continue }
    }
  }
  $h2 = MainFocus
  if ($h2) {
    $h = $h2
    if (-not $esc -and -not (LoginPopup)) { $esc = $true; [System.Windows.Forms.SendKeys]::SendWait("{ESC}"); Start-Sleep -Milliseconds 400; $h2 = MainFocus; if ($h2) { $h = $h2 } }   # 남아 있는 검색칸 닫기
    ClickIn $h 38 118 | Out-Null; Start-Sleep -Milliseconds 400; $lh = [WH]::List($h)
  }
  if ($lh -eq [IntPtr]::Zero) {
    $popup = LoginPopup; if ($popup -and $try -ge 2) { break }   # 안내창은 저절로 닫히지 않으므로 더 기다리지 않는다. 누르지도 않는다
    Start-Sleep -Seconds 3
  }
}
if ($lh -eq [IntPtr]::Zero) {
  $why = if ($popup) { "카톡 안내창이 떠 있어 넘어가지 못했어요. 카톡 창을 확인해 주세요" } elseif ($h) { "카톡 로그인이 필요해요 (채팅 목록을 찾지 못했어요)" } else { "카카오톡 목록 창을 앞으로 가져오지 못했어요" }
  $result.errors += @{ room = ""; msg = $why }; Done
}
$script:hideAfter = $wantHide
$q = New-Object W32+RECT; [W32]::GetWindowRect($lh, [ref]$q) | Out-Null
$cx = [int](($q.L + $q.R) / 2); $cy = [int](($q.T + $q.B) / 2)
$seen = @{}; $idx = 0; $t00 = Get-Date
foreach ($tab in @(@("채팅", 98), @("오픈채팅", 182))) {
$h = MainFocus; if (-not $h) { break }
ClickIn $h $tab[1] 55 | Out-Null; Start-Sleep -Milliseconds 700      # 위쪽 탭
$lh = [WH]::List($h); if ($lh -eq [IntPtr]::Zero) { $result.errors += @{ room = $tab[0]; msg = "목록을 찾지 못했어요" }; continue }
[W32]::GetWindowRect($lh, [ref]$q) | Out-Null
$cx = [int](($q.L + $q.R) / 2); $cy = [int](($q.T + $q.B) / 2)
[WH]::Wheel($cx, $cy, 120 * 60); Start-Sleep -Milliseconds 700
$old = 0; $prev = ""; $stop = $false; $script:dbg += "탭: " + $tab[0]
for ($page = 0; $page -lt 80 -and -not $stop; $page++) {
  if (-not (MainFocus)) { break }
  Start-Sleep -Milliseconds 300
  $marks = @(Read-Dates $q)
  for ($k = 0; $k -lt 5 -and -not $marks.Count; $k++) { Start-Sleep -Seconds 1; MainFocus | Out-Null; Start-Sleep -Milliseconds 300; $marks = @(Read-Dates $q); $script:dbg += "날짜 다시 읽기 $k : $($marks.Count)" }   # 화면이 늦게 그려져도 탭을 건너뛰지 않는다
  $script:dbg += "page $page marks $($marks.Count) list $($q.L),$($q.T),$($q.R),$($q.B) main " + (MainWin -join "/")
  $sig = ($marks | ForEach-Object { "$($_.Y)$($_.Date)" }) -join "|"; if ($sig -eq $prev) { break }; $prev = $sig
  foreach ($m in $marks) {
    if (Stopped -or ((Get-Date) - $t00).TotalMinutes -gt 90) { $stop = $true; break }
    if ($m.Date -lt $cut) { $old++; if ($old -ge 4) { $stop = $true; break }; continue }   # 고정된 옛날 방은 건너뜀
    $old = 0
    $y = $q.T + $m.Y + 16; if ($y -gt ($q.B - 24)) { continue }   # 잘린 줄은 다음 화면에서
    if ($MaxRooms -gt 0 -and $idx -ge $MaxRooms) { $stop = $true; break }
    try {
      if (-not (MainFocus)) { continue }
      $known = @(KWins | ForEach-Object { $_[0] })
      [W32]::DClick($cx, $y)
      $w = NewRoom $known 6
      if (-not $w) { if (MainFocus) { Start-Sleep -Milliseconds 300; [W32]::DClick($cx, $y); $w = NewRoom $known 4 } }
      if (-not $w) { $result.errors += @{ room = "목록 위치 $y"; msg = "방이 열리지 않았어요" }; $script:dbg += "no room at y=$y fg=" + [W32]::GetForegroundWindow() + " wins=" + ((KWins | ForEach-Object { $_[3] + ":" + $_[2].Length }) -join ","); CloseNew $known; continue }
      $t1 = Get-Date; while ((Loading) -and ((Get-Date) - $t1).TotalSeconds -lt 90) { Start-Sleep -Milliseconds 500 }   # 큰 방은 대화를 다 불러온 뒤 저장한다
      $key = $w[2] + "|" + $m.Date.ToString("yyyyMMdd")
      if ($seen.ContainsKey($key)) { [W32]::PostMessage([IntPtr][long]$w[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null; Start-Sleep -Milliseconds 300; continue }
      $seen[$key] = 1
      if ($Only.Count -and -not @($Only | Where-Object { $w[2].Contains($_) }).Count) { [W32]::PostMessage([IntPtr][long]$w[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null; Start-Sleep -Milliseconds 300; continue }
      $idx++
      Start-Sleep -Milliseconds 900   # 방이 다 열릴 때까지
      $n0 = @($result.saved).Count; $e0 = @($result.errors).Count
      Export-Room $w $w[2] $idx
      if (@($result.saved).Count -eq $n0) {   # 같은 방에서 한 번 더
        $result.errors = @(@($result.errors) | Select-Object -First $e0); Start-Sleep -Milliseconds 500
        Export-Room $w $w[2] $idx
      }
      [W32]::PostMessage([IntPtr][long]$w[0], 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
      Start-Sleep -Milliseconds 400
      CloseNew $known
      Save
    } catch { $result.errors += @{ room = "$idx"; msg = $_.Exception.Message } }
  }
  if (-not $stop) { if (MainFocus) { [WH]::Wheel($cx, $cy, -120 * 5); Start-Sleep -Milliseconds 500 } }
}
}
if (MainFocus) { ClickIn (MainFocus) 98 55 | Out-Null }
Done
# 학교 메신저(브리티, GOE)의 받은 쪽지를 어제·오늘 것만 읽어 txt로 저장한다. AI를 쓰지 않는다.
# 쪽지를 열고 읽기만 한다. 답장·전달·삭제·쪽지 쓰기와 입력칸은 건드리지 않는다. 로그인 정보는 입력하지 않는다.
param([string]$Since = "", [string]$Apps = "brity,goe", [int]$Max = 60)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Drawing, System.Runtime.WindowsRuntime
Add-Type @"
using System; using System.Runtime.InteropServices;
public class SM {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, int d, UIntPtr e);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte sc, uint f, UIntPtr e);
  public static void Fg(IntPtr h) {
    if (IsIconic(h) || !IsWindowVisible(h)) ShowWindow(h, 9);
    IntPtr f = GetForegroundWindow(); if (f == h) return;
    uint p; uint ft = GetWindowThreadProcessId(f, out p); uint me = GetCurrentThreadId();
    if (ft != me) AttachThreadInput(me, ft, true);
    BringWindowToTop(h); SetForegroundWindow(h);
    if (ft != me) AttachThreadInput(me, ft, false);
    if (GetForegroundWindow() != h) { keybd_event(0x12,0,0,UIntPtr.Zero); SetForegroundWindow(h); keybd_event(0x12,0,2,UIntPtr.Zero); }
  }
  public static void Click(int x, int y) { SetCursorPos(x, y); mouse_event(2,0,0,0,UIntPtr.Zero); mouse_event(4,0,0,0,UIntPtr.Zero); }
  public static void Wheel(int x, int y, int d) { SetCursorPos(x, y); mouse_event(0x0800,0,0,d,UIntPtr.Zero); }
  public static void Enter() { keybd_event(0x0D,0,0,UIntPtr.Zero); keybd_event(0x0D,0,2,UIntPtr.Zero); }
  // 실제 마우스·키보드를 쓰지 않고 그 창에만 신호를 보낸다. 다른 창에 입력될 일이 없고 앞으로 가져오지 않아도 된다.
  [StructLayout(LayoutKind.Sequential)] public struct PT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool ScreenToClient(IntPtr h, ref PT p);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
  static IntPtr XY(IntPtr h, int sx, int sy) { var p = new PT { X = sx, Y = sy }; ScreenToClient(h, ref p); return (IntPtr)((p.Y << 16) | (p.X & 0xFFFF)); }
  public static void SClick(IntPtr h, int sx, int sy) { var l = XY(h, sx, sy); PostMessage(h, 0x0200, IntPtr.Zero, l); PostMessage(h, 0x0201, (IntPtr)1, l); PostMessage(h, 0x0202, IntPtr.Zero, l); }
  public static void SDbl(IntPtr h, int sx, int sy) { var l = XY(h, sx, sy); PostMessage(h, 0x0200, IntPtr.Zero, l); System.Threading.Thread.Sleep(60); PostMessage(h, 0x0201, (IntPtr)1, l); PostMessage(h, 0x0202, IntPtr.Zero, l); System.Threading.Thread.Sleep(60); PostMessage(h, 0x0203, (IntPtr)1, l); PostMessage(h, 0x0202, IntPtr.Zero, l); }
  public delegate bool EP(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EP f, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder s, int n);
  public static IntPtr Render(IntPtr m) { IntPtr r = IntPtr.Zero; EnumChildWindows(m, (h, l) => { var c = new System.Text.StringBuilder(64); GetClassName(h, c, 64); if (c.ToString() == "Chrome_RenderWidgetHostHWND") { r = h; return false; } return true; }, IntPtr.Zero); return r; }
  public static void SKey(IntPtr h, int vk) { PostMessage(h, 0x0100, (IntPtr)vk, (IntPtr)1); PostMessage(h, 0x0101, (IntPtr)vk, (IntPtr)unchecked((int)0xC0000001)); }
  public static void SWheel(IntPtr h, int sx, int sy, int d) { PostMessage(h, 0x020A, (IntPtr)(d << 16), (IntPtr)((sy << 16) | (sx & 0xFFFF))); }
  public static void SBtn(IntPtr h) { PostMessage(h, 0x00F5, IntPtr.Zero, IntPtr.Zero); }
  public static void SClose(IntPtr h) { PostMessage(h, 0x0010, IntPtr.Zero, IntPtr.Zero); }
}
"@
[SM]::SetProcessDPIAware() | Out-Null
. (Join-Path $PSScriptRoot "공통.ps1")
if (-not $Since) { $Since = (Get-Date).Date.AddDays(-1).ToString("yyyy-MM-dd") }
$SinceDate = [datetime]$Since
$picked = @($Apps -split "," | Where-Object { $_ })
$Out = Join-Path $RB.work "학교메신저.txt"
$AE = [System.Windows.Automation.AutomationElement]; $Sc = [System.Windows.Automation.TreeScope]; $All = [System.Windows.Automation.Condition]::TrueCondition
$PC = [System.Windows.Automation.PropertyCondition]; $sb = New-Object System.Text.StringBuilder; $notes = New-Object System.Collections.ArrayList
function Tops($ids) { @($AE::RootElement.FindAll($Sc::Children, $All) | Where-Object { $ids -contains $_.Current.ProcessId }) }
function Hwnd($e) { [IntPtr]$e.Current.NativeWindowHandle }
function StartApp($pattern) {
  $a = Get-StartApps | Where-Object { $_.Name -match $pattern } | Select-Object -First 1
  if ($a) { Start-Process explorer.exe ("shell:AppsFolder\" + $a.AppID); return $true }
  return $false
}
function Invoke-El($e) { $p = $null; if ($e.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { $p.Invoke(); return $true }; return $false }
function CloseWin($w) { $p = $null; if ($w.TryGetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern, [ref]$p)) { $p.Close() } }

# ===== 브리티: 글자가 그대로 잡혀 마우스 없이 읽는다 =====
function BrityDate($name) {
  $today = (Get-Date).Date
  if ($name -match '(오전|오후) \d{1,2}시( \d{1,2}분)?\s*$') { return $today }
  if ($name -match '어제\s*$') { return $today.AddDays(-1) }
  if ($name -match '(\d{4})년 (\d{1,2})월 (\d{1,2})일\s*$') { return [datetime]::new([int]$Matches[1], [int]$Matches[2], [int]$Matches[3]) }
  if ($name -match '(\d{1,2})월 (\d{1,2})일\s*$') { $d = [datetime]::new($today.Year, [int]$Matches[1], [int]$Matches[2]); if ($d -gt $today) { $d = $d.AddYears(-1) }; return $d }
  return $null
}
function ReadBrity {
  $ids = @(Get-Process BrityMessenger -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  if (-not $ids.Count) { if (-not (StartApp '^Brity Messenger$')) { return "브리티: 설치되어 있지 않음" }; Start-Sleep -Seconds 12; $ids = @(Get-Process BrityMessenger -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }) }
  $main = Tops $ids | Where-Object { $_.Current.Name -eq 'Brity Messenger' } | Select-Object -First 1
  if (-not $main) { if (StartApp '^Brity Messenger$') { Start-Sleep -Seconds 6 }; $main = Tops $ids | Where-Object { $_.Current.Name -eq 'Brity Messenger' } | Select-Object -First 1 }
  if (-not $main) { return "브리티: 창을 찾지 못함 (로그인 필요할 수 있음)" }
  $h = Hwnd $main; $wasMin = [SM]::IsIconic($h) -or -not [SM]::IsWindowVisible($h)
  if ($wasMin) { [SM]::ShowWindow($h, 4) | Out-Null; Start-Sleep -Seconds 2 }   # 앞으로 가져오지 않고 펼친다
  # 대화방: 열지 않고 목록에 보이는 최근 메시지만 옮긴다 (대화방 전체 내용은 읽지 않는다)
  $room = $main.FindFirst($Sc::Descendants, (New-Object $PC($AE::NameProperty, "대화 메뉴")))
  if ($room) {
    Invoke-El $room | Out-Null; Start-Sleep -Seconds 2
    $rooms = 0; $today = (Get-Date).Date
    foreach ($b in @($main.FindAll($Sc::Descendants, (New-Object $PC($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button))) | Where-Object { $_.Current.ClassName -match 'chatroomListItem' })) {
      $n = ([string]$b.Current.Name) -replace '\s+', ' '; $rd = $null
      if ($n -match '(?:^| )(\d{1,2})-(\d{1,2})(?: |$)') { try { $rd = [datetime]::new($today.Year, [int]$Matches[1], [int]$Matches[2]); if ($rd -gt $today) { $rd = $rd.AddYears(-1) } } catch {} }
      elseif ($n -match '(?:^| )어제(?: |$)') { $rd = $today.AddDays(-1) }
      elseif ($n -match '(?:^| )\d{1,2}:\d{2}(?: |$)') { $rd = $today }
      if ($rd -and $rd -ge $SinceDate) { [void]$sb.AppendLine("[브리티 대화방 최근] " + $n); [void]$sb.AppendLine(); $rooms++ }
    }
    $script:briRooms = $rooms
  }
  $menu = $main.FindFirst($Sc::Descendants, (New-Object $PC($AE::NameProperty, "쪽지 메뉴")))
  if (-not $menu) { if ($wasMin) { [SM]::ShowWindow($h, 6) | Out-Null }; return "브리티: 쪽지 메뉴를 찾지 못함 (로그인 필요할 수 있음)" }
  Invoke-El $menu | Out-Null; Start-Sleep -Seconds 2
  $tab = $main.FindFirst($Sc::Descendants, (New-Object $PC($AE::NameProperty, "받은 쪽지함")))
  if ($tab) { $p = $null; if ($tab.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$p)) { $p.Select() } elseif (-not (Invoke-El $tab)) { } ; Start-Sleep -Seconds 1 }
  $cItem = New-Object $PC($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::ListItem)
  $seen = @{}; $count = 0; $stop = $false
  for ($page = 0; $page -lt 12 -and -not $stop; $page++) {
    $fresh = 0
    foreach ($it in @($main.FindAll($Sc::Descendants, $cItem))) {
      if ($it.Current.ClassName -notmatch 'dmListItem') { continue }
      $name = ([string]$it.Current.Name) -replace '\s+', ' '
      if (-not $name -or $seen.ContainsKey($name)) { continue }
      $seen[$name] = 1; $fresh++
      $d = BrityDate $name
      if ($d -and $d -lt $SinceDate) { $stop = $true; break }
      if ($count -ge $Max) { $stop = $true; break }
      $body = ""
      $opened = $false
      $ir = RectOf $it
      $rw = [SM]::Render($h)
      if ($ir -and $rw -ne [IntPtr]::Zero) {
        [SM]::SDbl($rw, [int](($ir.L + $ir.R) / 2), [int](($ir.T + $ir.B) / 2)); $opened = $true   # 더블클릭해야 본문 창이 열린다
      }
      if ($opened) {
        $parts = $name -split ', '
        for ($i = 0; $i -lt 12 -and -not $body; $i++) {
          Start-Sleep -Milliseconds 500
          foreach ($w in (Tops $ids)) {
            if ($w.Current.Name -ne '쪽지') { continue }
            $doc = @($w.FindAll($Sc::Descendants, (New-Object $PC($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::Document))) | Where-Object { $_.Current.ClassName -match 'directMessageBodyInnerHTMLBox' }) | Select-Object -First 1
            if (-not $doc) { continue }
            $texts = @($w.FindAll($Sc::Descendants, (New-Object $PC($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::Text))) | ForEach-Object { [string]$_.Current.Name })
            $key0 = $parts[0].Substring(0, [Math]::Min(8, $parts[0].Length))
            $docText = [string]$doc.Current.Name
            if ($texts -contains $parts[0] -or @($texts | Where-Object { $_.StartsWith($key0) }).Count -or $docText.StartsWith($key0)) { $body = $docText; [SM]::SClose((Hwnd $w)); Start-Sleep -Milliseconds 300 }   # 다음 쪽지와 섞이지 않게 닫는다
          }
        }
      }
      [void]$sb.AppendLine("[브리티 쪽지] " + $name)
      [void]$sb.AppendLine($(if ($body) { $body } else { "(본문을 읽지 못함)" }))
      [void]$sb.AppendLine(); $count++
    }
    if ($fresh -eq 0) { break }
    if (-not $stop) {
      $list = $main.FindFirst($Sc::Descendants, (New-Object $PC($AE::ControlTypeProperty, [System.Windows.Automation.ControlType]::List)))
      $q = $null
      if ($list -and $list.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern, [ref]$q) -and $q.Current.VerticalScrollable) { $q.Scroll([System.Windows.Automation.ScrollAmount]::NoAmount, [System.Windows.Automation.ScrollAmount]::LargeIncrement); Start-Sleep -Seconds 1 } else { break }
    }
  }
  if ($wasMin) { [SM]::ShowWindow($h, 6) | Out-Null }
  return "브리티 쪽지 $count 건, 대화방 $([int]$script:briRooms)개"
}

# ===== GOE: 목록은 윈도우 글자 인식, 본문은 글자칸에서 읽는다 =====
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait() | Out-Null; $t.Result }
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.DataWriter, Windows.Foundation, ContentType = WindowsRuntime]
$ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
function OcrLines($hwnd, $w, $hh, $x0 = 0, $cw = 0) {
  $Up = 3
  # 화면이 아니라 그 창만 찍는다. 다른 창에 가려져 있어도 다른 창의 글자를 읽지 않는다.
  $s0 = New-Object System.Drawing.Bitmap $w, $hh; $g = [System.Drawing.Graphics]::FromImage($s0); $dc = $g.GetHdc(); [SM]::PrintWindow($hwnd, $dc, 2) | Out-Null; $g.ReleaseHdc($dc); $g.Dispose()
  if (-not $cw) { $cw = $w - $x0 }
  $s = $s0.Clone((New-Object System.Drawing.Rectangle $x0, 0, $cw, $hh), $s0.PixelFormat); $s0.Dispose(); $w = $cw
  $big = New-Object System.Drawing.Bitmap ($w * $Up), ($hh * $Up); $g = [System.Drawing.Graphics]::FromImage($big); $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $g.DrawImage($s, 0, 0, $big.Width, $big.Height); $g.Dispose(); $s.Dispose()
  $ms = New-Object System.IO.MemoryStream; $big.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $big.Dispose()
  $st = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new(); $dw = [Windows.Storage.Streams.DataWriter]::new($st)
  $dw.WriteBytes($ms.ToArray()); Await ($dw.StoreAsync()) ([uint32]) | Out-Null; $st.Seek(0); $ms.Dispose()
  $dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($st)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bm = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $res = Await ($ocr.RecognizeAsync($bm)) ([Windows.Media.Ocr.OcrResult])
  # 한글 글자 인식은 낱자를 따로 돌려주므로, 글자 사이가 넓을 때만 띄어 쓴다
  @($res.Lines | ForEach-Object {
    $ws = @($_.Words); $txt = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $ws.Count; $i++) {
      if ($i) { $gap = $ws[$i].BoundingRect.X - ($ws[$i - 1].BoundingRect.X + $ws[$i - 1].BoundingRect.Width); if ($gap -gt ($ws[$i].BoundingRect.Height * 0.45)) { [void]$txt.Append(" ") } }
      [void]$txt.Append($ws[$i].Text)
    }
    [pscustomobject]@{ Y = [int]($ws[0].BoundingRect.Y / $Up); X = [int]($ws[0].BoundingRect.X / $Up); Text = $txt.ToString() }
  } | Sort-Object Y)
}
function RectOf($e) { $r = $e.Current.BoundingRectangle; if ($r.IsEmpty) { return $null }; return [pscustomobject]@{ L = [int]$r.Left; T = [int]$r.Top; R = [int]$r.Right; B = [int]$r.Bottom } }
function FindBtn($root, $name) { @($root.FindAll($Sc::Descendants, (New-Object $PC($AE::NameProperty, $name))) | Where-Object { $_.Current.ClassName -eq 'Button' }) | Select-Object -First 1 }
function ReadGoe {
  $ids = @(Get-Process AtMessengerMobileEdition -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  $started = $false
  if (-not $ids.Count) { if (-not (StartApp '^GOE메신저$')) { return "GOE: 설치되어 있지 않음" }; $started = $true; for ($i = 0; $i -lt 30 -and -not $ids.Count; $i++) { Start-Sleep -Seconds 1; $ids = @(Get-Process AtMessengerMobileEdition -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }) }; Start-Sleep -Seconds 6 }
  if (-not $ids.Count) { return "GOE: 켜지 못함" }
  $main = Tops $ids | Where-Object { $_.Current.ClassName -eq '@Messenger7_MainWnd' } | Select-Object -First 1
  if (-not $main) { return "GOE: 창을 찾지 못함 (로그인 필요할 수 있음)" }
  $h = Hwnd $main
  foreach ($old in (Tops $ids)) { if ($old.Current.ClassName -eq '@Messenger7_Wnd') { [SM]::SClose((Hwnd $old)) } }
  if ([SM]::IsIconic($h) -or -not [SM]::IsWindowVisible($h)) { [SM]::ShowWindow($h, 4) | Out-Null }   # 앞으로 가져오지 않고 펼친다
  Start-Sleep -Seconds 1
  $tab = FindBtn $main "쪽지함"   # 번호가 아니라 이름을 확인한 버튼만 누른다
  if (-not $tab) { return "GOE: 쪽지함을 찾지 못함 (로그인 필요할 수 있음)" }
  [SM]::SBtn((Hwnd $tab)); Start-Sleep -Seconds 1
  $inbox = FindBtn $main "수신함"
  if ($inbox) { [SM]::SBtn((Hwnd $inbox)); Start-Sleep -Seconds 1 }
  $listEl = @($main.FindAll($Sc::Descendants, (New-Object $PC($AE::ClassNameProperty, "UltariListScrollView"))) | Where-Object { $_.Current.Name -eq '받은 쪽지 목록' }) | Select-Object -First 1
  if (-not $listEl -or -not (RectOf $listEl)) { return "GOE: 받은 쪽지 목록을 찾지 못함" }
  $q = RectOf $listEl; $w = $q.R - $q.L; $hh = $q.B - $q.T
  $lh = Hwnd $listEl
  [SM]::SWheel($lh, [int]($q.L + $w / 2), [int]($q.T + $hh / 2), 120 * 40); Start-Sleep -Seconds 1
  $seen = @{}; $count = 0; $stop = $false; $prev = ""; $t0 = Get-Date
  for ($page = 0; $page -lt 15 -and -not $stop; $page++) {
    Start-Sleep -Milliseconds 500
    # 날짜 칸(오른쪽)과 제목 칸(왼쪽)을 따로 읽어야 제목이 길어도 날짜를 놓치지 않는다
    $split = [int]($w * 0.55)
    $dates = @(OcrLines $lh $w $hh $split)
    $lefts = @(OcrLines $lh $w $hh 0 $split)
    $sig = ($dates | ForEach-Object { $_.Text }) -join "|"; if ($sig -eq $prev) { break }; $prev = $sig
    foreach ($ln in $dates) {
      if ($stop) { break }
      $dt = ($ln.Text -replace '\s', '') -replace '[Oo]', '0' -replace '[lI|]', '1'
      if ($dt -notmatch '(20\d{2})\D{0,2}(\d{1,2})\D{0,2}(\d{1,2})') { continue }
      try { $d = [datetime]::new([int]$Matches[1], [int]$Matches[2], [int]$Matches[3]) } catch { continue }
      if ($d -lt $SinceDate) { $stop = $true; break }
      if ($count -ge $Max -or ((Get-Date) - $t0).TotalMinutes -gt 15) { $stop = $true; break }
      $when = $ln.Text.Trim()
      $same = @($lefts | Where-Object { [Math]::Abs($_.Y - $ln.Y) -lt 12 }) | Select-Object -First 1
      $title = if ($same) { $same.Text.Trim() } else { "" }
      $whoLine = @($lefts | Where-Object { ($_.Y - $ln.Y) -ge 12 -and ($_.Y - $ln.Y) -lt 45 }) | Select-Object -First 1
      $who = if ($whoLine) { $whoLine.Text.Trim() } else { "" }
      $key = "$title|$when"; if ($seen.ContainsKey($key)) { continue }; $seen[$key] = 1
      $y = $q.T + $ln.Y + 6; if ($y -gt ($q.B - 8)) { continue }
      $body = ""
      [SM]::SClick($lh, [int]($q.L + $w * 0.3), $y); Start-Sleep -Milliseconds 400
      [SM]::SKey($lh, 0x0D)   # 목록 창에만 Enter 신호를 보낸다
      for ($i = 0; $i -lt 8 -and -not $body; $i++) {
        Start-Sleep -Milliseconds 500
        if ($i -eq 3) { [SM]::SDbl($lh, [int]($q.L + $w * 0.3), $y) }   # Enter로 안 열리면 더블클릭 신호
        foreach ($nw in (Tops $ids)) {
          if ($nw.Current.ClassName -ne '@Messenger7_Wnd') { continue }
          $re = $nw.FindFirst($Sc::Descendants, (New-Object $PC($AE::ClassNameProperty, "RICHEDIT50W")))
          if ($re) { $body = [string]$re.Current.Name }
          if ($body) { [SM]::SClose((Hwnd $nw)); Start-Sleep -Milliseconds 400 }
        }
      }
      [void]$sb.AppendLine("[GOE 쪽지] $title, $who, $when")
      [void]$sb.AppendLine($(if ($body) { $body } else { "(본문을 읽지 못함)" }))
      [void]$sb.AppendLine(); $count++
    }
    if (-not $stop) { [SM]::SWheel($lh, [int]($q.L + $w / 2), [int]($q.T + $hh / 2), -120 * 4); Start-Sleep -Seconds 1 }
  }
  foreach ($nw in (Tops $ids)) { if ($nw.Current.ClassName -eq '@Messenger7_Wnd') { [SM]::SClose((Hwnd $nw)) } }
  [SM]::ShowWindow($h, 6) | Out-Null   # 다 읽으면 작게 내려 둔다 (강제로 숨기면 오류가 날 수 있어 숨기지 않는다)
  return "GOE 쪽지 $count 건"
}

if ($picked -contains "brity") { try { [void]$notes.Add((ReadBrity)) } catch { [void]$notes.Add("브리티: 읽기 실패 " + $_.Exception.Message) } }
if ($picked -contains "goe") { try { [void]$notes.Add((ReadGoe)) } catch { [void]$notes.Add("GOE: 읽기 실패 " + $_.Exception.Message) } }
$note = ($notes -join " / ")
$head = "학교 메신저 받은 쪽지 ($Since 이후, 읽음 여부 상관없음) 뽑은 시각 {0}`r`n{1}`r`n`r`n" -f (Get-Date -Format "yyyy-MM-dd HH:mm"), $note
[IO.File]::WriteAllText($Out, $head + $sb.ToString(), [Text.UTF8Encoding]::new($false))
$note

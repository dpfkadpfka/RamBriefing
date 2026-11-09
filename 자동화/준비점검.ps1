# 처음 설정 화면의 준비 점검: 이 PC에서 아침 정리에 필요한 것을 확인해 JSON으로 낸다. 아무것도 켜거나 바꾸지 않는다.
$ErrorActionPreference = "SilentlyContinue"
Add-Type -TypeDefinition @"
using System; using System.Text; using System.Runtime.InteropServices;
public class RBK {
  delegate bool P(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(P p, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr m, P p, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern int GetWindowThreadProcessId(IntPtr h, out int p);
  public static bool HasList(int[] pids) {
    bool found = false;
    EnumWindows((h, l) => { int p; GetWindowThreadProcessId(h, out p); if (Array.IndexOf(pids, p) < 0) return true;
      EnumChildWindows(h, (c, x) => { var s = new StringBuilder(64); GetClassName(c, s, 64); if (s.ToString() == "EVA_VH_ListControl_Dblclk") { found = true; return false; } return true; }, IntPtr.Zero);
      return !found; }, IntPtr.Zero);
    return found;
  }
}
"@
. (Join-Path $PSScriptRoot "공통.ps1")
$kp = @(Get-Process KakaoTalk)
$kakao = if (-not (Find-Kakao) -and -not $kp.Count) { "none" } elseif (-not $kp.Count) { "off" } elseif ([RBK]::HasList([int[]]@($kp | ForEach-Object { $_.Id }))) { "ok" } else { "login" }
$phone = if (Get-AppxPackage -Name Microsoft.YourPhone) { "ok" } else { "none" }
$school = if (Get-StartApps | Where-Object { $_.Name -match '^(Brity Messenger|GOE메신저)$' }) { "ok" } else { "none" }
$claude = if (Test-Path -LiteralPath (Join-Path $HOME ".local\bin\claude.exe")) { "ok" } else { "none" }
$tasks = @(Get-ScheduledTask -TaskName "RamBriefing*")
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
@{ pc = $env:COMPUTERNAME; kakao = $kakao; phone = $phone; school = $school; claude = $claude; tasks = $tasks.Count; tasksOn = @($tasks | Where-Object { $_.State -ne "Disabled" }).Count } | ConvertTo-Json -Compress

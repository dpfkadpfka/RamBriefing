// RamBriefing 설치형 앱: 창, 구글 로그인, 구글 캘린더, 챗봇 연결
const { app, BrowserWindow, ipcMain, shell, safeStorage, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const { ask } = require("./agent");

const API = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar";   // 람캘린더와 같은 범위
const log = msg => { try { fs.appendFileSync(path.join(app.getPath("userData"), "login-log.txt"), new Date().toISOString() + " " + msg + "\n"); } catch {} };
const tokenFile = () => path.join(app.getPath("userData"), "google.bin");
let win = null, access = { token: "", until: 0 };

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
const AUMID = app.isPackaged ? "kr.rambriefing.app" : "RamBriefing";
app.setAppUserModelId(AUMID);

// 구글 앱 등록 정보: 설치본은 함께 넣은 creds.json을 쓴다. 개발 중에는 람캘린더 설치본에서 읽는다. 설정 창에서 넣은 값이 있으면 우선한다.
const secretFile = () => path.join(app.getPath("userData"), "client-secret.bin");
function savedSecret() { try { return safeStorage.decryptString(fs.readFileSync(secretFile())); } catch { return ""; } }
function builtinCreds() { try { const c = JSON.parse(fs.readFileSync(path.join(__dirname, "creds.json"), "utf8").replace(/^﻿/, "")); return c.clientId && c.clientSecret ? c : null; } catch { return null; } }
function creds() {
  const c = builtinCreds() || JSON.parse(fs.readFileSync(path.join(process.env.LOCALAPPDATA, "Programs", "yeram-calendar", "resources", "app.asar", "creds.json"), "utf8"));
  const own = savedSecret();
  return own ? { ...c, clientSecret: own } : c;
}
function setSecret(v) {
  const s = String(v || "").trim();
  if (!/^GOCSPX-[\w-]{10,}$/.test(s)) throw new Error("클라이언트 보안 비밀번호 형식이 아닙니다");
  fs.writeFileSync(secretFile(), safeStorage.encryptString(s));
  return true;
}
function saveRefresh(rt) { fs.writeFileSync(tokenFile(), safeStorage.encryptString(rt)); }
function loadRefresh() { try { return safeStorage.decryptString(fs.readFileSync(tokenFile())); } catch { return ""; } }

async function token() {
  if (access.token && Date.now() < access.until - 60000) return access.token;
  const rt = loadRefresh(); if (!rt) throw new Error("구글 로그인이 필요합니다");
  const c = creds();
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: rt, grant_type: "refresh_token" }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("구글 로그인을 다시 해 주세요");
  access = { token: j.access_token, until: Date.now() + j.expires_in * 1000 };
  return access.token;
}
function login() {
  return new Promise((resolve, reject) => {
    const c = creds(), verifier = crypto.randomBytes(32).toString("base64url"), state = crypto.randomBytes(16).toString("hex");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      const code = u.searchParams.get("code");
      if (!code || u.searchParams.get("state") !== state) { res.writeHead(400); res.end(); return; }
      const page = (title, sub) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(`<meta charset="utf-8"><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>${title}</h2>${sub}</body>`); };
      try {
        const port = server.address().port;
        const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ code, client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: `http://127.0.0.1:${port}`, grant_type: "authorization_code", code_verifier: verifier }) });
        const j = await r.json();
        log(`token status=${r.status} keys=${Object.keys(j).join(",")} error=${j.error || ""} desc=${j.error_description || ""}`);
        if (!j.refresh_token) throw new Error(j.error ? `구글 오류: ${j.error} ${j.error_description || ""}` : "구글이 로그인 정보를 주지 않았습니다");
        saveRefresh(j.refresh_token);
        if (!loadRefresh()) throw new Error("로그인 정보를 이 PC에 저장하지 못했습니다");
        access = { token: j.access_token, until: Date.now() + j.expires_in * 1000 };
        log("saved");
        page("RamBriefing 로그인 완료", "이 창은 닫아도 됩니다.");
        resolve(true);
      } catch (e) {
        log("fail " + e.message);
        page("로그인 실패", String(e.message).replace(/[<>&]/g, ""));
        reject(e);
      } finally { server.close(); clearTimeout(limit); if (win) win.focus(); }
    });
    const limit = setTimeout(() => { server.close(); reject(new Error("로그인 시간이 지났습니다")); }, 300000);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      shell.openExternal("https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({ client_id: c.clientId, redirect_uri: `http://127.0.0.1:${port}`, response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent", code_challenge: challenge, code_challenge_method: "S256", state }));
    });
  });
}
async function logout() {
  const rt = loadRefresh();
  if (rt) fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(rt), { method: "POST" }).catch(() => {});
  try { fs.unlinkSync(tokenFile()); } catch {}
  access = { token: "", until: 0 };
}
async function events(days) {
  const t = await token();
  const u = new URL(`${API}/calendars/primary/events`);
  u.search = new URLSearchParams({ timeMin: new Date().toISOString(), timeMax: new Date(Date.now() + days * 864e5).toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "100" });
  const r = await fetch(u, { headers: { Authorization: "Bearer " + t } });
  if (!r.ok) throw new Error("캘린더를 읽지 못했습니다");
  const j = await r.json();
  return (j.items || []).map(e => ({ title: e.summary || "(제목 없음)", when: (e.start.dateTime || e.start.date || "").replace("T", " ").slice(0, 16) }));
}
const nextDay = d => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
async function addEvent(a) {
  const t = await token();
  const body = { summary: String(a.title).slice(0, 200), description: a.details ? String(a.details).slice(0, 2000) : undefined, reminders: { useDefault: false } };   // 알림 없음
  if (a.start) {
    const end = a.end || `${String((+a.start.slice(0, 2) + 1) % 24).padStart(2, "0")}${a.start.slice(2)}`;
    body.start = { dateTime: `${a.date}T${a.start}:00+09:00`, timeZone: "Asia/Seoul" };
    body.end = { dateTime: `${a.date}T${end}:00+09:00`, timeZone: "Asia/Seoul" };
  } else { body.start = { date: a.date }; body.end = { date: nextDay(a.date) }; }
  const r = await fetch(`${API}/calendars/primary/events`, { method: "POST", headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("캘린더에 넣지 못했습니다");
  return true;
}
const guard = fn => async (_e, ...a) => { try { return { ok: true, value: await fn(...a) } } catch (e) { return { ok: false, error: e.message } } };
ipcMain.handle("status", guard(() => ({ google: !!loadRefresh(), secret: !!savedSecret(), builtin: !!builtinCreds(), version: app.getVersion() })));
ipcMain.handle("setSecret", guard(setSecret));
ipcMain.handle("login", guard(login));
ipcMain.handle("logout", guard(logout));
ipcMain.handle("addEvent", guard(addEvent));
// 앱 아이콘: 고른 번호를 저장하고, 창·바탕화면·시작 메뉴·작업 표시줄 고정 아이콘을 함께 바꾼다
const ICONS = 5;
const iconCfg = () => path.join(app.getPath("userData"), "icon.json");
function iconNo() { try { const n = JSON.parse(fs.readFileSync(iconCfg(), "utf8")).n; return n >= 1 && n <= ICONS ? n : 1; } catch { return 1; } }
const iconPath = n => path.join(app.isPackaged ? process.resourcesPath : __dirname, "icons", `icon-${n}.ico`);   // 바로가기가 읽을 수 있게 설치본은 asar 밖에 둔다
function syncShortcuts(n) {
  if (process.platform !== "win32") return 0;
  const dirs = [app.getPath("desktop"), path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs"), path.join(process.env.APPDATA, "Microsoft", "Internet Explorer", "Quick Launch", "User Pinned", "TaskBar")];
  let changed = 0;
  for (const d of dirs) {
    let names = []; try { names = fs.readdirSync(d).filter(f => f.toLowerCase().endsWith(".lnk")); } catch { continue; }
    for (const f of names) {
      const p = path.join(d, f);
      try {
        const l = shell.readShortcutLink(p);
        const mine = path.resolve(l.target || "").toLowerCase() === path.resolve(process.execPath).toLowerCase() && (app.isPackaged || (l.args || "").toLowerCase().includes(path.resolve(__dirname).toLowerCase()));
        if (mine && (l.icon || "").toLowerCase() !== iconPath(n).toLowerCase()) { shell.writeShortcutLink(p, "update", { icon: iconPath(n), iconIndex: 0, appUserModelId: AUMID }); changed++; }
      } catch {}
    }
  }
  if (changed) require("child_process").execFile("ie4uinit.exe", ["-show"], () => {});   // 아이콘 캐시 새로 고침
  return changed;
}
function setIcon(n) {
  n = Math.round(+n); if (!(n >= 1 && n <= ICONS)) throw new Error("없는 아이콘입니다");
  fs.writeFileSync(iconCfg(), JSON.stringify({ n }));
  if (win) win.setIcon(iconPath(n));
  return { n, shortcuts: syncShortcuts(n) };
}
ipcMain.handle("getIcon", guard(() => iconNo()));
ipcMain.handle("setIcon", guard(setIcon));
ipcMain.handle("chat", guard(async p => {
  let ev = null; try { ev = await events(30); } catch {}
  return ask({ ...p, events: ev });
}));

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1320, height: 880, minWidth: 720, minHeight: 520, title: "RamBriefing", icon: iconPath(iconNo()), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", e => e.preventDefault());
  win.loadFile(path.join(__dirname, "index.html"));
  setTimeout(() => { try { syncShortcuts(iconNo()); } catch {} }, 1500);   // 업데이트로 아이콘이 바뀌어도 바로가기에 반영
  if (app.isPackaged) { try { const { autoUpdater } = require("electron-updater"); autoUpdater.autoInstallOnAppQuit = true; autoUpdater.checkForUpdatesAndNotify().catch(e => log("update " + e.message)); } catch (e) { log("update " + e.message); } }
});
app.on("window-all-closed", () => app.quit());

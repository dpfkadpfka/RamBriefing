// RamBriefing 설치형 앱: 창, 구글 로그인, 구글 캘린더, 챗봇 연결
const { app, BrowserWindow, ipcMain, shell, safeStorage, Menu, Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const { ask } = require("./agent");

const API = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.appdata";   // 캘린더 + 내 드라이브의 앱 전용 공간(동기화)
const log = msg => { try { fs.appendFileSync(path.join(app.getPath("userData"), "login-log.txt"), new Date().toISOString() + " " + msg + "\n"); } catch {} };
const tokenFile = () => path.join(app.getPath("userData"), "google.bin");
let win = null, access = { token: "", until: 0 };

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", (_e, argv) => {
  if (argv.includes("--morning")) { runMorning(); return; }
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); } else createWindow();
});
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
ipcMain.handle("status", guard(() => ({ google: !!loadRefresh(), secret: !!savedSecret(), builtin: !!builtinCreds(), version: app.getVersion(), gemini: !!savedGemini(), sync: syncState, syncAt })));
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
// 처음 설정: 아침 보고를 받을 컴퓨터, 읽을 자료, 시각, AI. 예약은 이 PC에만 걸린다.
const { execFile, spawn } = require("child_process");
const autoDir = () => app.isPackaged ? path.join(process.resourcesPath, "자동화") : path.join(__dirname, "..", "자동화");
const hasAuto = () => fs.existsSync(path.join(autoDir(), "준비점검.ps1"));
const baseDir = () => app.isPackaged ? path.join(app.getPath("userData"), "briefing") : autoDir();
const workDir = () => path.join(baseDir(), "오늘자료"), outDir = () => path.join(baseDir(), "결과");
const dataDir = () => app.isPackaged ? path.join(baseDir(), "data") : path.join(__dirname, "data");
const cfgFile = () => path.join(baseDir(), "설정.json");
const setupFile = () => path.join(app.getPath("userData"), "setup.json");
const PC = process.env.COMPUTERNAME || "이 컴퓨터";
const PS = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
const runPs = (file, args = [], timeout = 60000, sta = false) => new Promise((ok, no) => execFile(PS, ["-NoProfile", "-ExecutionPolicy", "Bypass", ...(sta ? ["-STA"] : []), "-File", path.join(autoDir(), file), ...args], { windowsHide: true, encoding: "utf8", timeout, maxBuffer: 1 << 24 }, (e, out) => e ? no(new Error(file + " 실행 실패")) : ok(out)));
function getSetup() { try { return JSON.parse(fs.readFileSync(setupFile(), "utf8")); } catch { return { done: false }; } }
const writeSetup = v => fs.writeFileSync(setupFile(), JSON.stringify(v));
async function checkEnv() { if (!hasAuto()) return { pc: PC, auto: false }; return { ...JSON.parse(await runPs("준비점검.ps1")), auto: true, gemini: !!savedGemini() }; }
async function saveSetup(s) {
  const role = ["this", "other", "later"].includes(s.role) ? s.role : "later";
  const sources = (s.sources || []).filter(x => ["kakao", "sms", "mail"].includes(x));
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) ? s.time : "06:00";
  const engine = s.engine === "claude" ? "claude" : "gemini";
  if (hasAuto()) {
    if (role === "this") {
      if (!sources.length) throw new Error("읽을 자료를 하나 이상 골라 주세요");
      if (engine === "gemini" && !savedGemini()) throw new Error("제미나이 키를 먼저 넣어 주세요");
      const appArgs = app.isPackaged ? "--morning" : '"' + __dirname + '" --morning';
      await runPs("예약설정.ps1", ["-Time", time, "-Sources", sources.join(","), "-Engine", engine, "-AppExe", process.execPath, "-AppArgs", appArgs]);
    } else await runPs("예약설정.ps1", ["-Off"]);
  }
  const v = { done: true, role, sources, time, engine, pc: PC, at: Date.now() };
  writeSetup(v);
  if (role === "this" && loadRefresh()) syncDoc({ reportPc: PC, reportAt: v.at }).catch(() => {});
  return v;
}

// 제미나이 키: 이 PC에 암호화해 저장
const geminiFile = () => path.join(app.getPath("userData"), "gemini.bin");
function savedGemini() { try { return safeStorage.decryptString(fs.readFileSync(geminiFile())); } catch { return ""; } }
async function geminiCall(key, text) {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text }] }], generationConfig: { temperature: 0.2 } }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 429 ? "제미나이 무료 사용량을 넘었습니다" : r.status === 400 || r.status === 403 ? "제미나이 키를 확인해 주세요" : "제미나이 연결 실패 " + r.status);
  return ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || "").join("");
}
async function setGemini(v) {
  const k = String(v || "").trim(); if (k.length < 20) throw new Error("키 형식이 맞지 않습니다");
  await geminiCall(k, "확인입니다. 네 라고만 답하세요.");
  fs.writeFileSync(geminiFile(), safeStorage.encryptString(k));
  return true;
}

// 아침 정리: 예약(--morning)이나 다시 시도에서 부른다. 끝나면 화면 자료를 만들고 동기화·알림까지 한다.
const pad2 = n => String(n).padStart(2, "0");
const readText = p => { try { return fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""); } catch { return ""; } };
const readCfg = () => { try { return JSON.parse(readText(cfgFile())); } catch { return {}; } };
function writeResult(ok, text) {
  fs.mkdirSync(outDir(), { recursive: true });
  const d = new Date(), day = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()), hm = pad2(d.getHours()) + "-" + pad2(d.getMinutes());
  fs.writeFileSync(path.join(outDir(), day + "_" + hm + ".md"), "---\n시각: " + day + " " + hm.replace("-", ":") + "\n결과: " + ok + "\n---\n\n" + text + "\n");
}
async function geminiBrief(cfg) {
  const key = savedGemini(); if (!key) throw new Error("제미나이 키가 없습니다");
  const src = cfg.sources || [], parts = [];
  if (src.includes("sms")) parts.push("[휴대폰 문자]\n" + (readText(path.join(workDir(), "휴대폰메시지.txt")) || "자료 없음"));
  if (src.includes("kakao")) parts.push("[카카오톡]\n" + (readText(path.join(workDir(), "카카오톡_최근대화.txt")) || "자료 없음").slice(-900000));
  writeResult("성공", await geminiCall(key, readText(path.join(autoDir(), "제미나이_지시.md")) + "\n\n오늘: " + new Date().toLocaleDateString("ko-KR") + "\n\n<자료>\n" + parts.join("\n\n") + "\n</자료>"));
}
function briefings() {
  let names = []; try { names = fs.readdirSync(dataDir()).filter(f => /^20.*\.js$/.test(f)).sort(); } catch {}
  return names.map(f => { try { return JSON.parse(readText(path.join(dataDir(), f)).replace(/^window\.RAM_DATA=/, "").replace(/;\s*$/, "")); } catch { return null; } }).filter(Boolean);
}
function notifyBrief(d, err) {
  if (!Notification.isSupported()) return;
  const sec = k => ((d && d.summary) || []).find(s => s.title.includes(k)), n = k => (sec(k) || { items: [] }).items.length;
  const kakao = ((d && d.failed) || []).some(f => /로그인|채팅 목록|켜져 있지 않/.test(f.msg || ""));
  const body = err ? "정리하지 못했어요: " + err : "할 일 " + n("확인 필요") + "건 · 소소한 소식 " + n("소소한 소식") + "건" + (kakao ? "\n카톡 로그인이 필요해 카톡은 건너뛰었어요" : "");
  const t = new Notification({ title: "RamBriefing 아침 정리", body, icon: iconPath(iconNo()) });
  t.on("click", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } else createWindow(); });
  t.show();
}
let morningBusy = false;
async function runMorning() {
  if (morningBusy) return; morningBusy = true;
  let err = "";
  try {
    fs.mkdirSync(workDir(), { recursive: true });
    const cfg = readCfg();
    try {
      if (cfg.engine === "gemini") await geminiBrief(cfg); else await runPs("일정정리_실행.ps1", [], 40 * 60000);
    } catch (e) { err = e.message; log("morning " + err); writeResult("실패", "## 확인 필요\n\n## 소소한 소식\n\n## 확인한 자료\n\n## 실패한 단계\n- 정리: " + err); }
    await runPs("화면자료_만들기.ps1");
    const list = briefings(), d = list[list.length - 1];
    if (d && loadRefresh()) await syncDoc({ brief: d }).catch(e => log("sync " + e.message));
    notifyBrief(d, err);
  } catch (e) { log("morning " + e.message); notifyBrief(null, e.message); }
  finally {
    morningBusy = false;
    if (win) win.webContents.reload();
    else if (process.argv.includes("--morning")) setTimeout(() => { if (!win) app.quit(); }, 30000);
  }
}
let retrying = false;
function retry() {
  if (!hasAuto()) throw new Error("아침 정리 파일을 찾지 못했습니다");
  if (retrying || morningBusy) return "running";
  retrying = true;
  runPs("카톡_아침내보내기.ps1", ["-Retry"], 40 * 60000, true).catch(e => log("retry " + e.message)).finally(() => { retrying = false; runMorning(); });
  return "started";
}

// 동기화: 내 구글 드라이브의 앱 전용 숨김 공간에 할 일·완료·정리 결과를 둔다. 집·학교 PC가 같은 구글 계정이면 맞춰진다.
const SYNC_NAME = "rambriefing-sync.json";
let syncState = "", syncAt = 0, syncFileId = "", syncBusy = Promise.resolve();
async function drive(method, url, body, type) {
  const r = await fetch(url, { method, headers: { Authorization: "Bearer " + await token(), ...(type ? { "Content-Type": type } : {}) }, body });
  if (r.status === 401 || r.status === 403) { const e = new Error("다시 로그인이 필요합니다"); e.code = "SCOPE"; throw e; }
  if (!r.ok) throw new Error("드라이브 오류 " + r.status);
  return r;
}
async function driveRead() {
  if (!syncFileId) {
    const q = encodeURIComponent("name='" + SYNC_NAME + "'");
    const l = await (await drive("GET", "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=" + q + "&fields=files(id)")).json();
    syncFileId = l.files && l.files[0] ? l.files[0].id : "";
  }
  return syncFileId ? await (await drive("GET", "https://www.googleapis.com/drive/v3/files/" + syncFileId + "?alt=media")).json().catch(() => ({})) : {};
}
async function driveWrite(doc) {
  const text = JSON.stringify(doc);
  if (syncFileId) { await drive("PATCH", "https://www.googleapis.com/upload/drive/v3/files/" + syncFileId + "?uploadType=media", text, "application/json"); return; }
  const b = "rbsync" + Date.now(), body = "--" + b + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify({ name: SYNC_NAME, parents: ["appDataFolder"] }) + "\r\n--" + b + "\r\nContent-Type: application/json\r\n\r\n" + text + "\r\n--" + b + "--";
  const j = await (await drive("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", body, "multipart/related; boundary=" + b)).json();
  syncFileId = j.id;
}
function mergeDoc(remote, p) {
  const doc = { v: 1, tasks: {}, tomb: {}, newsHidden: {}, briefs: {}, reportPc: "", reportAt: 0, ...remote };
  doc.tomb = { ...doc.tomb };
  for (const [k, v] of Object.entries(p.tomb || {})) if (v > (doc.tomb[k] || 0)) doc.tomb[k] = v;
  const tasks = { ...doc.tasks };
  for (const [id, t] of Object.entries(p.tasks || {})) if (!tasks[id] || (t.up || 0) > (tasks[id].up || 0)) tasks[id] = t;
  for (const [id, at] of Object.entries(doc.tomb)) if (tasks[id] && (tasks[id].up || 0) <= at) delete tasks[id];
  doc.tasks = tasks;
  doc.newsHidden = { ...doc.newsHidden, ...(p.newsHidden || {}) };
  if (p.brief) doc.briefs = { ...doc.briefs, [p.brief.date]: p.brief };
  const cut = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  for (const k of Object.keys(doc.briefs)) if (k < cut) delete doc.briefs[k];
  if (p.reportPc && (p.reportAt || 0) >= (doc.reportAt || 0)) { doc.reportPc = p.reportPc; doc.reportAt = p.reportAt; }
  return doc;
}
function syncDoc(p) {   // 동시에 두 번 돌지 않게 줄 세운다
  const job = syncBusy.then(async () => {
    try {
      const doc = mergeDoc(await driveRead(), p);
      const su = getSetup();
      let switched = "";
      if (su.done && su.role === "this") {
        if (!doc.reportPc) { doc.reportPc = PC; doc.reportAt = su.at || Date.now(); }
        else if (doc.reportPc !== PC && (doc.reportAt || 0) > (su.at || 0)) {   // 다른 컴퓨터로 옮겨졌으면 이 컴퓨터 예약을 끈다
          if (hasAuto()) await runPs("예약설정.ps1", ["-Off"]);
          writeSetup({ ...su, role: "other", at: Date.now() }); switched = doc.reportPc;
        }
      }
      await driveWrite(doc);
      syncState = "ok"; syncAt = Date.now();
      return { doc, switched };
    } catch (e) { syncState = e.code === "SCOPE" ? "relogin" : "error"; throw e; }
  });
  syncBusy = job.catch(() => {});
  return job;
}
ipcMain.handle("getSetup", guard(getSetup));
ipcMain.handle("saveSetup", guard(saveSetup));
ipcMain.handle("checkEnv", guard(checkEnv));
ipcMain.handle("retry", guard(retry));
ipcMain.handle("setGemini", guard(setGemini));
ipcMain.handle("getBriefings", guard(briefings));
ipcMain.handle("syncDoc", guard(async p => { if (!loadRefresh()) return { off: true }; return syncDoc(p || {}); }));
ipcMain.handle("getIcon", guard(() => iconNo()));
ipcMain.handle("setIcon", guard(setIcon));
ipcMain.handle("chat", guard(async p => {
  let ev = null; try { ev = await events(30); } catch {}
  return ask({ ...p, events: ev });
}));

function createWindow() {
  win = new BrowserWindow({
    width: 1320, height: 880, minWidth: 720, minHeight: 520, title: "RamBriefing", icon: iconPath(iconNo()), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.on("closed", () => { win = null; });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", e => e.preventDefault());
  win.loadFile(path.join(__dirname, "index.html"));
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  setTimeout(() => { try { syncShortcuts(iconNo()); } catch {} }, 1500);   // 업데이트로 아이콘이 바뀌어도 바로가기에 반영
  if (process.argv.includes("--morning")) { runMorning(); return; }
  createWindow();
  if (app.isPackaged) { try { const { autoUpdater } = require("electron-updater"); autoUpdater.autoInstallOnAppQuit = true; autoUpdater.checkForUpdatesAndNotify().catch(e => log("update " + e.message)); } catch (e) { log("update " + e.message); } }
});
app.on("window-all-closed", () => app.quit());

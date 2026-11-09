// RamBriefing: 아침 브리핑에서 올라온 할 일을 처리하고 기록하는 앱. 저장은 이 PC의 브라우저 저장소를 쓴다.
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const plain = s => String(s).replace(/`/g, "").replace(/\*\*/g, "");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const svg = (d, s = 18, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  today: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  none: svg('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6 18.4 18.4"/>'),
  up: svg('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  all: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  log: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-2.8 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.9l.1-.1a1.7 1.7 0 0 0-1.2-2.8H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.9-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 15, 3),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>', 16, 2.2),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 20, 2.4),
  star: svg('<path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8Z"/>', 17, 2),
};
const TOPICS = [["제출", "#dc2626", /제출|마감|감수|회신|만족도|서류/], ["신청", "#7c3aed", /신청|응모|접수/], ["연수", "#0891b2", /연수|특강|강의|강좌/], ["촬영", "#ea580c", /촬영|녹화/], ["회의", "#2563eb", /회의|협의|모임/], ["답장", "#059669", /답장|연락|문의/], ["기타", "#71717a", /$^/]];
const topicColor = t => (TOPICS.find(x => x[0] === t) || TOPICS[6])[1];
const guessTopic = text => { for (const t of TOPICS) if (t[2].test(text)) return t[0]; return "기타"; };
const WEEK = "일월화수목금토";
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return ymd(d); };
const sameDay = (ms, s) => ymd(new Date(ms)) === s;
const dday = s => Math.round((new Date(s + "T00:00:00") - new Date(today() + "T00:00:00")) / 864e5);
function findDue(text) {
  const m = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (m) { const now = new Date(); const d = new Date(now.getFullYear(), +m[1] - 1, +m[2]); if (now - d > 180 * 864e5) d.setFullYear(d.getFullYear() + 1); return ymd(d); }
  if (/오늘/.test(text)) return today();
  if (/내일/.test(text)) return addDays(today(), 1);
  if (/모레/.test(text)) return addDays(today(), 2);
  return "";
}
const norm = s => s.replace(/[^가-힣A-Za-z0-9]/g, "").toLowerCase();
function parse(text) {
  const raw = String(text).replace(/`/g, "");
  const m = raw.match(/^\*\*(.+?):?\*\*:?\s*(.*)$/s);
  const it = m ? { title: m[1], body: m[2] } : { title: raw.replace(/\*\*/g, ""), body: "" };
  const tag = it.title.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (tag) { it.tag = tag[1]; it.title = tag[2]; }
  return it;
}
const P = Object.assign({ start: "today", view: "board", showDone: true }, store.get("rb.prefs", {}));
if (P.start === "up") P.start = "today";
let tasks = store.get("rb.tasks", {});
// 바뀐 할 일에 시각을 찍어 두고, 구글 동기화 때 더 새것을 고른다
let snap = null, tomb = store.get("rb.tomb", {}), syncTimer = null;
const taskJson = t => { const { up, ...r } = t; return JSON.stringify(r); };
const takeSnap = () => { snap = {}; for (const [id, t] of Object.entries(tasks)) snap[id] = taskJson(t); };
function saveAll() {
  if (snap) {
    let changed = false;
    for (const [id, t] of Object.entries(tasks)) { const j = taskJson(t); if (snap[id] !== j) { t.up = Date.now(); snap[id] = j; changed = true; } }
    for (const id of Object.keys(snap)) if (!tasks[id]) { tomb[id] = Date.now(); delete snap[id]; changed = true; }
    if (changed) { store.set("rb.tomb", tomb); clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(), 3000); }
  }
  store.set("rb.tasks", tasks);
}
let reportPc = "", briefsSeen = {};
async function syncNow(extra) {
  if (!window.rb || !window.rb.syncDoc) return;
  const r = await window.rb.syncDoc({ tasks, tomb, newsHidden, ...(extra || {}) });
  if (!r.ok || !r.value || r.value.off) return;
  const doc = r.value.doc; reportPc = doc.reportPc || "";
  if (r.value.switched) { toast("아침 보고 컴퓨터가 " + r.value.switched + "(으)로 옮겨져 이 컴퓨터의 예약을 껐습니다"); }
  newsHidden = doc.newsHidden || newsHidden; store.set("rb.news.hidden", newsHidden);
  tomb = doc.tomb || tomb; store.set("rb.tomb", tomb);
  let fresh = false;
  for (const d of Object.values(doc.briefs || {}).sort((a, b) => a.date.localeCompare(b.date))) if (!briefsSeen[d.date + d.time]) { briefsSeen[d.date + d.time] = 1; ingest(d); fresh = true; }
  if (!open) { const next = doc.tasks || {}; for (const [id, t] of Object.entries(tasks)) if (!next[id] && !tomb[id]) next[id] = t; tasks = next; takeSnap(); }
  store.set("rb.tasks", tasks);
  const su = await window.rb.getSetup(); if (su.ok) showRole(su.value);
  render(); if (fresh && latest) notice(latest);
}
const savePrefs = () => store.set("rb.prefs", P);
let page = P.start, query = "", latest = null, open = null, editing = null;

// 소소한 소식: 할 일은 아니지만 알아 두면 좋은 것. 지운 것은 이 PC에 기억한다.
const NEWS_COLOR = { 이벤트: "#ec4899", 꿀팁: "#f59e0b", 추천: "#8b5cf6", 방송: "#0ea5e9", 소식: "#10b981" };
let news = {}, newsHidden = store.get("rb.news.hidden", {});
function ingestNews(d) {
  const sec = (d.summary || []).find(s => s.title.includes("소소한 소식"));
  for (const text of sec ? sec.items : []) {
    const it = parse(text), id = norm(it.title).slice(0, 40); if (!id) continue;
    news[id] = { id, title: it.title, body: it.body, tag: NEWS_COLOR[it.tag] ? it.tag : "소식", date: d.date };
  }
}
const newsRows = () => Object.values(news).filter(n => !newsHidden[n.id]).filter(n => !query || (n.title + " " + n.body).toLowerCase().includes(query)).sort((a, b) => b.date.localeCompare(a.date));
const linkify = s => esc(s).replace(/https:\/\/[^\s<)]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
function renderNews(c) {
  const list = newsRows();
  if (!list.length) { c.innerHTML = `<div class="empty"><b>새 소식이 없습니다</b>이벤트, 꿀팁, 추천 자료, 방송 소식이 아침마다 여기에 모입니다</div>`; return; }
  const g = {}; for (const n of list) (g[n.date] = g[n.date] || []).push(n);
  c.innerHTML = '<div class="listing">' + Object.entries(g).map(([day, xs]) => `<section><div class="col-h">${esc(dateName(day))} <em>${xs.length}건</em></div><div class="rows">` + xs.map(n => `<div class="row news" data-news-id="${esc(n.id)}"><span class="news-tag" style="--nc:${NEWS_COLOR[n.tag]}">${esc(n.tag)}</span><div><b>${esc(n.title)}</b>${n.body ? `<p>${linkify(n.body)}</p>` : ""}</div><div class="news-do"><button class="btn" data-news="task">할 일로</button><button class="btn" data-news="hide">지우기</button></div></div>`).join("") + "</div></section>").join("") + "</div>";
}

function ingest(d) {
  latest = d;
  ingestNews(d);
  const sec = (d.summary || []).find(s => s.title.includes("확인 필요"));
  for (const text of sec ? sec.items : []) {
    const it = parse(text), id = "b:" + norm(it.title).slice(0, 40); if (id === "b:") continue;
    const ex = tasks[id], t = it.title + " " + it.body;
    const topic = it.tag && TOPICS.some(x => x[0] === it.tag) ? it.tag : guessTopic(t);
    if (!ex) tasks[id] = { id, title: it.title, body: it.body, topic, due: findDue(t), star: false, memo: "", source: "brief", created: d.date };
    else if (!ex.edited) { ex.body = it.body; ex.topic = topic; ex.due = findDue(t) || ex.due; }
  }
}
function migrate() {  // 이전 화면에서 완료·삭제한 내용 옮기기
  const done = store.get("rb.done", null), gone = store.get("rb.deleted", null);
  if (done) { for (const [k, v] of Object.entries(done)) { const id = "b:" + k; if (tasks[id]) tasks[id].doneAt = v.at; } try { localStorage.removeItem("rb.done"); } catch {} }
  if (gone) { for (const [k, v] of Object.entries(gone)) { const id = "b:" + k; if (tasks[id]) tasks[id].delAt = v; } try { localStorage.removeItem("rb.deleted"); } catch {} }
}
const live = () => Object.values(tasks).filter(t => !t.delAt);
const isOpen = t => !t.doneAt;
const doneToday = t => t.doneAt && sameDay(t.doneAt, today());
const matches = t => !query || (t.title + " " + t.body + " " + (t.memo || "")).toLowerCase().includes(query);
function pageRows() {
  const td = today();
  let rows = live().filter(t => isOpen(t) || (P.showDone && doneToday(t)));
  if (page === "today") rows = rows.filter(t => t.due && t.due <= td);
  else if (page === "none") rows = rows.filter(t => !t.due);
  else if (page.startsWith("d:")) rows = rows.filter(t => t.due === page.slice(2));
  return rows.filter(matches);
}
const order = (a, b) => (a.doneAt ? 1 : 0) - (b.doneAt ? 1 : 0) || (b.star ? 1 : 0) - (a.star ? 1 : 0) || (a.due || "9").localeCompare(b.due || "9");
const groups = rows => TOPICS.map(t => ({ name: t[0], color: t[1], rows: rows.filter(x => x.topic === t[0]) }));
function dueHtml(t) {
  if (t.doneAt) { const d = new Date(t.doneAt); return `<span>완료 ${pad(d.getHours())}:${pad(d.getMinutes())}</span>`; }
  if (!t.due) return "";
  const d = new Date(t.due + "T00:00:00"), n = dday(t.due);
  const tail = n === 0 ? "오늘" : n === 1 ? "내일" : n > 0 ? "D-" + n : (-n) + "일 지남";
  return `<span class="due${n < 0 ? " past" : n <= 1 ? " soon" : ""}">${d.getMonth() + 1}/${d.getDate()} ${WEEK[d.getDay()]} · ${tail}</span>`;
}
function calUrl(t) {
  const u = new URL("https://calendar.google.com/calendar/render");
  u.searchParams.set("action", "TEMPLATE"); u.searchParams.set("text", t.title);
  const det = [t.body, t.memo].filter(Boolean).join("\n"); if (det) u.searchParams.set("details", det);
  if (t.due) {
    const c = t.due.replace(/-/g, ""), tm = (t.title + " " + t.body).match(/(\d{1,2}):(\d{2})/);
    if (tm) { u.searchParams.set("dates", `${c}T${pad(tm[1])}${tm[2]}00/${c}T${pad((+tm[1] + 1) % 24)}${tm[2]}00`); u.searchParams.set("ctz", "Asia/Seoul"); }
    else u.searchParams.set("dates", `${c}/${addDays(t.due, 1).replace(/-/g, "")}`);
  }
  return u.href;
}
function taskHtml(t) {
  return `<article class="task${t.doneAt ? " done" : ""}" style="--tc:${topicColor(t.topic)}" data-id="${esc(t.id)}">
    <button class="tick" data-do="toggle" aria-label="${t.doneAt ? "완료 취소" : "완료"}: ${esc(t.title)}" title="${t.doneAt ? "완료 취소" : "완료"}">${I.check}</button>
    <div class="t-main" data-do="open">
      <h3>${esc(t.title)}</h3>${t.body ? `<p class="desc">${esc(t.body)}</p>` : ""}
      <div class="meta">${dueHtml(t)}<span class="topic"><i style="background:${topicColor(t.topic)}"></i>${esc(t.topic)}</span>${t.doneAt ? "" : `<a class="cal" href="${esc(calUrl(t))}" target="_blank" rel="noopener" data-cal>캘린더 등록</a>`}</div>
    </div>
    <button class="star${t.star ? " on" : ""}" data-do="star" aria-label="중요 표시" aria-pressed="${!!t.star}" title="중요">${I.star}</button>
  </article>`;
}
function emptyHtml() {
  if (query) return '<div class="empty"><b>찾는 할 일이 없습니다</b></div>';
  if (page === "today") return '<div class="empty"><b>오늘 할 일을 모두 끝냈습니다</b>내일 아침 새 할 일이 올라옵니다</div>';
  return '<div class="empty"><b>할 일이 없습니다</b></div>';
}
function renderContent() {
  const c = $("content");
  if (page === "news") return renderNews(c);
  if (page === "log") return renderLog(c);
  if (page === "trash") return renderTrash(c);
  const rows = pageRows().sort(order);
  if (!rows.length) { c.innerHTML = emptyHtml(); return; }
  const gs = groups(rows).filter(g => g.rows.length);
  const head = g => `<div class="col-h"><i style="background:${g.color}"></i>${esc(g.name)} <em>${g.rows.filter(isOpen).length}</em></div>`;
  c.innerHTML = P.view === "board"
    ? `<div class="board" id="board">${gs.map(g => `<section class="col">${head(g)}<div class="lane">${g.rows.map(taskHtml).join("")}</div></section>`).join("")}</div>`
    : `<div class="listing">${gs.map(g => `<section>${head(g)}${g.rows.map(taskHtml).join("")}</section>`).join("")}</div>`;
}
function dayName(ms) { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`; }
function renderLog(c) {
  const list = live().filter(t => t.doneAt && !doneToday(t)).filter(matches).sort((a, b) => b.doneAt - a.doneAt);
  if (!list.length) { c.innerHTML = '<div class="empty"><b>아직 기록이 없습니다</b>완료한 일은 다음 날 여기로 넘어옵니다</div>'; return; }
  const g = {}; for (const t of list) (g[dayName(t.doneAt)] = g[dayName(t.doneAt)] || []).push(t);
  c.innerHTML = '<div class="listing">' + Object.entries(g).map(([day, xs]) => `<section><div class="col-h">${esc(day)} <em>${xs.length}건</em></div><div class="rows">` + xs.map(t => { const d = new Date(t.doneAt); return `<div class="row" data-id="${esc(t.id)}"><time>${pad(d.getHours())}:${pad(d.getMinutes())}</time><div><b>${esc(t.title)}</b>${t.body ? `<p>${esc(t.body)}</p>` : ""}</div><button class="btn" data-do="toggle">되돌리기</button></div>`; }).join("") + "</div></section>").join("") + "</div>";
}
function renderTrash(c) {
  const list = Object.values(tasks).filter(t => t.delAt).filter(matches).sort((a, b) => b.delAt - a.delAt);
  if (!list.length) { c.innerHTML = '<div class="empty"><b>휴지통이 비어 있습니다</b></div>'; return; }
  c.innerHTML = '<div class="listing"><section><div class="rows">' + list.map(t => `<div class="row" style="grid-template-columns:minmax(0,1fr) auto" data-id="${esc(t.id)}"><div><b>${esc(t.title)}</b><p>${dayName(t.delAt)} 삭제</p></div><button class="btn" data-do="restore">되살리기</button></div>`).join("") + "</div></section></div>";
}
const dateName = s => { const d = new Date(s + "T00:00:00"); return `${d.getMonth() + 1}/${d.getDate()} ${WEEK[d.getDay()]}`; };
function renderNav() {
  const td = today(), openRows = live().filter(isOpen);
  const item = (id, name, icon, n) => `<button class="nav-it" data-page="${id}"${page === id ? ' aria-current="page"' : ""}><span class="ic">${icon}</span><span class="n">${name}</span><em>${n || ""}</em></button>`;
  const late = openRows.filter(t => t.due && t.due <= td).length;
  $("menu").innerHTML = item("today", "오늘", I.today, late) + item("all", "전체", I.all, openRows.length) + item("news", "소소한 소식", I.star, Object.values(news).filter(n => !newsHidden[n.id]).length);
  const dates = {}; for (const t of openRows) if (t.due && t.due > td) dates[t.due] = (dates[t.due] || 0) + 1;
  const list = Object.keys(dates).sort();
  if (page.startsWith("d:") && !dates[page.slice(2)]) page = "today";
  const tag = s => { const n = dday(s); return n === 1 ? " · 내일" : n === 2 ? " · 모레" : ""; };
  $("topics").innerHTML = list.map(s => item("d:" + s, dateName(s) + tag(s), I.up, dates[s])).join("") + item("none", "날짜 없음", I.none, openRows.filter(t => !t.due).length);
  $("menu2").innerHTML = item("log", "기록", I.log, live().filter(t => t.doneAt && !doneToday(t)).length) + item("trash", "휴지통", I.trash, Object.values(tasks).filter(t => t.delAt).length);
}
function renderHead() {
  const names = { today: "오늘", all: "전체", none: "날짜 없음", news: "소소한 소식", log: "기록", trash: "휴지통" };
  $("title").textContent = names[page] || dateName(page.slice(2));
  const isTask = page !== "log" && page !== "trash" && page !== "news";
  const finished = live().filter(doneToday).length;
  const leftN = isTask ? pageRows().filter(isOpen).length : 0;
  const d = new Date();
  $("sub").textContent = isTask ? `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일 · 남은 일 ${leftN}개 · 오늘 완료 ${finished}개` : page === "news" ? "이벤트·꿀팁·추천·방송처럼 알아 두면 좋은 것" : page === "log" ? "지난날 완료한 일" : "삭제한 일은 여기서 되살릴 수 있습니다";
  $("tools").hidden = !isTask; $("addForm").hidden = !isTask; $("progress").hidden = !isTask;
  const hour = d.getHours(), hello = hour < 11 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "오늘도 고생했어요";
  const style = document.documentElement.getAttribute("data-style");
  const tx = window.RBSkin ? RBSkin.texts() : { title: "", name: "", line: "" };
  const TITLES = { dream: tx.name ? `${tx.name}, ${hello}!` : `${hello}!`, night: tx.name ? `${hello}, ${tx.name}` : hello, chalk: "오늘의 할 일", rpg: "오늘의 퀘스트", depart: "오늘 출발", book: tx.name ? `${tx.name}의 오늘 이야기` : "오늘의 이야기", retro: "오늘 할 일.txt", sea: "오늘의 바다", game: "오늘의 할 일 말판" };
  if (page === "today" && (tx.title || TITLES[style])) $("title").textContent = tx.title || TITLES[style];
  const dd = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`, tot = leftN + finished;
  const DECO = {
    chalk: `<span class="motto"><small>급훈</small>${esc(tx.line)}</span><span class="duty">${dd}${tx.name ? `<br>주번 ${esc(tx.name)}` : ""}</span>`,
    rpg: `<span class="hud"><b>${esc(tx.name || "선생님")}</b><small>${esc(tx.line)}</small></span><span class="hearts">♥♥♥♥<s>♥</s></span><span class="exp"><small>오늘 EXP ${finished}/${tot}</small><i><b style="width:${tot ? finished / tot * 100 : 0}%"></b></i></span>`,
    depart: `<span class="flap">${pad(d.getHours())}</span><span class="colon">:</span><span class="flap">${pad(d.getMinutes())}</span>`,
    book: `<span class="line">${esc(tx.line)}</span>`,
    sea: `<span class="line">${esc(tx.line)}</span>`,
    game: `<span class="dice"><i></i></span><span class="line">${finished}/${tot} 칸 이동</span>`,
  };
  $("deco").innerHTML = isTask && DECO[style] ? DECO[style] : "";
  $("paperDate").innerHTML = `<b>${pad(d.getDate())}</b><span>${d.getMonth() + 1}월 · ${WEEK[d.getDay()]}요일</span>`;
  const tmr = addDays(today(), 1), openAll = live().filter(isOpen);
  $("tiles").innerHTML = [[openAll.filter(t => t.due && t.due <= today()).length, "오늘 할 일"], [openAll.filter(t => t.due === tmr).length, "내일 마감"], [finished, "오늘 완료"], [openAll.length, "전체 남은 일"]].map(x => `<div class="tile"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
  $("tiles").hidden = !isTask;
  const total = leftN + finished; $("progressFill").style.width = total ? (finished / total * 100) + "%" : "0%";
  const on = (id, v) => $(id).setAttribute("aria-pressed", v);
  on("vBoard", P.view === "board"); on("vList", P.view === "list");
}
function render() { saveAll(); renderNav(); renderHead(); renderContent(); if (open) renderDrawer(); }

function notice(d) {
  const sec = k => (d.summary || []).find(s => s.title.includes(k));
  const added = (sec("넣은 일정") || { items: [] }).items.map(plain);
  const seen = (sec("확인한 자료") || { items: [] }).items.map(plain);
  const fail = (sec("실패한 단계") || { items: [] }).items.map(plain).filter(t => !/^(없|실패한 단계는 없|실패 없)/.test(t));
  const rooms = (d.failed || []).map(f => f.room).filter(r => r && !/^목록 위치/.test(r));
  const needLogin = (d.failed || []).some(f => /로그인|채팅 목록|켜져 있지 않/.test(f.msg || ""));
  const id = "rb.note." + d.date + "." + d.time;
  if ((!added.length && !seen.length && !fail.length && !rooms.length && !needLogin) || store.get(id, false)) { $("note").hidden = true; return; }
  const chips = [];
  if (added.length) chips.push(`<span class="stat new">새 일정 <b>${added.length}</b></span>`);
  for (const s of seen) { const m = s.match(/^(메일|문자|카톡)\D*(\d+)/); if (m) chips.push(`<span class="stat">${m[1]} <b>${m[2]}</b></span>`); }
  if (needLogin) chips.push('<span class="stat warn">카톡 로그인 필요</span>');
  if (rooms.length) chips.push(`<span class="stat warn">저장 실패 <b>${rooms.length}</b></span>`);
  $("stats").innerHTML = chips.join("");
  const rows = [];
  if (added.length) rows.push(["캘린더에 넣음", "<ul>" + added.map(a => `<li>${esc(a)}</li>`).join("") + "</ul>"]);
  if (seen.length) rows.push(["확인한 자료", esc(seen.join(" · "))]);
  if (rooms.length) rows.push(["저장 못 한 방", esc(rooms.join(", ")) + "<br>위의 다시 시도를 누르세요"]);
  if (needLogin) rows.push(["카톡", "로그인되어 있지 않아 카톡은 건너뛰고 나머지만 정리했어요. 카톡에 로그인한 뒤 다시 시도를 누르세요."]);
  if (fail.length) rows.push(["문제", esc(fail.join(" "))]);
  $("noteDetail").innerHTML = "<dl>" + rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join("") + "</dl>";
  $("note").hidden = false;
  $("noteX").onclick = () => { store.set(id, true); $("note").hidden = true; };
  const rb = $("noteRetry"); rb.hidden = !((rooms.length || needLogin) && window.rb && window.rb.retry);
  rb.onclick = async () => { rb.disabled = true; rb.textContent = "다시 정리하는 중…"; const r = await window.rb.retry(); if (!r.ok) { toast(r.error); rb.disabled = false; rb.textContent = "다시 시도"; } else toast("다시 정리합니다. 끝나면 화면이 새로 고쳐집니다"); };
}
function renderDrawer() {
  const t = tasks[open]; if (!t) { closeDrawer(); return; }
  if (editing === open) return;   // 입력 중에는 다시 그리지 않는다
  const dr = $("drawer"); dr.hidden = false; editing = open;
  dr.innerHTML = `<div class="d-h">${t.source === "brief" ? "아침 브리핑에서 온 할 일" : "직접 추가한 할 일"}<button class="icon" data-act="close" aria-label="상세 닫기">${I.x}</button></div>
  <div class="d-b">
    <label class="field"><span>제목</span><input class="d-title" data-f="title" value="${esc(t.title)}"></label>
    <label class="field"><span>내용</span><textarea rows="4" data-f="body">${esc(t.body)}</textarea></label>
    <div class="two"><label class="field"><span>날짜</span><input type="date" data-f="due" value="${esc(t.due)}"></label>
    <label class="field"><span>주제</span><select data-f="topic">${TOPICS.map(x => `<option${x[0] === t.topic ? " selected" : ""}>${x[0]}</option>`).join("")}</select></label></div>
    <div class="quick"><button class="btn" data-act="d0">오늘로</button><button class="btn" data-act="d1">내일로</button><button class="btn" data-act="d7">다음 주로</button><button class="btn" data-act="dx">날짜 없음</button></div>
    <label class="field"><span>메모</span><textarea rows="3" data-f="memo" placeholder="처리하면서 남길 내용">${esc(t.memo || "")}</textarea></label>
  </div>
  <div class="d-f"><button class="btn main" data-act="done">${t.doneAt ? "완료 취소" : "완료"}</button><a class="btn" data-cal href="${esc(calUrl(t))}" target="_blank" rel="noopener">캘린더 등록</a><button class="btn danger" data-act="del">삭제</button></div>`;
}
function closeDrawer() { open = null; editing = null; $("drawer").hidden = true; }
let toastTimer = null, toastFn = null;
function toast(msg, fn) {
  $("toastText").textContent = msg; toastFn = fn; $("toastBtn").hidden = !fn; $("toast").hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $("toast").hidden = true; }, 6000);
}
$("toastBtn").onclick = () => { if (toastFn) toastFn(); $("toast").hidden = true; };
function remove(id) { const t = tasks[id]; t.delAt = Date.now(); closeDrawer(); render(); toast("휴지통으로 옮겼습니다", () => { delete t.delAt; render(); }); }
document.addEventListener("click", e => {
  const cal = e.target.closest("[data-cal]");
  if (cal) {
    const host = cal.closest("[data-id]"), t = tasks[host ? host.dataset.id : open];
    if (window.rb && googleOn && t && t.due) { e.preventDefault(); quickAdd(t, cal); }
    return;
  }
  const nav = e.target.closest("[data-page]");
  if (nav) { page = nav.dataset.page; closeDrawer(); render(); return; }
  const nb = e.target.closest("[data-news]");
  if (nb) {
    const n = news[nb.closest("[data-news-id]").dataset.newsId];
    if (nb.dataset.news === "task") { const id = "m:" + Date.now(); tasks[id] = { id, title: n.title, body: n.body, topic: guessTopic(n.title + " " + n.body), due: findDue(n.title + " " + n.body), star: false, memo: "", source: "me", created: today(), edited: true }; toast("할 일에 넣었습니다"); }
    newsHidden[n.id] = 1; store.set("rb.news.hidden", newsHidden); render(); return;
  }
  const b = e.target.closest("[data-do]"); if (!b) return;
  const id = b.closest("[data-id]").dataset.id, t = tasks[id], act = b.dataset.do;
  if (act === "toggle") { t.doneAt = t.doneAt ? 0 : Date.now(); if (!t.doneAt) delete t.doneAt; }
  if (act === "star") t.star = !t.star;
  if (act === "restore") delete t.delAt;
  if (act === "open") { open = id; editing = null; }
  render();
});
$("drawer").addEventListener("input", e => {
  const k = e.target.dataset.f; if (!k || !open) return;
  tasks[open][k] = e.target.value; tasks[open].edited = true; saveAll(); renderNav(); renderHead(); renderContent();
});
$("drawer").addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, t = tasks[open];
  if (a === "close") closeDrawer();
  if (a === "del") return remove(t.id);
  if (a === "done") { if (t.doneAt) delete t.doneAt; else t.doneAt = Date.now(); closeDrawer(); }
  if (/^d[017x]$/.test(a)) { t.due = a === "dx" ? "" : addDays(today(), +a[1]); t.edited = true; editing = null; }
  render();
});
$("addForm").addEventListener("submit", e => {
  e.preventDefault();
  const text = $("addInput").value.trim(); if (!text) return;
  const id = "m:" + Date.now();
  tasks[id] = { id, title: text, body: "", topic: guessTopic(text), due: findDue(text) || (page === "today" ? today() : page.startsWith("d:") ? page.slice(2) : ""), star: false, memo: "", source: "me", created: today(), edited: true };
  $("addInput").value = ""; render();
});
$("q").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); if (query && page !== "log" && page !== "trash" && page !== "news") page = "all"; render(); });
let googleOn = false;
async function refreshGoogle() { if (window.rb) { const r = await window.rb.status(); googleOn = !!(r.ok && r.value.google); } }
async function quickAdd(t, el) {
  const tm = (t.title + " " + t.body).match(/(\d{1,2}):(\d{2})/);
  el.textContent = "넣는 중…";
  const r = await window.rb.addEvent({ title: t.title, date: t.due, start: tm ? `${pad(tm[1])}:${tm[2]}` : "", details: [t.body, t.memo].filter(Boolean).join("\n") });
  el.textContent = "캘린더 등록";
  toast(r.ok ? "캘린더에 넣었습니다. 람캘린더에도 표시됩니다" : r.error);
}
const setP = (k, v) => { P[k] = v; savePrefs(); render(); };
$("vBoard").onclick = () => setP("view", "board"); $("vList").onclick = () => setP("view", "list");
$("more").onclick = () => { const o = $("noteDetail").hidden; $("noteDetail").hidden = !o; $("more").setAttribute("aria-expanded", o); };
$("content").addEventListener("wheel", e => {
  const board = $("board"); if (!board || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || board.scrollWidth <= board.clientWidth) return;
  const l = e.target.closest(".lane");
  if (l && l.scrollHeight > l.clientHeight + 1) { const down = e.deltaY > 0; if ((down && l.scrollTop + l.clientHeight < l.scrollHeight - 1) || (!down && l.scrollTop > 0)) return; }
  board.scrollLeft += e.deltaY; e.preventDefault();
}, { passive: false });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if (!$("settingsBack").hidden) closeSettings(); else closeDrawer(); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === "n" || e.key === "ㅜ") { e.preventDefault(); $("addInput").focus(); }
  if (e.key === "/") { e.preventDefault(); $("q").focus(); }
});

// 설정 창
function tabGeneral(el) {
  const sel = (k, opts) => `<select data-p="${k}">${opts.map(o => `<option value="${o[0]}"${P[k] === o[0] ? " selected" : ""}>${o[1]}</option>`).join("")}</select>`;
  el.innerHTML = `<h3>일반</h3>
  <div class="opt"><div>처음 여는 화면</div>${sel("start", [["today", "오늘"], ["all", "전체"]])}</div>
  <div class="opt"><div>기본 보기</div>${sel("view", [["board", "보드 (옆으로 넘기기)"], ["list", "목록"]])}</div>
  <div class="opt"><div>오늘 완료한 일 보이기<small>끄면 체크하는 즉시 목록에서 숨깁니다. 다음 날 기록으로 넘어갑니다.</small></div><input type="checkbox" data-c="showDone"${P.showDone ? " checked" : ""} aria-label="오늘 완료한 일 보이기"></div>
  <div class="opt"><div>단축키<small>N 할 일 추가 · / 찾기 · Esc 닫기</small></div></div>
  <div class="opt" style="display:block;padding:14px 0"><div>앱 아이콘<small>바탕화면·시작 메뉴·작업 표시줄 아이콘도 함께 바뀝니다</small></div><div class="icon-pick" id="iconPick">${[1, 2, 3, 4, 5].map(n => `<button data-icon="${n}" aria-label="아이콘 ${n}"><img src="icons/icon-${n}.png" alt=""></button>`).join("")}</div></div>`;
  el.onchange = e => { const t = e.target; if (t.dataset.p) setP(t.dataset.p, t.value); if (t.dataset.c) setP(t.dataset.c, t.checked); };
  const mark = n => el.querySelectorAll("[data-icon]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.icon === n));
  mark(iconNo);
  el.onclick = async e => {
    const b = e.target.closest("[data-icon]"); if (!b) return;
    const n = +b.dataset.icon;
    if (window.rb && window.rb.setIcon) { const r = await window.rb.setIcon(n); if (!r.ok) { toast(r.error); return; } }
    setIconNo(n); mark(n); toast("아이콘을 바꿨습니다");
  };
}
// 앱 아이콘 (설치형은 main에 저장, 브라우저에서는 이 PC에만)
let iconNo = 1;
function setIconNo(n) {
  iconNo = n; try { localStorage.setItem("rb.icon", n); } catch {}
  $("logo").src = `icons/icon-${n}.png`; document.querySelector('link[rel="icon"]').href = `icons/icon-${n}.png`;
}
(async () => { let n = +(localStorage.getItem("rb.icon") || 1); if (window.rb && window.rb.getIcon) { const r = await window.rb.getIcon(); if (r.ok) n = r.value; } setIconNo(n >= 1 && n <= 5 ? n : 1); })();
function tabData(el) {
  const all = Object.values(tasks);
  el.onchange = null;
  el.innerHTML = `<h3>데이터</h3>
  <div class="opt"><div>저장된 할 일<small>전체 ${all.length}개 · 완료 ${all.filter(t => t.doneAt).length}개 · 휴지통 ${all.filter(t => t.delAt).length}개</small></div></div>
  <div class="opt"><div>백업 내려받기<small>할 일과 설정을 파일 하나로 저장합니다</small></div><button class="btn" data-x="export">내려받기</button></div>
  <div class="opt"><div>백업 불러오기<small>지금 내용이 백업 파일로 바뀝니다</small></div><button class="btn" data-x="import">불러오기</button><input type="file" accept=".json" hidden id="importFile"></div>
  <div class="opt"><div>휴지통 비우기<small>되돌릴 수 없습니다</small></div><button class="btn danger" data-x="empty">비우기</button></div>
  <div class="opt"><div>저장 위치<small>이 PC의 Edge 저장소입니다. 사이트 데이터를 지우면 함께 사라지니 가끔 백업해 두세요.</small></div></div>`;
  el.onclick = e => {
    const a = (e.target.closest("[data-x]") || {}).dataset; if (!a || !a.x) return;
    if (a.x === "export") { const u = URL.createObjectURL(new Blob([JSON.stringify({ tasks, prefs: P }, null, 1)], { type: "application/json" })); const l = document.createElement("a"); l.href = u; l.download = `RamBriefing-백업-${today()}.json`; l.click(); URL.revokeObjectURL(u); }
    if (a.x === "import") $("importFile").click();
    if (a.x === "empty" && confirm("휴지통을 비울까요? 되돌릴 수 없습니다.")) { for (const t of Object.values(tasks)) if (t.delAt) delete tasks[t.id]; render(); tabData(el); }
  };
  $("importFile").onchange = async e => {
    try { const j = JSON.parse(await e.target.files[0].text()); if (!j.tasks) throw 0; tasks = j.tasks; Object.assign(P, j.prefs || {}); savePrefs(); render(); tabData(el); toast("백업을 불러왔습니다"); }
    catch { toast("백업 파일을 읽지 못했습니다"); }
  };
}
function tabAbout(el) {
  el.onclick = el.onchange = null;
  el.innerHTML = `<h3>정보</h3>
  <div class="opt"><div>RamBriefing<small>매일 아침 메일·문자·카톡을 모아 할 일로 정리합니다</small></div></div>
  <div class="opt"><div>마지막 브리핑<small>${latest ? esc(latest.time) : "없음"}</small></div></div>
  ${latest ? '<div class="opt"><div>아침 순서<small>05:10 카톡 · 05:50 문자 · 06:00 일정 정리 · 06:45 화면 갱신</small></div></div>' : ""}`;
}
async function tabAccount(el) {
  el.onclick = el.onchange = null;
  if (!window.rb) { el.innerHTML = "<h3>계정</h3><div class=\"opt\"><div>구글 연결은 설치형 앱에서 쓸 수 있습니다</div></div>"; return; }
  await refreshGoogle();
  const st = await window.rb.status(); const secretOn = !!(st.ok && st.value.secret), builtin = !!(st.ok && st.value.builtin);
  el.innerHTML = `<h3>계정</h3>
  <div class="opt"><div>구글 캘린더<small>${googleOn ? "연결됨. 넣은 일정은 구글 캘린더에 바로 들어갑니다" : "구글로 로그인하면 캘린더를 보고 바로 넣을 수 있습니다"}</small></div><button class="btn${googleOn ? "" : " main"}" data-g="${googleOn ? "out" : "in"}">${googleOn ? "로그아웃" : "구글 로그인"}</button></div>
  ${builtin ? "" : `<div class="opt" style="display:block;padding:12px 0"><div>클라이언트 보안 비밀번호<small>${secretOn ? "새 값이 저장되어 있습니다. 바꿀 때만 다시 넣으세요." : "구글 클라우드에서 바꾼 새 값을 붙여 넣고 저장하세요. 다시 표시되지 않습니다."}</small></div>
    <div style="display:flex;gap:8px;margin-top:8px"><input id="secretIn" type="password" autocomplete="off" spellcheck="false" placeholder="GOCSPX-…" aria-label="클라이언트 보안 비밀번호" style="flex:1;min-width:0;height:36px;border:1px solid var(--line-strong);border-radius:8px;background:var(--raised);padding:0 10px"><button class="btn" data-g="secret">저장</button></div></div>`}
  <div class="opt"><div>집·학교 동기화<small>${!googleOn ? "구글로 로그인하면 같은 계정의 컴퓨터끼리 할 일과 완료, 정리 결과가 맞춰집니다" : st.ok && st.value.sync === "relogin" ? "동기화 권한이 없습니다. 로그아웃 후 다시 로그인해 주세요" : st.ok && st.value.syncAt ? "맞춰짐. 내 구글 드라이브의 앱 전용 공간에 저장합니다" : "내 구글 드라이브의 앱 전용 공간에 저장합니다"}</small></div></div>
  <div class="opt"><div>챗봇<small>Antigravity의 구글 계정으로 제미나이가 답합니다. 무료 사용량을 넘으면 잠시 쉬어야 합니다.</small></div></div>`;
  el.onclick = async e => {
    const b = e.target.closest("[data-g]"); if (!b) return;
    if (b.dataset.g === "secret") { const i = $("secretIn"), r = await window.rb.setSecret(i.value); i.value = ""; toast(r.ok ? "저장했습니다. 이제 구글 로그인을 눌러 주세요" : r.error); if (r.ok) tabAccount(el); return; }
    if (b.dataset.g === "in") { b.textContent = "브라우저에서 로그인…"; const r = await window.rb.login(); if (!r.ok) toast(r.error); }
    else await window.rb.logout();
    tabAccount(el);
  };
}
// 컴퓨터 설정: 아침 보고를 받을 컴퓨터를 정한다. 처음 켤 때도 이 화면이 뜬다.
function pcRoleText(s) { if (!s || !s.done) return ""; return s.role === "this" ? "아침 보고: 이 컴퓨터" : s.role === "other" ? "보고는 " + (reportPc || "다른") + " 컴퓨터에서 받아요" : "아침 보고: 사용 안 함"; }
function showRole(s) { const t = pcRoleText(s), e = $("pcRole"); e.textContent = t; e.hidden = !t; }
async function tabPc(el, first) {
  if (!window.rb || !window.rb.getSetup) { el.innerHTML = '<h3>컴퓨터</h3><div class="opt"><div>컴퓨터 설정은 설치형 앱에서 쓸 수 있습니다</div></div>'; return; }
  el.innerHTML = '<h3>컴퓨터</h3><p class="dz-hint">확인하는 중…</p>';
  const [a, b] = await Promise.all([window.rb.getSetup(), window.rb.checkEnv()]);
  const env = b.ok ? b.value : { pc: "" };
  const s = Object.assign({ role: "this", sources: env.claude === "ok" ? ["kakao", "sms", "mail"] : ["kakao", "sms"], time: "06:00", engine: env.claude === "ok" ? "claude" : "gemini" }, a.ok ? a.value : {});
  const LINE = (ok, name, msg) => '<div class="chk-row"><i class="' + (ok ? "ok" : "no") + '">' + (ok ? "✓" : "!") + "</i><div><b>" + esc(name) + "</b><small>" + esc(msg) + "</small></div></div>";
  const kakaoMsg = { ok: ["카톡 PC 로그인됨", 1], login: ["로그인되어 있지 않아요. 아침에 로그아웃 상태면 카톡만 건너뛰고 나머지를 정리해요", 0], off: ["꺼져 있어요. 아침에 자동으로 켜 보지만, 로그인이 풀려 있으면 건너뛰어요", 0], none: ["이 컴퓨터에 카카오톡 PC가 없어요", 0] }[env.kakao] || ["확인하지 못했어요", 0];
  const checks = env.auto ? LINE(kakaoMsg[1], "카카오톡", kakaoMsg[0]) + LINE(env.phone === "ok", "휴대폰과 연결", env.phone === "ok" ? "설치됨. 휴대폰 연결은 아침에 다시 확인해요" : "설치되어 있지 않아요") + '<div id="aiCheck"></div>' : '<p class="dz-hint">아침 정리 파일을 찾지 못했습니다. 다시 설치해 주세요.</p>';
  const moved = reportPc && reportPc !== env.pc ? '<div class="move-note" id="moveNote"><b>지금 보고 컴퓨터는 ' + esc(reportPc) + '예요.</b><br>여기로 옮기면 ' + esc(reportPc) + '의 예약은 그 컴퓨터에서 앱을 켤 때 꺼져요. 카톡 PC 로그인은 한 대만 되니, 여기서 카톡에 로그인하면 ' + esc(reportPc) + '의 카톡은 로그아웃돼요.</div>' : "";
  const R = (v, t, d) => '<label class="role-card"><input type="radio" name="pcRole" value="' + v + '"' + (s.role === v ? " checked" : "") + "><span><b>" + t + "</b><small>" + d + "</small></span></label>";
  const C = (v, t) => '<label class="src-chip"><input type="checkbox" data-src="' + v + '"' + (s.sources.includes(v) ? " checked" : "") + "><span>" + t + "</span></label>";
  el.innerHTML = "<h3>" + (first ? "처음 설정" : "컴퓨터") + '</h3><p class="dz-hint">지금 컴퓨터: <b>' + esc(env.pc || "알 수 없음") + "</b></p>"
    + '<div class="set-q">아침 보고를 받을 컴퓨터가 지금 이 컴퓨터인가요?</div><div class="role-list">'
    + R("this", "네, 이 컴퓨터예요", "이 컴퓨터에 아침 예약을 걸어요. 그 시각에 꺼져 있으면 다음에 켤 때 바로 실행해요.")
    + R("other", "아니요, 다른 컴퓨터예요", "이 컴퓨터에서는 예약을 끄고 할 일만 봐요.")
    + R("later", "아직 모르겠어요", "할 일 앱으로만 써요. 여기서 나중에 바꿀 수 있어요.") + "</div>" + moved
    + '<div id="pcThis"><div class="set-q">무엇을 읽을까요?</div><div class="src-list">' + C("kakao", "카톡") + C("sms", "휴대폰 문자") + C("mail", "메일") + "</div>"
    + '<div class="set-q">몇 시에 받을까요?</div><input type="time" id="pcTime" class="pc-time" value="' + esc(s.time) + '" aria-label="받을 시각"><p class="dz-hint" style="margin-top:6px">카톡은 50분 전, 문자는 10분 전부터 미리 읽어요.</p>'
    + '<div class="set-q">무엇으로 정리할까요?</div><div class="role-list">'
    + '<label class="role-card"><input type="radio" name="pcAi" value="gemini"' + (s.engine === "gemini" ? " checked" : "") + '><span><b>무료 제미나이</b><small>구글 AI Studio에서 받은 무료 키를 넣어요. 메일은 읽지 않고, 일정은 할 일에서 눌러 넣어요.</small></span></label>'
    + (env.claude === "ok" ? '<label class="role-card"><input type="radio" name="pcAi" value="claude"' + (s.engine === "claude" ? " checked" : "") + '><span><b>Claude 구독</b><small>메일까지 읽고 일정을 캘린더에 바로 넣어요.</small></span></label>' : "") + "</div>"
    + '<div id="aiKey" class="key-row"><input id="geminiIn" type="password" autocomplete="off" spellcheck="false" placeholder="제미나이 키 붙여 넣기" aria-label="제미나이 키"><button class="btn" data-pc="key">확인 후 저장</button><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">무료 키 받기</a></div>'
    + '<div class="set-q">준비 점검 <button class="btn" data-pc="check" style="min-height:30px;margin-left:8px">다시 점검</button></div>' + checks + "</div>"
    + '<div class="dz-foot"><button class="btn main" data-pc="save">저장</button></div>';
  let hasKey = !!env.gemini;
  const sync = () => {
    const role = el.querySelector('input[name="pcRole"]:checked').value, ai = el.querySelector('input[name="pcAi"]:checked').value;
    $("pcThis").hidden = role !== "this"; if ($("moveNote")) $("moveNote").hidden = role !== "this";
    $("aiKey").hidden = ai !== "gemini";
    const m = el.querySelector('[data-src="mail"]'); m.disabled = ai === "gemini"; if (ai === "gemini") m.checked = false;
    if ($("aiCheck")) $("aiCheck").innerHTML = ai === "gemini" ? LINE(hasKey, "무료 제미나이", hasKey ? "키 저장됨" : "키를 넣어 주세요") : LINE(true, "Claude", "설치됨");
  };
  sync(); el.onchange = sync; requestAnimationFrame(() => { el.closest(".m-main").scrollTop = 0; });
  el.onclick = async e => {
    const x = e.target.closest("[data-pc]"); if (!x) return;
    if (x.dataset.pc === "check") return tabPc(el, first);
    if (x.dataset.pc === "key") { const i = $("geminiIn"); x.disabled = true; x.textContent = "확인하는 중…"; const k = await window.rb.setGemini(i.value); i.value = ""; x.disabled = false; x.textContent = "확인 후 저장"; if (k.ok) { hasKey = true; sync(); toast("제미나이 키를 저장했습니다"); } else toast(k.error); return; }
    x.disabled = true; x.textContent = "적용하는 중…";
    const r = await window.rb.saveSetup({ role: el.querySelector('input[name="pcRole"]:checked').value, sources: [...el.querySelectorAll("[data-src]:checked")].map(i => i.dataset.src), time: $("pcTime").value, engine: el.querySelector('input[name="pcAi"]:checked').value });
    x.disabled = false; x.textContent = "저장";
    if (!r.ok) { toast(r.error); return; }
    showRole(r.value); toast("저장했습니다"); if (first) closeSettings();
  };
}
function setTab(name) {
  document.querySelectorAll(".m-side [data-tab]").forEach(b => b.setAttribute("aria-current", b.dataset.tab === name));
  const el = $("settingsBody"); el.onclick = el.onchange = null;
  if (name === "general") tabGeneral(el);
  if (name === "pc") tabPc(el);
  if (name === "design") { el.innerHTML = '<h3>디자인</h3><div id="skinMount"></div>'; window.RBSkin.mount($("skinMount")); }
  if (name === "account") tabAccount(el);
  if (name === "data") tabData(el);
  if (name === "about") tabAbout(el);
}
function closeSettings() { $("settingsBack").hidden = true; $("openSettings").focus(); }
$("openSettings").onclick = () => { $("settingsBack").hidden = false; setTab("general"); };
$("settingsX").onclick = closeSettings;
$("settingsBack").addEventListener("mousedown", e => { if (e.target.id === "settingsBack") closeSettings(); });
// 설정 창 끌어서 옮기기: 스킨을 고르면서 뒤 화면을 볼 수 있게. 버튼·입력칸·스크롤바에서는 끌지 않는다.
(() => {
  const box = document.querySelector("#settingsBack .modal"); let x = 0, y = 0, from = null;
  const move = (nx, ny) => { const r = box.getBoundingClientRect(), keep = 80; x = Math.min(innerWidth - keep - (r.left - x), Math.max(keep - r.width - (r.left - x), nx)); y = Math.min(innerHeight - 40 - (r.top - y), Math.max(-(r.top - y), ny)); box.style.transform = `translate(${x}px,${y}px)`; };
  box.addEventListener("mousedown", e => {
    if (e.button !== 0 || e.target.closest("button,a,input,select,textarea,label,option")) return;
    const main = e.target.closest(".m-main"); if (main && e.clientX > main.getBoundingClientRect().right - 20) return;
    from = { px: e.clientX, py: e.clientY, x, y }; box.classList.add("dragging"); e.preventDefault();
  });
  window.addEventListener("mousemove", e => { if (from) move(from.x + e.clientX - from.px, from.y + e.clientY - from.py); });
  window.addEventListener("mouseup", () => { from = null; box.classList.remove("dragging"); });
  window.addEventListener("resize", () => move(x, y));
})();
document.querySelector(".m-side").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });

// 시작
$("gear").innerHTML = I.gear; $("plus").innerHTML = I.plus; $("noteX").innerHTML = I.x; $("settingsX").innerHTML = I.x;
const loadDay = day => new Promise(ok => {
  window.RAM_DATA = null;
  const s = document.createElement("script"); s.src = "data/" + day + ".js";
  s.onload = () => ok(window.RAM_DATA); s.onerror = () => ok(null);
  document.head.appendChild(s);
});
(async function start() {
  if (window.rb && window.rb.getBriefings) { const b = await window.rb.getBriefings(); if (b.ok) for (const d of b.value) { briefsSeen[d.date + d.time] = 1; ingest(d); } }
  else for (const day of [...(window.RAM_DAYS || [])].sort()) { const d = await loadDay(day); if (d) ingest(d); }
  migrate(); await refreshGoogle(); render(); takeSnap();
  if (latest) notice(latest);
  document.addEventListener("rb-skin", () => renderHead());
  const hash = location.hash.slice(1);
  if (hash === "all") { page = "all"; render(); }
  if (hash === "news") { page = "news"; render(); }
  if (window.rb && window.rb.getSetup) { const su = await window.rb.getSetup(); if (su.ok) { showRole(su.value); if (!su.value.done && !hash.startsWith("set-")) { $("settingsBack").hidden = false; document.querySelectorAll(".m-side [data-tab]").forEach(b => b.setAttribute("aria-current", b.dataset.tab === "pc")); tabPc($("settingsBody"), true); } } }
  if (hash.startsWith("set-")) { $("settingsBack").hidden = false; setTab(hash.slice(4)); }
  syncNow(); setInterval(() => syncNow(), 10 * 60000); window.addEventListener("focus", () => syncNow());
  // 자정이 지나면 완료한 일이 기록으로 넘어가도록 다시 그린다
  let last = today(); setInterval(() => { if (today() !== last) { last = today(); render(); } }, 60000);
})();

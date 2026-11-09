// RamBriefing 스킨: 스킨을 고르고, 색·글자·모양을 세부 조정한다. 설정은 이 PC에만 저장된다.
(function () {
  const KEY = "rb.skin";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch { return false; } };

  // 이름, 묶음, 배경, 카드, 글자, 포인트, 밝기(dark), 벽지(wall)
  const DREAM = (a, b, c, base) => `radial-gradient(900px 620px at 8% 0,${a} 0,transparent 62%),radial-gradient(900px 700px at 100% 0,${b} 0,transparent 62%),radial-gradient(900px 700px at 70% 100%,${c} 0,transparent 62%),${base}`;
  const S = (name, group, bg, card, text, accent, extra) => Object.assign({ name, group, bg, card, text, accent }, extra || {});
  const F = n => `"${n}","Pretendard","Malgun Gothic",sans-serif`;
  const SKINS = [
    S("교실 칠판", "테마", "#2a5646", "#2c5a48", "#f6f3ea", "#ffe58a", { style: "chalk", dark: 1, font: F("Gaegu"), fontT: F("Nanum Pen Script"), wall: "radial-gradient(900px 600px at 30% 15%,#37725b,transparent 70%),#264f40" }),
    S("픽셀 RPG", "테마", "#7cc4ff", "#1c2470", "#ffffff", "#ffd23f", { style: "rpg", dark: 1, font: F("Galmuri11"), fontT: F("Galmuri14"), wall: "linear-gradient(#4aa8f5 0 14%,#62b6fa 14% 26%,#7cc4ff 26% 37%,#9ad2ff 37% 46%,#bce2ff 46% 54%,#dbf0ff 54% 70%,#7ee07a 70% 71%,#3e9e48 71% 72%,#58c25b 72%)" }),
    S("공항 전광판", "테마", "#0f1114", "#16191e", "#f3eedb", "#ffc400", { style: "depart", dark: 1, fontT: F("Do Hyeon"), wall: "radial-gradient(1200px 400px at 50% 0,#1d2128,#0d0f12 70%)" }),
    S("그림책", "테마", "#fbf3fb", "#fffaf2", "#4a3a5c", "#c65488", { style: "book", font: F("Gowun Dodum"), fontT: F("Gamja Flower"), wall: "radial-gradient(600px 420px at 10% 15%,#ffd6e7,transparent 70%),radial-gradient(700px 520px at 92% 25%,#d6e2ff,transparent 70%),radial-gradient(800px 420px at 50% 105%,#dcf7e8,transparent 70%),#fbf3fb" }),
    S("레트로 컴퓨터", "테마", "#e6cfff", "#f6f0ff", "#2b2140", "#7c5ce0", { style: "retro", font: F("Galmuri11"), fontT: F("Galmuri14"), wall: "linear-gradient(#ffc8e2 0%,#e6cfff 48%,#c6e3ff 100%)" }),
    S("바다 수족관", "테마", "#2a8fc4", "#2a7fbd", "#ffffff", "#fff36b", { style: "sea", dark: 1, fontT: F("Jua"), wall: "linear-gradient(#d2f8ff 0%,#86def0 16%,#45b5dc 42%,#2a7fbd 72%,#1d558f 100%)" }),
    S("보드게임 말판", "테마", "#f0d9b5", "#fffaf0", "#4a3466", "#6b3fa0", { style: "game", fontT: F("Jua"), wall: "repeating-linear-gradient(90deg,#f0d9b5 0 150px,#ead0a8 150px 300px)" }),
    S("파스텔 드림", "대표", "#f4eefb", "#ffffff", "#35274f", "#b06ee8", { style: "dream", alpha: 78, wall: DREAM("#f6dcff", "#c6f4f1", "#ffd3e6", "#f4eefb") }),
    S("스티커 다이어리", "대표", "#fff9ec", "#fffdf6", "#3f3323", "#d9822b", { style: "sticker" }),
    S("아침 신문", "대표", "#faf8f3", "#faf8f3", "#141414", "#c22121", { style: "news" }),
    S("밤하늘 보드", "대표", "#0c0f1f", "#171a30", "#eef0ff", "#a78bfa", { style: "night", dark: 1, alpha: 72, wall: DREAM("#3b2a7a", "#0e4f63", "#1b1440", "#0c0f1f") }),
    S("벚꽃 드림", "드림", "#fff0f6", "#ffffff", "#4a2238", "#e8588f", { style: "dream", alpha: 80, wall: DREAM("#ffd6e7", "#ffe9d6", "#ffc4dc", "#fff0f6") }),
    S("민트 드림", "드림", "#e9fbf6", "#ffffff", "#123d36", "#17a58f", { style: "dream", alpha: 80, wall: DREAM("#c9f7ea", "#cfeeff", "#dff7c9", "#e9fbf6") }),
    S("하늘 드림", "드림", "#ecf5ff", "#ffffff", "#1b3355", "#3f8cf0", { style: "dream", alpha: 80, wall: DREAM("#cfe6ff", "#e4dcff", "#c9f2ff", "#ecf5ff") }),
    S("노을 드림", "드림", "#fff1e8", "#ffffff", "#47241a", "#ef6c3f", { style: "dream", alpha: 80, wall: DREAM("#ffd9a8", "#ffc1c1", "#d9b8f2", "#fff1e8") }),
    S("크라프트", "스티커", "#efe2c8", "#f8efdc", "#3a2c18", "#a4622a", { style: "sticker" }),
    S("하늘 메모", "스티커", "#eaf4fb", "#f7fbff", "#1f3345", "#2f7fb8", { style: "sticker" }),
    S("밤 메모", "스티커", "#23202b", "#2f2b3a", "#f3eefb", "#f2b84b", { style: "sticker", dark: 1 }),
    S("세피아 신문", "신문", "#f2e7d3", "#f2e7d3", "#2b2115", "#8c3b1a", { style: "news" }),
    S("푸른 신문", "신문", "#eef2f7", "#eef2f7", "#0f2138", "#1f5fb8", { style: "news" }),
    S("먹지 신문", "신문", "#141416", "#141416", "#f1efe9", "#ffd23f", { style: "news", dark: 1 }),
    S("심해 보드", "보드", "#061a22", "#0d2933", "#dff5f7", "#2dd4bf", { style: "night", dark: 1, alpha: 74, wall: DREAM("#0f5163", "#123d6b", "#0a2f3f", "#061a22") }),
    S("와인 보드", "보드", "#1b0d16", "#2c1522", "#fbe9f2", "#f472b6", { style: "night", dark: 1, alpha: 74, wall: DREAM("#6b1d4a", "#3a1a5e", "#4a1230", "#1b0d16") }),
    S("숲 보드", "보드", "#0f1a12", "#1b2a1e", "#e6f4e4", "#86d36b", { style: "night", dark: 1, alpha: 74, wall: DREAM("#1f5a3a", "#16484f", "#2c4a1c", "#0f1a12") }),
    S("기본", "차분한", "#f4f2ef", "#ffffff", "#1c1b1f", "#d9472f"),
    S("종이", "차분한", "#f5f1e8", "#fffdf8", "#2a2620", "#a16207"),
    S("모노", "차분한", "#f2f2f2", "#ffffff", "#000000", "#000000"),
    S("안개", "차분한", "#eceff3", "#f9fafb", "#1f2933", "#52606d"),
    S("연필", "차분한", "#e9e9e6", "#f6f6f3", "#2b2b28", "#5b6b5a"),
    S("벚꽃", "산뜻한", "#fdf0f4", "#ffffff", "#3b1d28", "#db2777"),
    S("민트", "산뜻한", "#e9f8f3", "#ffffff", "#0f2f28", "#0d9488"),
    S("하늘", "산뜻한", "#e9f4fd", "#ffffff", "#0f2a43", "#0284c7"),
    S("라벤더", "산뜻한", "#f1eefb", "#ffffff", "#2a2147", "#7c3aed"),
    S("레몬", "산뜻한", "#fdf8e1", "#fffef6", "#3a3208", "#ca8a04"),
    S("복숭아", "산뜻한", "#feeee4", "#fffaf6", "#40210f", "#ea580c"),
    S("숲", "산뜻한", "#e8f0e4", "#fbfdf9", "#1c2e19", "#3f7d32"),
    S("밤하늘", "어두운", "#0f1424", "#182036", "#e7ecf8", "#7c9cff", { dark: 1 }),
    S("먹", "어두운", "#101013", "#1a1a1f", "#ececf1", "#a5b4fc", { dark: 1 }),
    S("심해", "어두운", "#07191f", "#0e2830", "#dcf1f4", "#2dd4bf", { dark: 1 }),
    S("와인", "어두운", "#1b0d13", "#2a141d", "#f7e6ec", "#f472b6", { dark: 1 }),
    S("커피", "어두운", "#1c1512", "#2a201b", "#f0e6dc", "#d9a066", { dark: 1 }),
    S("이끼", "어두운", "#10170f", "#1a2418", "#e4efe0", "#8fd16f", { dark: 1 }),
    S("노을", "그림", "#fff1e8", "#ffffff", "#3a1c17", "#e8590c", { wall: "linear-gradient(135deg,#ffd9a8 0%,#ffb0a8 45%,#c9a7f0 100%)", alpha: 72 }),
    S("오로라", "그림", "#0d1a2b", "#14233a", "#e6f2fb", "#5eead4", { dark: 1, wall: "linear-gradient(135deg,#0b1d3a 0%,#0e5a6b 50%,#3b2a78 100%)", alpha: 66 }),
    S("바다", "그림", "#e4f4fb", "#ffffff", "#0f2f43", "#0369a1", { wall: "linear-gradient(160deg,#c6f1ff 0%,#8fd3f4 50%,#84a9f0 100%)", alpha: 74 }),
    S("봄날", "그림", "#fdf3f7", "#ffffff", "#3a2030", "#e11d7a", { wall: "linear-gradient(135deg,#fcdce6 0%,#fff2cf 50%,#d6f3df 100%)", alpha: 76 }),
    S("밤거리", "그림", "#120f22", "#1c1833", "#efeafc", "#f472b6", { dark: 1, wall: "linear-gradient(135deg,#1a1036 0%,#3a1458 50%,#0b3a5e 100%)", alpha: 62 }),
    S("모래", "그림", "#f4ecdf", "#fffaf1", "#35291a", "#b7791f", { wall: "linear-gradient(135deg,#efe2c8 0%,#e7d0ae 55%,#d9c6a8 100%)", alpha: 80 }),
  ];
  const FONTS = {
    "스킨 기본": "",
    "프리텐다드": '"Pretendard",system-ui,"Malgun Gothic",sans-serif',
    "맑은 고딕": '"Malgun Gothic",sans-serif',
    "바탕(명조)": '"Batang","Noto Serif KR",serif',
    "개구 (손글씨)": F("Gaegu"),
    "나눔펜 (분필 글씨)": F("Nanum Pen Script"),
    "감자꽃 (동화)": F("Gamja Flower"),
    "고운돋움": F("Gowun Dodum"),
    "주아 (둥근 글씨)": F("Jua"),
    "도현 (굵은 글씨)": F("Do Hyeon"),
    "갈무리 (픽셀)": F("Galmuri11"),
  };
  const TEXTS = [["myTitle", "오늘 화면 제목", "비우면 스킨에 맞는 제목"], ["myName", "부를 이름", "비우면 이름 없이 표시"], ["myLine", "한 줄 문구", "천천히, 그래도 꾸준히"]];
  const DEFAULT = { skin: "파스텔 드림", zoom: 100, radius: 12, col: 360, gap: 10, alpha: 100, blur: 12, shadow: 1, font: "스킨 기본", fontT: "스킨 기본", fontV2: 1 };
  let st = Object.assign({}, DEFAULT, load());
  if (!st.fontV2) { st.font = "스킨 기본"; st.fontT = "스킨 기본"; st.fontV2 = 1; }
  const previewSkin = new URLSearchParams(location.search).get("skin"); if (previewSkin) st.skin = previewSkin;
  const skinOf = n => SKINS.find(s => s.name === n) || SKINS[0];
  const root = document.documentElement;

  function apply() {
    const s = skinOf(st.skin), v = (k, d) => (st[k] != null ? st[k] : d);
    const bg = v("bg", s.bg), card = v("card", s.card), text = v("text", s.text), accent = v("accent", s.accent);
    const dark = !!s.dark, r = root.style;
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-style", s.style || "clean");
    r.setProperty("color-scheme", dark ? "dark" : "light");
    const alpha = st.alphaTouched ? st.alpha : (s.alpha != null ? s.alpha : st.alpha);
    const glass = alpha < 100;
    const set = (k, val) => r.setProperty(k, val);
    set("--bg", bg);
    set("--surface", glass ? `color-mix(in srgb,${card} ${alpha}%,transparent)` : card);
    set("--raised", card);
    set("--text", text);
    set("--text-2", `color-mix(in srgb,${text} 88%,${card})`);
    set("--text-3", `color-mix(in srgb,${text} 70%,${card})`);
    set("--line", `color-mix(in srgb,${text} 11%,${card})`);
    set("--line-strong", `color-mix(in srgb,${text} 22%,${card})`);
    set("--hover", `color-mix(in srgb,${text} 7%,${card})`);
    set("--accent", accent);
    set("--accent-soft", `color-mix(in srgb,${accent} 14%,${card})`);
    set("--accent-text", dark ? `color-mix(in srgb,${accent} 75%,#fff)` : `color-mix(in srgb,${accent} 85%,#000)`);
    set("--warn-soft", `color-mix(in srgb,#d97706 14%,${card})`);
    set("--warn", dark ? "#fbbf24" : "#b45309");
    set("--danger", dark ? "#f87171" : "#dc2626");
    set("--ok", dark ? "#4ade80" : "#16794c");
    const sh = +st.shadow;
    set("--shadow", sh ? `0 1px 2px rgba(0,0,0,${dark ? .3 : .05})` : "none");
    set("--shadow-lift", sh > 1 ? `0 12px 30px -10px rgba(0,0,0,${dark ? .7 : .22})` : sh ? `0 8px 24px -8px rgba(0,0,0,${dark ? .6 : .14})` : "none");
    const body = FONTS[st.font] || s.font || FONTS["프리텐다드"];
    set("--font", body);
    set("--font-t", FONTS[st.fontT] || s.fontT || body);
    set("--r", st.radius + "px"); set("--col", st.col + "px"); set("--gap", st.gap + "px");
    set("--wall", st.photo ? `url("${st.photo}") center/cover fixed` : (s.wall || bg));
    set("--blur", glass ? `blur(${st.blur}px)` : "none");
    r.zoom = st.zoom / 100;
    document.dispatchEvent(new Event("rb-skin"));
  }
  apply();   // 그리기 전에 적용

  const persist = () => { if (!save(st) && st.photo) { delete st.photo; save(st); alert("사진이 너무 커서 저장하지 못했습니다"); apply(); } };
  const change = (k, val) => { st[k] = val; if (k === "alpha") st.alphaTouched = true; apply(); persist(); sync(); };
  const pick = name => { // 스킨을 고르면 그 스킨의 색으로 돌아간다 (모양 설정은 유지)
    st.skin = name; ["bg", "card", "text", "accent", "photo", "alphaTouched"].forEach(k => delete st[k]);
    if (skinOf(name).alpha == null) st.alpha = 100;
    apply(); persist(); sync();
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const css = `
  .sk-open{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;color:var(--text-2)}
  .sk-open:hover{background:var(--hover);color:var(--text)}
  .sk-back{position:fixed;inset:0;background:rgba(0,0,0,.28);z-index:40}
  .sk-panel{position:fixed;top:0;right:0;bottom:0;width:372px;max-width:100vw;z-index:41;background:var(--raised);color:var(--text);border-left:1px solid var(--line);display:flex;flex-direction:column;box-shadow:-12px 0 32px rgba(0,0,0,.18)}
  .sk-h{flex:none;display:flex;align-items:center;padding:14px 12px 14px 20px;border-bottom:1px solid var(--line);font-size:17px;font-weight:700}
  .sk-h button{margin-left:auto;width:32px;height:32px;border-radius:8px;display:grid;place-items:center;color:var(--text-2)}
  .sk-h button:hover{background:var(--hover)}
  .sk-b{flex:1;min-height:0;overflow-y:auto;padding:6px 20px 20px}
  .sk-b h4{margin:18px 0 8px;font-size:14px;font-weight:700;color:var(--text-2)}
  .sk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .sk-t{border:2px solid var(--line);border-radius:10px;padding:0 0 5px;overflow:hidden;text-align:center;font-size:13px;font-weight:600;color:var(--text-2);background:none}
  .sk-t:hover{border-color:var(--line-strong)}
  .sk-t[aria-pressed="true"]{border-color:var(--accent);color:var(--text)}
  .sk-t i{display:block;height:48px;margin-bottom:4px;position:relative}
  .sk-t i b{position:absolute;left:10px;right:10px;top:10px;bottom:10px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,.15)}
  .sk-t i u{position:absolute;right:15px;bottom:15px;width:15px;height:8px;border-radius:3px}
  .sk-row{display:flex;align-items:center;gap:12px;min-height:38px;font-size:14.5px}
  .sk-row label{flex:0 0 96px;color:var(--text-2)}
  .sk-row input[type=range]{flex:1;min-width:0;accent-color:var(--accent)}
  .sk-row output{flex:0 0 46px;text-align:right;font-size:13.5px;color:var(--text-3)}
  .sk-row input[type=color]{width:44px;height:30px;padding:2px;border:1px solid var(--line-strong);border-radius:7px;background:none;cursor:pointer}
  .sk-row select{flex:1;height:34px;border:1px solid var(--line-strong);border-radius:8px;background:var(--raised);color:var(--text);padding:0 8px;font-size:14.5px}
  .sk-row code{font-size:13px;color:var(--text-3);font-family:inherit}
  .sk-btn{height:36px;padding:0 12px;border:1px solid var(--line-strong);border-radius:8px;font-size:14px;font-weight:600;color:var(--text-2)}
  .sk-btn:hover{background:var(--hover);color:var(--text)}
  .sk-f{flex:none;display:flex;gap:8px;padding:12px 20px;border-top:1px solid var(--line)}
  .sk-f .sk-btn{flex:1}`;
  const ranges = [["zoom", "글자 크기", 80, 150, 5, "%"], ["radius", "모서리", 0, 24, 1, "px"], ["col", "칸 너비", 280, 520, 10, "px"], ["gap", "카드 간격", 4, 24, 1, "px"], ["alpha", "카드 불투명", 40, 100, 2, "%"], ["blur", "유리 흐림", 0, 30, 1, "px"]];
  const colors = [["accent", "포인트"], ["bg", "배경"], ["card", "카드"], ["text", "글자"]];
  let panel = null, back = null;
  const toHex = c => /^#[0-9a-f]{6}$/i.test(c) ? c : "#000000";
  function sync() {
    if (!panel) return;
    const s = skinOf(st.skin);
    panel.querySelectorAll(".sk-t").forEach(b => b.setAttribute("aria-pressed", b.dataset.s === st.skin));
    colors.forEach(([k]) => { const i = panel.querySelector(`[data-c="${k}"]`); i.value = toHex(st[k] || s[k]); i.nextElementSibling.textContent = i.value; });
    ranges.forEach(([k, , , , , u]) => {
      const i = panel.querySelector(`[data-r="${k}"]`);
      const val = k === "alpha" && !st.alphaTouched && s.alpha != null ? s.alpha : st[k];
      i.value = val; i.nextElementSibling.textContent = val + u;
    });
    panel.querySelector("[data-f]").value = st.font;
    panel.querySelector("[data-ft]").value = st.fontT;
    TEXTS.forEach(([k]) => { const i = panel.querySelector(`[data-t="${k}"]`); if (document.activeElement !== i) i.value = st[k] || ""; });
    panel.querySelector("[data-sh]").value = st.shadow;
  }
  function mount(el) {
    panel = el;
    const groups = [...new Set(SKINS.map(s => s.group))];
    const card = s => `<button class="sk-t" data-s="${esc(s.name)}"><i style="background:${s.wall || s.bg}"><b style="background:${s.card}"></b><u style="background:${s.accent}"></u></i><span>${esc(s.name)}</span></button>`;
    const VIEWS = [["skin", "스킨"], ["text", "글자·글꼴"], ["color", "색"], ["shape", "모양"], ["wall", "배경"]];
    const fontSel = (attr, label) => `<div class="sk-row"><label>${label}</label><select ${attr} aria-label="${label}">${Object.keys(FONTS).map(f => `<option style="font-family:${esc(FONTS[f] || "inherit")}">${esc(f)}</option>`).join("")}</select></div>`;
    const seg = (cls, items, attr) => `<div class="${cls}">` + items.map(([k, l]) => `<button ${attr}="${esc(k)}">${esc(l)}</button>`).join("") + "</div>";
    panel.innerHTML = seg("dz-tabs", VIEWS, "data-view")
      + `<section data-pane="skin">${seg("dz-chips", groups.map(g => [g, g]), "data-group")}`
      + groups.map(g => `<div class="dz-grid" data-grid="${esc(g)}">${SKINS.filter(s => s.group === g).map(card).join("")}</div>`).join("") + `</section>`
      + `<section data-pane="text"><p class="dz-hint">화면에 나오는 글자와 글꼴을 바꿉니다. 스킨을 바꿔도 그대로 남습니다.</p>`
      + TEXTS.map(([k, l, ph]) => `<div class="sk-row"><label>${l}</label><input class="sk-in" data-t="${k}" maxlength="30" placeholder="${esc(ph)}" aria-label="${l}"></div>`).join("")
      + fontSel("data-ft", "제목 글꼴") + fontSel("data-f", "본문 글꼴")
      + ranges.filter(r => r[0] === "zoom").map(([k, l, a, b, st2]) => `<div class="sk-row"><label>${l}</label><input type="range" data-r="${k}" min="${a}" max="${b}" step="${st2}" aria-label="${l}"><output></output></div>`).join("") + `</section>`
      + `<section data-pane="color"><p class="dz-hint">스킨 색 위에 내 색을 덧입힙니다. 스킨을 다시 고르면 스킨 색으로 돌아갑니다.</p>`
      + colors.map(([k, l]) => `<div class="sk-row"><label>${l}</label><input type="color" data-c="${k}" aria-label="${l} 색"><code></code></div>`).join("") + `</section>`
      + `<section data-pane="shape">` + ranges.filter(r => r[0] !== "alpha" && r[0] !== "blur" && r[0] !== "zoom").map(([k, l, a, b, st2]) => `<div class="sk-row"><label>${l}</label><input type="range" data-r="${k}" min="${a}" max="${b}" step="${st2}" aria-label="${l}"><output></output></div>`).join("")
      + `<div class="sk-row"><label>그림자</label><select data-sh aria-label="그림자"><option value="0">없음</option><option value="1">보통</option><option value="2">진하게</option></select></div>`
      + `</section>`
      + `<section data-pane="wall"><div class="sk-row"><label>배경 사진</label><button class="sk-btn" data-photo>사진 고르기</button><button class="sk-btn" data-nophoto>사진 빼기</button><input type="file" accept="image/*" hidden data-file></div>`
      + ranges.filter(r => r[0] === "alpha" || r[0] === "blur").map(([k, l, a, b, st2]) => `<div class="sk-row"><label>${l}</label><input type="range" data-r="${k}" min="${a}" max="${b}" step="${st2}" aria-label="${l}"><output></output></div>`).join("") + `</section>`
      + `<div class="dz-foot"><button class="sk-btn" data-reset>처음 상태로 되돌리기</button></div>`;
    const view = v => { panel.querySelectorAll("[data-pane]").forEach(p => { p.hidden = p.dataset.pane !== v; }); panel.querySelectorAll("[data-view]").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === v)); };
    const group = g => { panel.querySelectorAll("[data-grid]").forEach(p => { p.hidden = p.dataset.grid !== g; }); panel.querySelectorAll("[data-group]").forEach(b => b.setAttribute("aria-pressed", b.dataset.group === g)); };
    view("skin"); group(skinOf(st.skin).group);
    panel.addEventListener("click", e => { const b = e.target.closest("[data-view],[data-group]"); if (!b) return; if (b.dataset.view) view(b.dataset.view); if (b.dataset.group) group(b.dataset.group); });
    panel.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.s) pick(b.dataset.s);
      if ("reset" in b.dataset) { st = Object.assign({}, DEFAULT); apply(); persist(); sync(); }
      if ("photo" in b.dataset) panel.querySelector("[data-file]").click();
      if ("nophoto" in b.dataset) { delete st.photo; apply(); persist(); }
    });
    panel.addEventListener("input", e => {
      const t = e.target;
      if (t.dataset.c) change(t.dataset.c, t.value);
      if (t.dataset.r) change(t.dataset.r, +t.value);
      if ("f" in t.dataset) change("font", t.value);
      if ("ft" in t.dataset) change("fontT", t.value);
      if (t.dataset.t) change(t.dataset.t, t.value.trim());
      if ("sh" in t.dataset) change("shadow", +t.value);
    });
    panel.querySelector("[data-file]").addEventListener("change", e => {
      const f = e.target.files[0]; if (!f) return;
      const img = new Image();
      img.onload = () => {  // 저장 공간에 맞게 줄여서 보관
        const k = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        st.photo = c.toDataURL("image/jpeg", .78);
        if (!st.alphaTouched && (skinOf(st.skin).alpha == null)) { st.alpha = 80; st.alphaTouched = true; }
        apply(); persist(); sync(); URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(f);
    });
    sync();
  }
  document.addEventListener("DOMContentLoaded", () => {
    const tag = document.createElement("style"); tag.textContent = css; document.head.appendChild(tag);
  });
  const texts = () => ({ title: st.myTitle || "", name: st.myName || "", line: st.myLine || "천천히, 그래도 꾸준히" });
  window.RBSkin = { mount, count: SKINS.length, texts };
})();

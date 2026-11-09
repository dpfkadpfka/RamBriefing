// 챗봇 창. 설치형 앱에서만 켜진다.
(function () {
  if (!window.rb) return;
  const history = [];
  const box = document.createElement("div");
  box.innerHTML = `<button class="chat-fab" id="chatOpen" aria-label="챗봇 열기" title="챗봇">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg></button>
  <section class="chat" id="chat" hidden aria-label="챗봇">
    <div class="chat-h"><b>브리핑 비서</b><span>제미나이</span><button class="icon" id="chatX" aria-label="챗봇 닫기">${I.x}</button></div>
    <div class="chat-log" id="chatLog" aria-live="polite"><div class="say bot">무엇을 도와드릴까요? 예: 이번 주 할 일 정리해 줘, 11/12 14시 회의 캘린더에 넣어 줘</div></div>
    <form class="chat-f" id="chatForm"><textarea id="chatIn" rows="1" placeholder="물어보기" aria-label="챗봇에게 물어보기"></textarea><button class="btn main" id="chatSend">보내기</button></form>
  </section>`;
  document.body.appendChild(box);
  const log = $("chatLog"), input = $("chatIn");
  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const say = (cls, text) => { const d = document.createElement("div"); d.className = "say " + cls; d.textContent = text; log.appendChild(d); scroll(); return d; };
  function actionCard(a) {
    const when = a.date.slice(5).replace("-", "/").replace(/^0/, "") + (a.start ? " " + a.start + (a.end ? "~" + a.end : "") : " 종일");
    const c = document.createElement("div"); c.className = "say act";
    c.innerHTML = `<b>${esc(a.title)}</b><span>${esc(when)}</span>`;
    const yes = document.createElement("button"); yes.className = "btn main"; yes.textContent = "캘린더에 등록";
    const no = document.createElement("button"); no.className = "btn"; no.textContent = "취소";
    no.onclick = () => c.remove();
    yes.onclick = async () => {
      yes.disabled = true; no.remove(); yes.textContent = "넣는 중…";
      const r = await window.rb.addEvent(a);
      yes.textContent = r.ok ? "캘린더에 넣었습니다" : r.error; if (!r.ok) yes.disabled = false;
    };
    c.append(yes, no); log.appendChild(c); scroll();
  }
  $("chatOpen").onclick = () => { $("chat").hidden = false; $("chatOpen").hidden = true; input.focus(); };
  $("chatX").onclick = () => { $("chat").hidden = true; $("chatOpen").hidden = false; };
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("chatForm").requestSubmit(); } });
  $("chatForm").addEventListener("submit", async e => {
    e.preventDefault();
    const text = input.value.trim(); if (!text) return;
    input.value = ""; say("me", text); $("chatSend").disabled = true;
    const wait = say("bot wait", "생각하는 중…");
    const open = Object.values(tasks).filter(t => !t.delAt && !t.doneAt).slice(0, 60).map(t => ({ title: t.title, body: (t.body || "").slice(0, 160), due: t.due, topic: t.topic }));
    const r = await window.rb.chat({ message: text, history: history.slice(), tasks: open, today: today() + " " + WEEK[new Date().getDay()] + "요일" });
    wait.remove(); $("chatSend").disabled = false; input.focus();
    if (!r.ok) { say("bot err", r.error); return; }
    history.push({ role: "me", text }, { role: "bot", text: r.value.text });
    say("bot", r.value.text);
    if (r.value.action) actionCard(r.value.action);
  });
})();

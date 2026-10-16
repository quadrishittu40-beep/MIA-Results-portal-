(() => {
  const $ = s => document.querySelector(s), app = $("#app"), KEY = "mia_students_draft", AUTH = "mia_admin_ok";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const r2 = Calc.r2;
  let students = [], usingDraft = false;

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
    clear() { try { localStorage.removeItem(KEY); } catch {} },
  };
  async function load() {
    try { students = (await (await fetch("data/students.json", { cache: "no-store" })).json()).students || []; } catch { students = []; }
    const d = store.get(); if (d && d.students) { students = d.students; usingDraft = true; }
  }
  const find = q => { q = q.trim().toLowerCase(); return students.find(s => s.id.toLowerCase() === q) || null; };

  /* ---------- Public: lookup + profile ---------- */
  function home(msg) {
    app.innerHTML = `<section class="hero"><img src="assets/logo.png" alt="">
      <h1>Student Result Portal</h1><p>Enter your Student ID to view your full academic profile and download your results.</p>
      <form class="search" id="f"><input id="q" placeholder="Student ID e.g. MIA/2024/001" required autofocus><button>View Result</button></form>
      ${msg ? `<div class="msg">${esc(msg)}</div>` : ""}</section>`;
    $("#f").onsubmit = e => { e.preventDefault(); const s = find($("#q").value); s ? (location.hash = "#/s/" + encodeURIComponent(s.id)) : home("No student found with that ID."); };
  }
  function semTable(s) {
    return `<table><tr><th>Course</th><th>Unit</th><th>Status</th><th>GP</th><th>Credit Point</th></tr>` +
      s.rows.map(c => `<tr title="${esc(c.title)} - ${c.score} (${c.letter})"><td>${esc(c.code)}</td><td>${c.unit}</td><td>${esc(c.status)}</td><td>${c.gp}</td><td>${c.cp}</td></tr>`).join("") + `</table>
      <div class="sum">TNU: ${s.tnu} TCP: ${s.tcp} GP: ${r2(s.gpa)} CGPA: ${r2(s.cgpa)}<br>CTNUP: ${s.ctnup} CGPA: ${r2(s.cgpa)} <i>${s.standing}</i></div>`;
  }
  function profile(id) {
    const st = find(decodeURIComponent(id)); if (!st) return home("Student not found.");
    const p = Calc.profile(st);
    const lv = p.levels.map(l => `<div class="level"><h3><span>${esc(l.session)}</span><span>${l.level} Level</span></h3>` +
      l.semesters.filter(s => s.rows.length).map(s => `<div class="sem"><h4>${s.n === "1" ? "First" : "Second"} Semester
        <button class="sm sec" data-pdf="${esc(l.session)}|${s.n}">⬇ PDF</button></h4>${semTable(s)}</div>`).join("") + `</div>`).join("");
    app.innerHTML = `<div class="card"><div class="pro-head"><div><h2>${esc(st.name)}</h2>
      <div class="meta"><b>${esc(st.id)}</b> · ${esc(st.programme)}<br>${esc(st.department)} · ${esc(st.faculty)}<br>Mode of Entry: ${esc(st.entryMode)} · Year of Entry: ${esc(st.entryYear)} · Deferred: ${esc(st.deferred || "NONE")}</div></div>
      <div class="actions"><button id="full">⬇ Download Full Profile (PDF)</button><button class="sec" onclick="print()">Print</button></div></div>
      <div class="stats"><div class="stat"><b>${r2(p.cgpa)}</b><span>CGPA</span></div><div class="stat"><b>${p.cTNU}</b><span>Units Taken</span></div>
      <div class="stat"><b>${p.cTNUP}</b><span>Units Passed</span></div><div class="stat"><b>${p.semDone}/${window.PORTAL_CONFIG.totalSemesters}</b><span>Semesters</span></div>
      <div class="stat"><b>${esc(p.cls)}</b><span>Current Class</span></div></div></div>
      <div class="levels">${lv || '<div class="card">No results yet.</div>'}</div>
      <div class="card bottom"><dl><dt>Outstanding Courses</dt><dd>${p.outstanding.join(", ") || "NONE"}</dd>
      <dt>Disciplinary Status</dt><dd>${esc(st.disciplinary || "NONE")}</dd>
      <dt>Academic Summary</dt><dd>CTNUP: ${p.cTNUP} · CTCP: ${p.cTCP} · CTNU: ${p.cTNU} · CGPA: ${r2(p.cgpa)} · ${p.standing}<br>
      ${p.graduating ? '<span class="tag ok">Eligible to Graduate</span>' : '<span class="tag no">Not Graduating</span> ' + p.reasons.join(" | ")}</dd></dl></div>`;
    $("#full").onclick = () => PortalPDF.full(st);
    app.querySelectorAll("[data-pdf]").forEach(b => b.onclick = () => { const [s, n] = b.dataset.pdf.split("|"); PortalPDF.term(st, s, n); });
  }

  /* ---------- Admin ---------- */
  let sel = null, draft = null;
  function persist() { store.set({ students }); usingDraft = true; }
  const blankStudent = () => ({ id: "", name: "", programme: "ISLAMIC STUDIES", department: "DEPARTMENT OF ISLAMIC STUDIES", faculty: "ARABIC & ISLAMIC SCIENCES",
    entryMode: "Direct", entryYear: "", deferred: "NONE", disciplinary: "NONE", extraOutstanding: [], sessions: [] });
  function admin() {
    let ok = false; try { ok = sessionStorage.getItem(AUTH) === "1"; } catch {}
    if (!ok) {
      app.innerHTML = `<div class="card" style="max-width:420px;margin:40px auto"><h2>Admin Login</h2><form id="lf" class="row"><input id="pw" type="password" placeholder="Passcode" required><button>Enter</button></form><div id="le" class="meta"></div></div>`;
      $("#lf").onsubmit = e => { e.preventDefault(); if ($("#pw").value === PORTAL_CONFIG.adminPasscode) { try { sessionStorage.setItem(AUTH, "1"); } catch {} admin(); } else $("#le").textContent = "Wrong passcode."; };
      return;
    }
    const list = students.map((s, i) => `<button class="${i === sel ? "" : "sec"}" data-i="${i}">${esc(s.name || "(unnamed)")}<br><small>${esc(s.id)}</small></button>`).join("");
    app.innerHTML = `<div class="admin-grid"><aside class="card list"><button id="new">＋ New Student</button>${list}
      <hr><button class="sec sm" id="exp">Export data.json</button><button class="sec sm" id="imp">Import data.json</button>
      <button class="sec sm" id="rst">Discard browser edits</button><input type="file" id="file" accept=".json" hidden></aside>
      <section id="ed">${draft ? editor() : '<div class="card">Select a student or add a new one.</div>'}</section></div>
      <div class="note">Edits are saved in <b>this browser</b>${usingDraft ? " (currently using your edited copy)" : ""}. To publish for everyone: <b>Export data.json</b> → replace <code>data/students.json</code> in the GitHub repo → commit.</div>`;
    app.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { sel = +b.dataset.i; draft = JSON.parse(JSON.stringify(students[sel])); admin(); });
    $("#new").onclick = () => { sel = null; draft = blankStudent(); admin(); };
    $("#exp").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ students }, null, 1)], { type: "application/json" })); a.download = "students.json"; a.click(); };
    $("#imp").onclick = () => $("#file").click();
    $("#file").onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); students = d.students; persist(); draft = null; sel = null; admin(); } catch { alert("Invalid JSON file."); } };
    $("#rst").onclick = () => { if (confirm("Discard all edits made in this browser and reload the published data?")) { store.clear(); usingDraft = false; load().then(() => { draft = null; sel = null; admin(); }); } };
    if (draft) bindEditor();
  }
  function editor() {
    const f = (k, l) => `<label>${l}<input data-k="${k}" value="${esc(draft[k])}"></label>`;
    const ses = draft.sessions.map((se, si) => `<div class="card"><div class="row" style="margin:0 0 8px"><b>${esc(se.session)} · ${se.level} Level</b>
      <button class="sm danger" data-delses="${si}">Remove session</button></div>` +
      ["1", "2"].map(n => { const rows = (se.semesters[n] = se.semesters[n] || []); return `<h4>${n === "1" ? "First" : "Second"} Semester</h4><div class="scroll"><table class="ed">
        <tr><th>Code</th><th>Title</th><th>Unit</th><th>Status</th><th>Score</th><th>Grade</th><th></th></tr>` +
        rows.map((c, ci) => `<tr><td><input data-c="${si}|${n}|${ci}|code" value="${esc(c.code)}"></td><td><input data-c="${si}|${n}|${ci}|title" value="${esc(c.title)}"></td>
          <td><input type="number" min="0" data-c="${si}|${n}|${ci}|unit" value="${c.unit}" style="width:60px"></td>
          <td><select data-c="${si}|${n}|${ci}|status">${["C", "E", "R"].map(x => `<option ${c.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></td>
          <td><input type="number" min="0" max="100" data-c="${si}|${n}|${ci}|score" value="${c.score}" style="width:70px"></td>
          <td>${Calc.grade(+c.score || 0).letter}</td><td><button class="sm danger" data-delc="${si}|${n}|${ci}">✕</button></td></tr>`).join("") +
        `</table></div><button class="sm sec" data-addc="${si}|${n}">＋ Add course</button>`; }).join("") + `</div>`).join("");
    return `<div class="card"><h3 style="margin-top:0">${sel === null ? "New student" : "Edit student"}</h3><div class="form">
      ${f("id", "Student ID")}${f("name", "Full name")}${f("programme", "Discipline / Programme")}${f("department", "Department")}${f("faculty", "Faculty")}
      ${f("entryMode", "Mode of entry")}${f("entryYear", "Year of entry (e.g. 2024/2025)")}${f("deferred", "Semesters deferred")}${f("disciplinary", "Disciplinary status")}
      <label>Extra outstanding courses (comma separated)<input data-k="extra" value="${esc((draft.extraOutstanding || []).join(", "))}"></label></div></div>
      ${ses}<div class="card"><div class="row" style="margin:0"><input id="nses" placeholder="Session e.g. 2025/2026"><select id="nlv"><option>100</option><option>200</option><option>300</option><option>400</option></select>
      <button class="sec" id="ases">＋ Add session</button></div></div>
      <div class="row"><button id="save">Save student</button>${sel !== null ? '<button class="danger" id="del">Delete student</button>' : ""}</div>`;
  }
  function bindEditor() {
    const ed = $("#ed");
    ed.addEventListener("input", e => { const t = e.target;
      if (t.dataset.k) { if (t.dataset.k === "extra") draft.extraOutstanding = t.value.split(",").map(x => x.trim()).filter(Boolean); else draft[t.dataset.k] = t.value; }
      else if (t.dataset.c) { const [si, n, ci, k] = t.dataset.c.split("|"); draft.sessions[si].semesters[n][ci][k] = t.type === "number" ? +t.value : t.value; }
    });
    ed.addEventListener("change", e => { if (e.target.dataset.c) rerender(); });
    ed.addEventListener("click", e => { const d = e.target.dataset; if (!d) return;
      if (d.addc) { const [si, n] = d.addc.split("|"); draft.sessions[si].semesters[n].push({ code: "", title: "", unit: 2, status: "C", score: 0 }); rerender(); }
      if (d.delc) { const [si, n, ci] = d.delc.split("|"); draft.sessions[si].semesters[n].splice(ci, 1); rerender(); }
      if (d.delses) { if (confirm("Remove this session and its results?")) { draft.sessions.splice(d.delses, 1); rerender(); } }
      if (e.target.id === "ases") { const s = $("#nses").value.trim(); if (!s) return alert("Enter the session."); draft.sessions.push({ session: s, level: +$("#nlv").value, semesters: { 1: [], 2: [] } }); rerender(); }
      if (e.target.id === "save") save();
      if (e.target.id === "del" && confirm("Delete this student permanently?")) { students.splice(sel, 1); persist(); draft = null; sel = null; admin(); }
    });
  }
  function rerender() { $("#ed").innerHTML = editor(); }
  function save() {
    if (!draft.id.trim() || !draft.name.trim()) return alert("Student ID and name are required.");
    const dup = students.findIndex((s, i) => s.id.toLowerCase() === draft.id.trim().toLowerCase() && i !== sel);
    if (dup >= 0) return alert("Another student already has that ID.");
    draft.id = draft.id.trim(); draft.name = draft.name.trim().toUpperCase();
    if (sel === null) { students.push(draft); sel = students.length - 1; } else students[sel] = draft;
    persist(); draft = JSON.parse(JSON.stringify(students[sel])); admin();
  }

  /* ---------- Router ---------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, ""); scrollTo(0, 0);
    if (h.startsWith("s/")) profile(h.slice(2)); else if (h === "admin") admin(); else home();
  }
  addEventListener("hashchange", route);
  load().then(route);
})();

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
  let role = null; // cloud mode only: "admin" | "student" | null
  async function load() {
    if (Cloud.enabled()) { try { const r = await Cloud.session(); role = r.role; students = r.students; } catch (e) { role = null; students = []; } return; }
    try { students = (await (await fetch("data/students.json", { cache: "no-store" })).json()).students || []; } catch { students = []; }
    const d = store.get(); if (d && d.students) { students = d.students; usingDraft = true; }
  }
  const find = q => { q = q.trim().toLowerCase(); return students.find(s => s.id.toLowerCase() === q) || null; };

  /* ---------- Student portal ---------- */
  const PW = "mia_student_pw", USER = "mia_user";
  const pwStore = { get() { try { return JSON.parse(localStorage.getItem(PW)) || {}; } catch { return {}; } }, set(v) { try { localStorage.setItem(PW, JSON.stringify(v)); } catch {} } };
  const me = () => { if (Cloud.enabled()) return role === "student" && students[0] ? students[0].id : null; try { return sessionStorage.getItem(USER); } catch { return null; } };
  const setMe = v => { try { v ? sessionStorage.setItem(USER, v) : sessionStorage.removeItem(USER); } catch {} };
  const isAdmin = () => { if (Cloud.enabled()) return role === "admin"; try { return sessionStorage.getItem(AUTH) === "1"; } catch { return false; } };
  async function hash(id, pw) {
    const enc = new TextEncoder(), key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode("mia:" + id.toLowerCase()), iterations: 100000, hash: "SHA-256" }, key, 256);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  const norm = s => String(s || "").trim().toLowerCase();
  const logout = async e => { e && e.preventDefault(); if (Cloud.enabled()) { await Cloud.logout(); role = null; students = []; } setMe(null); location.hash = "#/"; route(); };
  function nav() {
    $("#nav").innerHTML = (me() ? `<a href="#/me">My Portal</a><a href="#" id="lo">Logout</a>` : `<a href="#/">Home</a>`) + `<a href="#/admin">Admin</a>`;
    const lo = $("#lo"); if (lo) lo.onclick = logout;
  }

  /* Landing page: portal link cards */
  const ICON = { user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg>', gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    bars: '<svg viewBox="0 0 24 24"><rect x="4" y="12" width="4" height="8"/><rect x="10" y="6" width="4" height="14"/><rect x="16" y="9" width="4" height="11"/></svg>',
    cap: '<svg viewBox="0 0 24 24"><path d="M12 4L1 9l11 5 9-4.1V16h2V9zM5 13.2v3.6c0 1.700 3.100 3.200 7 3.200s7-1.500 7-3.200v-3.600L12 16.500z"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 5h7l2 2h9v12H3z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>' };
  function landing() {
    app.innerHTML = `<section class="banner"><img src="assets/logo.png" alt=""><h1>MIA Results Processing Unit</h1><p>Information links for Students &amp; Administrators</p></section>
      <div class="pcards"><div class="pcard"><div class="ico">${ICON.user}</div><h3>STUDENT PORTAL</h3><hr><p><a href="#/register">Register</a> | <a href="#/login">Login</a></p></div>
      <div class="pcard"><div class="ico">${ICON.gear}</div><h3>ADMIN PORTAL</h3><hr><p><a href="#/admin">Login</a></p></div></div>`;
  }

  /* Login / Register / Reset */
  function authPage(mode, msg) {
    const reg = mode === "register", rst = mode === "reset", extra = reg || rst;
    app.innerHTML = `<div class="authbox"><img src="assets/logo.png" alt="">
      <h2>${reg ? "Student Registration" : rst ? "Reset Your Password" : "Student Sign In"}</h2><hr>
      ${mode === "login" ? '<div class="info">Are you a new student? <a class="btn sm" href="#/register">Register here</a></div>' : ""}
      ${msg ? `<div class="err">${esc(msg)}</div>` : ""}
      <form id="f"><input id="sid" placeholder="Matriculation / Student ID e.g. MIA/2024/001" autocomplete="username" required>
      ${reg && Cloud.enabled() ? '<input id="nm" placeholder="Full name (only needed if you are new)"><input id="pg" placeholder="Programme / Discipline (optional)">' : ""}
      ${extra ? '<input id="yr" placeholder="Year of entry e.g. 2024/2025 (verification)" required>' : ""}
      <input id="pw" type="password" placeholder="${extra ? "Choose a password (min 6 characters)" : "Password"}" autocomplete="${extra ? "new-password" : "current-password"}" required>
      ${extra ? '<input id="pw2" type="password" placeholder="Confirm password" autocomplete="new-password" required>' : ""}
      <button class="wide">${reg ? "Create Account" : rst ? "Reset Password" : "Log In"}</button><a class="btn wide alt" href="#/">HOME</a></form><hr>
      ${mode === "login" ? '<p class="c">Forgot your password?<br><a href="#/reset">CLICK HERE to Reset Your Password.</a></p>' : `<p class="c"><a href="#/login">Back to Log In</a></p>`}</div>`;
    $("#f").onsubmit = async e => {
      e.preventDefault();
      if (Cloud.enabled()) {
        const pw = $("#pw").value;
        try {
          let r;
          if (reg) {
            if (pw.length < 6) return authPage(mode, "Password must be at least 6 characters.");
            if (pw !== $("#pw2").value) return authPage(mode, "Passwords do not match.");
            r = await Cloud.register({ id: $("#sid").value, name: $("#nm").value || $("#sid").value, programme: $("#pg").value, entryYear: $("#yr").value }, pw);
          } else r = await Cloud.studentLogin($("#sid").value, pw);
          role = r.role; students = r.students; location.hash = "#/me"; route();
        } catch (err) { authPage(mode, Cloud.msg(err)); }
        return;
      }
      const st = find($("#sid").value), pw = $("#pw").value, store = pwStore.get();
      if (!st) return authPage(mode, "No student found with that ID.");
      if (extra) {
        if (norm($("#yr").value) !== norm(st.entryYear)) return authPage(mode, "Verification failed: year of entry does not match.");
        if (pw.length < 6) return authPage(mode, "Password must be at least 6 characters.");
        if (pw !== $("#pw2").value) return authPage(mode, "Passwords do not match.");
        if (reg && store[st.id]) return authPage("login", "A password already exists on this device. Please log in, or reset it.");
        store[st.id] = await hash(st.id, pw); pwStore.set(store);
      } else if (!store[st.id]) return authPage("register", "No password set on this device yet. Please register to choose one.");
      else if (store[st.id] !== await hash(st.id, pw)) return authPage(mode, "Wrong password.");
      setMe(st.id); location.hash = "#/me"; route();
    };
  }

  /* Logged-in shell: photo, name, menu */
  function shell(page, html, st) {
    const open = true, n = (st.notices || []).length;
    const a = (h, l, extra = "") => `<a href="#/${h}" class="${page === h ? "on" : ""}">${l}${extra}</a>`;
    app.innerHTML = `<div class="shell"><aside class="side"><div class="photo">${st.photo ? `<img src="${st.photo}" alt="">` : `<div class="ph">${esc(st.name.charAt(0))}</div>`}</div>
      <div class="pname">${esc(st.name)}</div><nav class="menu">
      <button class="mh ${open ? "act" : ""}" id="tg">Academic Profiles <span>▾</span></button>
      <div class="sub" ${open ? "" : "hidden"} id="sub">${a("current", "Current Result", '<em>New</em>')}${a("profile", "Academic Profiles")}${a("transcript", "Un-Official Transcript", '<em>New</em>')}</div>
      ${a("notices", "Notifications", `<b class="bd">${n}</b>`)}${a("courses", "Course Profile")}${a("me", "Home")}${a("account", "My Account", '<em>New</em>')}
      <a href="#" id="lo2">Logout</a></nav></aside><section class="content">${html}</section></div>`;
    $("#tg").onclick = () => { $("#sub").hidden = !$("#sub").hidden; };
    $("#lo2").onclick = logout;
    $("#full") && ($("#full").onclick = () => PortalPDF.full(st));
    app.querySelectorAll("[data-pdf]").forEach(b => b.onclick = () => { const [s, k] = b.dataset.pdf.split("|"); PortalPDF.term(st, s, k); });
    app.querySelectorAll("[data-full]").forEach(b => b.onclick = () => PortalPDF.full(st));
  }
  const title = t => `<h2 class="ptitle">${t}</h2>`;
  const termLabel = s => `${s.level} Level · ${s.session} · ${s.n === "1" ? "First" : "Second"} Semester`;
  const pdfBtn = s => `<button class="sm" data-pdf="${esc(s.session)}|${s.n}">⬇ PDF</button>`;
  function semDetail(s) {
    return `<div class="scroll"><table><tr><th>Course</th><th>Title</th><th>Unit</th><th>Status</th><th>Score</th><th>Grade</th><th>GP</th><th>Credit Point</th></tr>` +
      s.rows.map(c => `<tr><td>${esc(c.code)}</td><td class="l">${esc(c.title)}</td><td>${c.unit}</td><td>${esc(c.status)}</td><td>${c.score}</td><td>${c.letter}</td><td>${c.gp}</td><td>${c.cp}</td></tr>`).join("") + `</table></div>
      <div class="sum">TNU: ${s.tnu} TCP: ${s.tcp} GP: <b>${r2(s.gpa)}</b> CGPA: <b>${r2(s.cgpa)}</b> · CTNUP: ${s.ctnup} · <i>${s.standing}</i></div>`;
  }
  function semCompact(s) {
    return `<table><tr><th>Course</th><th>Unit</th><th>Status</th><th>GP</th><th>Credit Point</th></tr>` +
      s.rows.map(c => `<tr><td>${esc(c.code)}</td><td>${c.unit}</td><td>${esc(c.status)}</td><td>${c.gp}</td><td>${c.cp}</td></tr>`).join("") + `</table>
      <div class="sum">TNU: ${s.tnu} TCP: ${s.tcp} GP: ${r2(s.gpa)} CGPA: ${r2(s.cgpa)}<br>CTNUP: ${s.ctnup} CGPA: ${r2(s.cgpa)} <i>${s.standing}</i></div>`;
  }
  const summaryBox = (st, p) => `<div class="card bottom"><dl><dt>Outstanding Courses</dt><dd>${p.outstanding.join(", ") || "NONE"}</dd>
    <dt>Disciplinary Status</dt><dd>${esc(st.disciplinary || "NONE")}</dd><dt>Academic Summary</dt><dd>CTNUP: ${p.cTNUP} · CTCP: ${p.cTCP} · CTNU: ${p.cTNU} · CGPA: ${r2(p.cgpa)} · ${p.standing}<br>
    ${p.graduating ? '<span class="tag ok">Eligible to Graduate</span>' : '<span class="tag no">Not Graduating</span> ' + p.reasons.join(" | ")}</dd></dl></div>`;
  const hasDefer = st => st.deferred && st.deferred.trim().toUpperCase() !== "NONE";

  function studentPage(page) {
    const st = find(me() || ""); if (!st) { setMe(null); return landing(); }
    const p = Calc.profile(st), terms = [];
    p.levels.forEach(l => l.semesters.forEach(s => { if (s.rows.length) terms.push({ ...s, session: l.session, level: l.level }); }));
    const cur = terms[terms.length - 1], prev = terms.slice(0, -1).reverse();
    let html = "";
    if (page === "me") {
      const card = (img, t, body, btn) => `<div class="acard"><div class="aimg">${img}</div><h4>${t}</h4>${body ? `<p class="meta">${body}</p>` : ""}<div class="abtn">${btn}</div></div>`;
      html = title("Academic Profile") + `<div class="stats"><div class="stat"><b>${r2(p.cgpa)}</b><span>CGPA</span></div><div class="stat"><b>${p.cTNUP}</b><span>Units Passed</span></div>
        <div class="stat"><b>${p.semDone}/${window.PORTAL_CONFIG.totalSemesters}</b><span>Semesters</span></div><div class="stat"><b>${esc(p.cls)}</b><span>Class</span></div></div>
        <div class="acards">` +
        card(ICON.bars, "Current Semester Result", cur ? esc(termLabel(cur)) : "No result yet", '<a class="btn" href="#/current">View Result</a>') +
        card(ICON.cap, "All Results (Profile)", "Full academic profile, all levels", '<button data-full>Download Profile</button>') +
        card(ICON.folder, "Previous Results", `${prev.length} earlier semester(s)`, '<a class="btn" href="#/previous">View Results</a>') +
        card(ICON.pause, "Deferment", hasDefer(st) ? "Deferred: " + esc(st.deferred) : "No semester deferred", '<a class="btn" href="#/account">View Details</a>') + `</div>`;
    } else if (page === "current") {
      html = title("Current Result") + (cur ? `<div class="card"><div class="pro-head"><b>${esc(termLabel(cur))}</b>${pdfBtn(cur)}</div>${semDetail(cur)}</div>` : '<div class="card">No results published yet.</div>');
    } else if (page === "previous") {
      html = title("Previous Results") + (prev.length ? prev.map(s => `<details class="card"><summary>${esc(termLabel(s))} <span class="meta">· GP ${r2(s.gpa)} · CGPA ${r2(s.cgpa)}</span></summary>
        <div class="row">${pdfBtn(s)}</div>${semDetail(s)}</details>`).join("") : '<div class="card">No previous results.</div>');
    } else if (page === "profile") {
      html = title("Academic Profile") + `<div class="card"><div class="pro-head"><div class="meta"><b>${esc(st.name)}</b> · ${esc(st.id)}<br>${esc(st.programme)}</div><button data-full>⬇ Download Profile (PDF)</button></div></div>
        <div class="levels">` + p.levels.map(l => `<div class="level"><h3><span>${esc(l.session)}</span><span>${l.level} Level</span></h3>` + l.semesters.filter(s => s.rows.length).map(s =>
        `<div class="sem"><h4>${s.n === "1" ? "First" : "Second"} Semester</h4>${semCompact(s)}</div>`).join("") + `</div>`).join("") + `</div>` + summaryBox(st, p);
    } else if (page === "transcript") {
      html = title("Un-Official Transcript") + `<div class="card"><div class="pro-head"><span class="meta">Unofficial copy for personal reference. Not valid for external use.</span><button data-full>⬇ Download (PDF)</button></div></div>` +
        terms.map(s => `<div class="card"><h3 class="sec-t">${esc(termLabel(s))}</h3>${semDetail(s)}</div>`).join("") + summaryBox(st, p);
    } else if (page === "notices") {
      const n = st.notices || []; html = title("Notifications") + (n.length ? n.map(t => `<div class="card">${esc(t)}</div>`).join("") : '<div class="card">You have no notifications.</div>');
    } else if (page === "courses") {
      html = title("Course Profile") + (cur ? `<div class="card"><h3 class="sec-t">${esc(termLabel(cur))}</h3><div class="scroll"><table><tr><th>Course</th><th>Title</th><th>Unit</th><th>Status</th></tr>` +
        cur.rows.map(c => `<tr><td>${esc(c.code)}</td><td class="l">${esc(c.title)}</td><td>${c.unit}</td><td>${esc(c.status)}</td></tr>`).join("") + `</table></div></div>` : '<div class="card">No courses yet.</div>') +
        `<div class="card"><b>Outstanding courses:</b> ${p.outstanding.join(", ") || "NONE"}</div>`;
    } else if (page === "account") {
      html = title("My Account") + `<div class="card bottom"><dl><dt>Name</dt><dd>${esc(st.name)}</dd><dt>Student ID</dt><dd>${esc(st.id)}</dd><dt>Discipline</dt><dd>${esc(st.programme)}</dd>
        <dt>Department</dt><dd>${esc(st.department)}</dd><dt>Faculty</dt><dd>${esc(st.faculty)}</dd><dt>Mode of Entry</dt><dd>${esc(st.entryMode)}</dd><dt>Year of Entry</dt><dd>${esc(st.entryYear)}</dd>
        <dt>Deferment</dt><dd>${hasDefer(st) ? `<span class="tag no">Deferred</span> ${esc(st.deferred)}` : '<span class="tag ok">No deferment</span>'}</dd><dt>Disciplinary Status</dt><dd>${esc(st.disciplinary || "NONE")}</dd></dl></div>
        <div class="card"><h3 class="sec-t">Change Password</h3><form id="cp" class="auth2"><input id="op" type="password" placeholder="Current password" required><input id="np" type="password" placeholder="New password (min 6)" required minlength="6">
        <button>Update Password</button><div id="cpm" class="meta"></div></form></div>`;
    } else return location.hash = "#/me";
    shell(page, html, st);
    const cp = $("#cp"); if (cp) cp.onsubmit = async e => { e.preventDefault(); const store = pwStore.get();
      if (Cloud.enabled()) { try { await Cloud.changePassword($("#op").value, $("#np").value); cp.reset(); $("#cpm").textContent = "Password updated."; } catch (er) { $("#cpm").textContent = Cloud.msg(er); } return; }
      if (store[st.id] !== await hash(st.id, $("#op").value)) return $("#cpm").textContent = "Current password is wrong.";
      store[st.id] = await hash(st.id, $("#np").value); pwStore.set(store); cp.reset(); $("#cpm").textContent = "Password updated."; };
  }

  /* ---------- Admin ---------- */
  let sel = null, draft = null;
  /* ---- Backups: downloadable file + automatic snapshots (last 5) kept in this browser ---- */
  const BK = "mia_snapshots", LB = "mia_last_backup";
  const snaps = {
    get() { try { return JSON.parse(localStorage.getItem(BK)) || []; } catch { return []; } },
    add() { try { const a = snaps.get(); a.unshift({ t: Date.now(), students: JSON.parse(JSON.stringify(students)) }); localStorage.setItem(BK, JSON.stringify(a.slice(0, 5))); } catch {} },
  };
  const lastBackup = () => { try { return +localStorage.getItem(LB) || 0; } catch { return 0; } };
  function downloadBackup() {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ students, savedAt: new Date().toISOString() }, null, 1)], { type: "application/json" }));
    a.download = "mia-students-backup-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
    try { localStorage.setItem(LB, String(Date.now())); } catch {}
  }
  /* Online backup (shared mode only) */
  let ob = null, obBusy = "", obAuto = false;
  const obHtml = () => `<b>Online backup</b><button class="sec sm" id="obnow">☁ Back up now</button>
    ${ob && ob.length ? `<select id="obsel">${ob.map((x, i) => `<option value="${i}">${new Date(x.t).toLocaleString()} (${x.count})</option>`).join("")}</select><button class="sec sm" id="obres">Restore this online backup</button>` : '<div class="meta">No online backups yet.</div>'}
    <div class="meta">${esc(obBusy)}</div>`;
  function obBind() {
    const box = $("#obk"); if (!box) return; box.innerHTML = obHtml();
    const set = m => { obBusy = m; const b = $("#obk"); if (b) obBind(); };
    $("#obnow").onclick = async () => { set("Backing up…"); try { ob = await Cloud.backupCreate(students); set("Backup saved " + new Date().toLocaleTimeString()); } catch (e) { set("Backup failed: " + Cloud.msg(e)); } };
    const rb = $("#obres"); if (rb) rb.onclick = async () => { const b = ob[+$("#obsel").value]; if (!b || !confirm("Restore " + b.count + " students from " + new Date(b.t).toLocaleString() + "? Current data is backed up first.")) return;
      set("Restoring…"); try { ob = await Cloud.backupCreate(students); await applyStudents(await Cloud.backupLoad(ob.find(x => x.id === String(b.id)) || b)); draft = null; sel = null; admin(); } catch (e) { set("Restore failed: " + Cloud.msg(e)); } };
  }
  async function obInit() {
    if (!Cloud.enabled() || ob !== null) return; ob = [];
    try { ob = await Cloud.backupList(); if (students.length && (!ob[0] || Date.now() - ob[0].t > 864e5) && !obAuto) { obAuto = true; obBusy = "Daily auto-backup…"; obBind(); ob = await Cloud.backupCreate(students); obBusy = "Auto-backup saved."; } } catch (e) { obBusy = "Online backup unavailable: " + Cloud.msg(e); }
    obBind();
  }
  async function applyStudents(list) {
    if (!Array.isArray(list)) throw new Error("bad");
    snaps.add(); students = list;
    if (Cloud.enabled()) await Promise.all(students.map(x => Cloud.save(x))); else persist();
  }
  function persist() { store.set({ students }); usingDraft = true; }
  const blankStudent = () => ({ id: "", name: "", programme: "ISLAMIC STUDIES", department: "DEPARTMENT OF ISLAMIC STUDIES", faculty: "ARABIC & ISLAMIC SCIENCES",
    entryMode: "Direct", entryYear: "", deferred: "NONE", disciplinary: "NONE", extraOutstanding: [], sessions: [] });
  function admin() {
    const ok = isAdmin(), cloud = Cloud.enabled();
    if (!ok && cloud) {
      app.innerHTML = `<div class="card" style="max-width:420px;margin:40px auto"><h2>Admin Login</h2><form id="lf" class="auth2"><input id="em" type="email" placeholder="Admin email" required><input id="pw" type="password" placeholder="Password" required><button>Enter</button></form><div id="le" class="meta"></div></div>`;
      $("#lf").onsubmit = async e => { e.preventDefault(); try { const r = await Cloud.adminLogin($("#em").value, $("#pw").value); role = r.role; students = r.students; admin(); } catch (er) { $("#le").textContent = Cloud.msg(er); } };
      return;
    }
    if (!ok) {
      app.innerHTML = `<div class="card" style="max-width:420px;margin:40px auto"><h2>Admin Login</h2><form id="lf" class="row"><input id="pw" type="password" placeholder="Passcode" required><button>Enter</button></form><div id="le" class="meta"></div></div>`;
      $("#lf").onsubmit = e => { e.preventDefault(); if ($("#pw").value === PORTAL_CONFIG.adminPasscode) { try { sessionStorage.setItem(AUTH, "1"); } catch {} admin(); } else $("#le").textContent = "Wrong passcode."; };
      return;
    }
    const list = students.map((s, i) => `<button class="${i === sel ? "" : "sec"}" data-i="${i}">${esc(s.name || "(unnamed)")}<br><small>${esc(s.id)}</small></button>`).join("");
    app.innerHTML = `<div class="admin-grid"><aside class="card list"><button id="new">＋ New Student</button>${list}
      <hr><b>Backup</b><button class="sec sm" id="exp">⬇ Download backup</button><button class="sec sm" id="imp">Restore from backup file</button>
      ${snaps.get().length ? `<select id="snsel">${snaps.get().map((x, i) => `<option value="${i}">${new Date(x.t).toLocaleString()} (${x.students.length} students)</option>`).join("")}</select><button class="sec sm" id="snbtn">Restore this snapshot</button>` : ""}
      ${cloud ? "" : '<button class="sec sm" id="rst">Discard browser edits</button>'}<input type="file" id="file" accept=".json" hidden>
      ${cloud ? '<div id="obk"></div>' : ""}
      <button class="sec sm" id="alo">Admin logout</button></aside>
      <section id="ed">${draft ? editor() : '<div class="card">Select a student or add a new one.</div>'}</section></div>
      ${students.length && Date.now() - lastBackup() > 7 * 864e5 ? '<div class="note warn">⚠ No backup downloaded in the last 7 days. Tap <b>Download backup</b> and keep the file safe (e.g. WhatsApp it to yourself or save to Google Drive).</div>' : ""}
      <div class="note">${cloud ? "Online mode: results you save here appear on students' devices straight away." : ""}${cloud ? "" : `Edits are saved in <b>this browser</b>${usingDraft ? " (currently using your edited copy)" : ""}. To publish for everyone: <b>Export data.json</b> → replace <code>data/students.json</code> in the GitHub repo → commit.`}</div>`;
    app.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { sel = +b.dataset.i; draft = JSON.parse(JSON.stringify(students[sel])); admin(); });
    $("#new").onclick = () => { sel = null; draft = blankStudent(); admin(); };
    $("#exp").onclick = () => { downloadBackup(); admin(); };
    $("#imp").onclick = () => $("#file").click();
    $("#file").onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); if (!confirm("Restore " + d.students.length + " students from this file? A snapshot of the current data is saved first.")) return; await applyStudents(d.students); draft = null; sel = null; admin(); } catch { alert("Could not restore: invalid backup file or save failed."); } };
    const sb = $("#snbtn"); if (sb) sb.onclick = async () => { const x = snaps.get()[+$("#snsel").value]; if (x && confirm("Restore this snapshot?")) { try { await applyStudents(x.students); draft = null; sel = null; admin(); } catch { alert("Restore failed."); } } };
    if (cloud) { obBind(); obInit(); }
    $("#alo").onclick = async () => { if (cloud) { await Cloud.logout(); role = null; students = []; } else { try { sessionStorage.removeItem(AUTH); } catch {} } draft = null; sel = null; admin(); };
    if (!cloud) {
      $("#rst").onclick = () => { if (confirm("Discard all edits made in this browser and reload the published data?")) { store.clear(); usingDraft = false; load().then(() => { draft = null; sel = null; admin(); }); } };
    }
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
      ${f("entryMode", "Mode of entry")}${f("entryYear", "Year of entry (e.g. 2024/2025)")}${f("deferred", "Deferment (NONE, or e.g. 2025/2026 First Semester)")}${f("disciplinary", "Disciplinary status")}
      <label>Extra outstanding courses (comma separated)<input data-k="extra" value="${esc((draft.extraOutstanding || []).join(", "))}"></label>
      <label>Passport photo<input type="file" accept="image/*" id="photo">${draft.photo ? `<img src="${draft.photo}" alt="" style="width:60px;margin-top:4px;border-radius:6px">` : ""}</label>
      <label style="grid-column:1/-1">Notifications for this student (one per line)<textarea data-k="notices" rows="3">${esc((draft.notices || []).join("\n"))}</textarea></label></div></div>
      ${ses}<div class="card"><div class="row" style="margin:0"><input id="nses" placeholder="Session e.g. 2025/2026"><select id="nlv"><option>100</option><option>200</option><option>300</option><option>400</option></select>
      <button class="sec" id="ases">＋ Add session</button></div></div>
      <div class="row"><button id="save">Save student</button>${sel !== null ? '<button class="danger" id="del">Delete student</button>' : ""}${sel !== null && Cloud.enabled() ? '<button class="sec" id="rc">Reset registration</button>' : ""}</div>`;
  }
  function bindEditor() {
    const ed = $("#ed");
    ed.addEventListener("input", e => { const t = e.target;
      if (t.dataset.k) { if (t.dataset.k === "notices") draft.notices = t.value.split("\n").map(x => x.trim()).filter(Boolean); else if (t.dataset.k === "extra") draft.extraOutstanding = t.value.split(",").map(x => x.trim()).filter(Boolean); else draft[t.dataset.k] = t.value; }
      else if (t.dataset.c) { const [si, n, ci, k] = t.dataset.c.split("|"); draft.sessions[si].semesters[n][ci][k] = t.type === "number" ? +t.value : t.value; }
    });
    ed.addEventListener("change", e => { if (e.target.id === "photo" && e.target.files[0]) return readPhoto(e.target.files[0]); if (e.target.dataset.c) rerender(); });
    ed.addEventListener("click", e => { const d = e.target.dataset; if (!d) return;
      if (d.addc) { const [si, n] = d.addc.split("|"); draft.sessions[si].semesters[n].push({ code: "", title: "", unit: 2, status: "C", score: 0 }); rerender(); }
      if (d.delc) { const [si, n, ci] = d.delc.split("|"); draft.sessions[si].semesters[n].splice(ci, 1); rerender(); }
      if (d.delses) { if (confirm("Remove this session and its results?")) { draft.sessions.splice(d.delses, 1); rerender(); } }
      if (e.target.id === "ases") { const s = $("#nses").value.trim(); if (!s) return alert("Enter the session."); draft.sessions.push({ session: s, level: +$("#nlv").value, semesters: { 1: [], 2: [] } }); rerender(); }
      if (e.target.id === "save") save();
      if (e.target.id === "rc" && confirm("Allow this student to register again? (Delete their old login in Firebase → Authentication first if they forgot the password.)")) Cloud.resetClaim(students[sel].id).then(() => alert("Registration reset.")).catch(er => alert(Cloud.msg(er)));
      if (e.target.id === "del" && confirm("Delete this student permanently?")) { snaps.add(); const gone = students.splice(sel, 1)[0]; (Cloud.enabled() ? Cloud.remove(gone.id) : Promise.resolve(persist())).then(() => { draft = null; sel = null; admin(); }).catch(er => alert(Cloud.msg(er))); }
    });
  }
  function readPhoto(file) {
    const img = new Image(); img.onload = () => {
      const W = 240, H = 300, c = document.createElement("canvas"); c.width = W; c.height = H;
      const k = Math.max(W / img.width, H / img.height), w = img.width * k, h = img.height * k;
      c.getContext("2d").drawImage(img, (W - w) / 2, (H - h) / 2, w, h); draft.photo = c.toDataURL("image/jpeg", 0.8); rerender();
    }; img.src = URL.createObjectURL(file);
  }
  function rerender() { $("#ed").innerHTML = editor(); }
  function save() {
    if (!draft.id.trim() || !draft.name.trim()) return alert("Student ID and name are required.");
    const dup = students.findIndex((s, i) => s.id.toLowerCase() === draft.id.trim().toLowerCase() && i !== sel);
    if (dup >= 0) return alert("Another student already has that ID.");
    snaps.add();
    const oldId = sel === null ? null : students[sel].id;
    draft.id = draft.id.trim(); draft.name = draft.name.trim().toUpperCase();
    if (sel === null) { students.push(draft); sel = students.length - 1; } else students[sel] = draft;
    const done = () => { draft = JSON.parse(JSON.stringify(students[sel])); admin(); };
    if (Cloud.enabled()) Cloud.save(students[sel], oldId).then(done).catch(er => alert("Save failed: " + Cloud.msg(er))); else { persist(); done(); }
  }

  /* ---------- Router ---------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, ""); scrollTo(0, 0); nav();
    const user = me() && find(me());
    if (h === "admin") return admin();
    if (h === "reset" && Cloud.enabled()) { app.innerHTML = '<div class="authbox"><h2>Forgot your password?</h2><hr><p>Please contact the academy admin. They will reset your registration so you can register again with a new password.</p><a class="btn" href="#/login">Back to Log In</a></div>'; return; }
    if (["login", "register", "reset"].includes(h)) return user ? (location.hash = "#/me") : authPage(h);
    if (h === "") return user ? (location.hash = "#/me") : landing();
    if (h === "previous" || ["me", "current", "profile", "transcript", "notices", "courses", "account"].includes(h)) return user ? studentPage(h) : authPage("login", "Please log in.");
    landing();
  }
  addEventListener("hashchange", route);
  load().then(route);
})();

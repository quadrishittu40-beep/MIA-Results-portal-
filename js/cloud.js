/* Optional Firebase backend. Active only when config.js has firebase.apiKey set.
   Students register/login with Student ID + their own password; admin signs in with the admin email.
   Data lives in Firestore so results added by the admin appear on every student's device. */
window.Cloud = (() => {
  const cfg = () => window.PORTAL_CONFIG.firebase || {};
  const enabled = () => !!(cfg().apiKey && window.firebase);
  const D = () => window.PORTAL_CONFIG.defaults || {};
  let auth, db, started;
  const key = id => String(id).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  const yk = y => String(y || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const emailOf = id => key(id).toLowerCase() + "@mia-portal.app";
  const ex = s => (typeof s.exists === "function" ? s.exists() : s.exists);
  const isAdminUser = u => !!(u && u.email && window.PORTAL_CONFIG.adminEmail && u.email.toLowerCase() === window.PORTAL_CONFIG.adminEmail.trim().toLowerCase());

  function start() {
    if (started) return started;
    firebase.initializeApp(cfg()); auth = firebase.auth(); db = firebase.firestore();
    started = new Promise(res => { const un = auth.onAuthStateChanged(u => { un(); res(u); }); });
    return started;
  }
  async function session() {
    await start(); const u = auth.currentUser;
    if (!u) return { role: null, students: [] };
    if (isAdminUser(u)) return { role: "admin", students: await loadAll() };
    const k = u.email.split("@")[0].toUpperCase(), s = await db.collection("students").doc(k).get();
    return { role: "student", students: ex(s) ? [s.data()] : [] };
  }
  async function loadAll() {
    const q = await db.collection("students").get(), out = [];
    q.forEach(d => out.push(d.data())); return out.sort((a, b) => a.name.localeCompare(b.name));
  }
  async function studentLogin(id, pw) {
    await start(); const c = await auth.signInWithEmailAndPassword(emailOf(id), pw);
    if (isAdminUser(c.user)) { await auth.signOut(); throw { code: "auth/invalid-credential" }; }
    return session();
  }
  async function register(p, pw) {
    await start(); const k = key(p.id);
    const c = await auth.createUserWithEmailAndPassword(emailOf(p.id), pw), user = c.user;
    try {
      // Claim succeeds only if the ID is unclaimed and the year of entry matches the student record (if the admin created one).
      await db.collection("claims").doc(k).set({ uid: user.uid, yk: yk(p.entryYear) });
    } catch (e) { await user.delete().catch(() => {}); throw e; }
    const ref = db.collection("students").doc(k), s = await ref.get();
    if (!ex(s)) await ref.set({ id: p.id.trim().toUpperCase(), name: p.name.trim().toUpperCase(), programme: (p.programme || D().programme || "").toUpperCase(),
      department: D().department || "", faculty: D().faculty || "", entryMode: D().entryMode || "UME", entryYear: p.entryYear.trim(), yk: yk(p.entryYear),
      deferred: "NONE", disciplinary: "NONE", extraOutstanding: [], notices: [], sessions: [] });
    return session();
  }
  async function adminLogin(email, pw) {
    await start(); const c = await auth.signInWithEmailAndPassword(email.trim(), pw);
    if (!isAdminUser(c.user)) { await auth.signOut(); throw { code: "app/not-admin" }; }
    return session();
  }
  async function save(st, oldId) {
    st.yk = yk(st.entryYear); const k = key(st.id);
    await db.collection("students").doc(k).set(JSON.parse(JSON.stringify(st)));
    if (oldId && key(oldId) !== k) await db.collection("students").doc(key(oldId)).delete();
  }
  const remove = id => db.collection("students").doc(key(id)).delete();
  const resetClaim = id => db.collection("claims").doc(key(id)).delete();
  async function changePassword(oldPw, newPw) {
    const u = auth.currentUser;
    await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, oldPw));
    await u.updatePassword(newPw);
  }
  const logout = () => (auth ? auth.signOut() : Promise.resolve());
  function msg(e) {
    const c = (e && e.code) || "";
    if (c === "auth/email-already-in-use") return "This ID is already registered. Please log in, or ask the admin to reset your registration.";
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return "Wrong ID/email or password.";
    if (c === "permission-denied" || /permission/i.test(e && e.message || "")) return "Not allowed: the year of entry doesn't match your record, or this ID is already registered.";
    if (c === "auth/weak-password") return "Password is too weak (min 6 characters).";
    if (c === "app/not-admin") return "This account is not the admin account.";
    if (c === "auth/network-request-failed") return "No internet connection.";
    if (c === "auth/too-many-requests") return "Too many attempts. Try again later.";
    return "Something went wrong" + (c ? " (" + c + ")" : "") + ".";
  }
  return { enabled, start, session, studentLogin, register, adminLogin, save, remove, resetClaim, changePassword, logout, msg, loadAll };
})();

const Calc = (() => {
  const C = () => window.PORTAL_CONFIG;
  const r2 = n => (Math.round(n * 100) / 100).toFixed(2);
  function grade(score) {
    for (const [min, letter, gp] of C().scale) if (score >= min) return { letter, gp };
    return { letter: "F", gp: 0 };
  }
  // Returns levels[] each with semesters[] carrying course rows, term stats and cumulative stats.
  function profile(st) {
    let cTNU = 0, cTCP = 0, cTNUP = 0, semDone = 0;
    const latest = {};
    const sessions = [...(st.sessions || [])].sort((a, b) => a.level - b.level || a.session.localeCompare(b.session));
    const levels = sessions.map(se => {
      const semesters = ["1", "2"].map(n => {
        const raw = (se.semesters && se.semesters[n]) || [];
        const rows = raw.map(c => {
          const g = grade(+c.score || 0), unit = +c.unit || 0;
          latest[c.code] = g.gp;
          return { ...c, unit, ...g, cp: unit * g.gp };
        });
        const tnu = rows.reduce((a, c) => a + c.unit, 0);
        const tcp = rows.reduce((a, c) => a + c.cp, 0);
        const tnup = rows.reduce((a, c) => a + (c.gp > 0 ? c.unit : 0), 0);
        if (rows.length) { semDone++; cTNU += tnu; cTCP += tcp; cTNUP += tnup; }
        const gpa = tnu ? tcp / tnu : 0, cgpa = cTNU ? cTCP / cTNU : 0;
        return { n, rows, tnu, tcp, tnup, gpa, cgpa, ctnup: cTNUP, standing: rows.length ? (gpa >= 1 ? "Good Standing" : "Probation") : "" };
      });
      return { session: se.session, level: se.level, semesters };
    });
    const outstanding = [...new Set([...Object.keys(latest).filter(k => latest[k] === 0), ...(st.extraOutstanding || [])])].sort();
    const cgpa = cTNU ? cTCP / cTNU : 0;
    const need = Math.max(0, C().totalSemesters - semDone);
    const reasons = [];
    if (need > 0) reasons.push(`Student needs ${need} Semester(s) to Graduate`);
    if (outstanding.length) reasons.push("Outstanding Course(s)");
    if (cTNUP < C().requiredUnits) reasons.push("TNUP Less than required");
    const graduating = reasons.length === 0;
    const cls = (C().classes.find(([m]) => cgpa >= m) || [0, "—"])[1];
    return { levels, outstanding, cTNU, cTCP, cTNUP, cgpa, semDone, graduating, reasons, cls,
      standing: cgpa >= 1 ? "Good Standing" : "Probation" };
  }
  return { grade, profile, r2 };
})();

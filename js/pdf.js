const PortalPDF = (() => {
  const NAVY = [13, 59, 130], BLUE = [30, 100, 200], LIGHT = [232, 240, 252];
  let logo;
  async function getLogo() {
    if (logo) return logo;
    try {
      const img = new Image(); img.src = "assets/logo.png";
      await img.decode();
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0); logo = c.toDataURL("image/png");
    } catch (e) { logo = null; }
    return logo;
  }
  const mk = o => new window.jspdf.jsPDF({ unit: "pt", format: "a4", orientation: o });
  async function header(doc, st, sub, right) {
    const W = doc.internal.pageSize.getWidth(), cfg = window.PORTAL_CONFIG, lg = await getLogo();
    if (lg) doc.addImage(lg, "PNG", 24, 14, 62, 62);
    doc.setTextColor(...NAVY).setFont("helvetica", "bold").setFontSize(20).text(cfg.school.toUpperCase(), W / 2, 34, { align: "center" });
    doc.setFontSize(12).text((st.faculty || "").toUpperCase(), W / 2, 50, { align: "center" });
    doc.setFontSize(9.5).text((st.department || "").toUpperCase(), W / 2, 63, { align: "center" });
    doc.setFontSize(8.5).text("Discipline: " + (st.programme || "").toUpperCase(), W / 2, 75, { align: "center" });
    doc.setFillColor(...BLUE).rect(24, 84, W - 48, 1.6, "F");
    doc.setFont("helvetica", "bolditalic").setFontSize(11).text(st.name, 24, 100);
    doc.setFont("helvetica", "bold").setFontSize(10).text(st.id, 24, 113);
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text("Mode of Entry: " + st.entryMode, W * 0.36, 100); doc.text("Year of Entry: " + st.entryYear, W * 0.36, 112);
    doc.text("Semester(s) Deferred: " + (st.deferred || "NONE"), W * 0.55, 100);
    doc.setFont("helvetica", "bold").text(right, W - 24, 100, { align: "right" });
  }
  function footer(doc, extra) {
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    doc.setFontSize(7).setTextColor(90).setFont("helvetica", "normal");
    doc.text("Printed on " + new Date().toLocaleString() + (extra ? "  |  " + extra : ""), 24, H - 14);
    doc.text(window.PORTAL_CONFIG.school + " - " + window.PORTAL_CONFIG.est, W - 24, H - 14, { align: "right" });
  }
  const summaryText = s => [`TNU: ${s.tnu}  TCP: ${s.tcp}  GP: ${Calc.r2(s.gpa)}  CGPA: ${Calc.r2(s.cgpa)}`, `Summary: CTNUP: ${s.ctnup}  CGPA: ${Calc.r2(s.cgpa)}  ${s.standing}`];

  function semBlock(doc, x, y, w, sem) {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...NAVY).text(sem.n === "1" ? "First Semester:::" : "Second Semester:::", x, y + 8);
    doc.autoTable({
      startY: y + 12, margin: { left: x }, tableWidth: w, theme: "grid",
      head: [["Course Code", "Unit", "Status", "GP", "Credit Point"]],
      body: sem.rows.map(c => [c.code, c.unit, c.status, c.gp, c.cp]),
      styles: { fontSize: 7, cellPadding: 1.4, halign: "center", lineColor: [160, 185, 225], lineWidth: 0.4 },
      headStyles: { fillColor: NAVY, textColor: 255, fontSize: 6.2 },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    });
    let yy = doc.lastAutoTable.finalY + 8;
    const [a, b] = summaryText(sem);
    doc.setFont("helvetica", "normal").setFontSize(6.6).setTextColor(30).text(a, x, yy);
    doc.setFont("helvetica", "bolditalic").text(b, x, yy + 9);
    return yy + 18;
  }
  function bottom(doc, p, st, y) {
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BLUE).rect(24, y, W - 48, 1.2, "F");
    doc.setTextColor(...NAVY).setFont("helvetica", "bold").setFontSize(9.5).text("Outstanding Courses:", 24, y + 16);
    doc.setFontSize(8).text(p.outstanding.length ? p.outstanding.join(", ") : "NONE", 128, y + 16);
    doc.setFontSize(9.5).text("Disciplinary Status:", 24, y + 31); doc.setFontSize(8).text(st.disciplinary || "NONE", 128, y + 31);
    doc.setFontSize(9.5).text("Academic Summary:", 24, y + 46);
    const line = `CTNUP: ${p.cTNUP}  CTCP: ${p.cTCP}  CTNU: ${p.cTNU}  CGPA: ${Calc.r2(p.cgpa)}  ${p.standing} | ` +
      (p.graduating ? `Eligible to Graduate (${p.cls})` : "Not Graduating | " + p.reasons.join(" | "));
    doc.setFontSize(8).text(doc.splitTextToSize(line, W - 48), 24, y + 58);
  }

  async function full(st) {
    const p = Calc.profile(st), doc = mk("landscape"), W = doc.internal.pageSize.getWidth();
    const last = p.levels[p.levels.length - 1];
    await header(doc, st, "", last ? `${last.session} Session (${last.semesters[1].rows.length ? "Second" : "First"} Semester)` : "");
    const gap = 10, colW = (W - 48 - gap * 3) / 4;
    let maxY = 130;
    for (let i = 0; i < 4; i++) {
      const x = 24 + i * (colW + gap), lv = p.levels.find(l => l.level === 100 * (i + 1));
      doc.setFillColor(...LIGHT).rect(x, 122, colW, 12, "F");
      doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...NAVY);
      if (!lv) { doc.text(`${100 * (i + 1)} Level`, x + colW - 3, 131, { align: "right" }); continue; }
      doc.text(lv.session, x + 3, 131); doc.text(`${lv.level} Level`, x + colW - 3, 131, { align: "right" });
      let y = 138;
      for (const s of lv.semesters) if (s.rows.length) y = semBlock(doc, x, y, colW, s);
      maxY = Math.max(maxY, y);
    }
    bottom(doc, p, st, Math.min(Math.max(maxY + 6, 440), 505));
    footer(doc, "Page 1 of 1"); doc.save(`${st.id.replace(/\W+/g, "_")}_full_profile.pdf`);
  }

  async function term(st, session, n) {
    const p = Calc.profile(st), lv = p.levels.find(l => l.session === session), s = lv.semesters.find(x => x.n === n);
    const doc = mk("portrait"), W = doc.internal.pageSize.getWidth();
    await header(doc, st, "", `${session} Session (${n === "1" ? "First" : "Second"} Semester)`);
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...NAVY)
      .text(`STATEMENT OF RESULT - ${lv.level} LEVEL, ${n === "1" ? "FIRST" : "SECOND"} SEMESTER`, W / 2, 140, { align: "center" });
    doc.autoTable({
      startY: 152, margin: { left: 24, right: 24 }, theme: "grid",
      head: [["Course Code", "Course Title", "Unit", "Status", "Score", "Grade", "GP", "Credit Point"]],
      body: s.rows.map(c => [c.code, c.title || "", c.unit, c.status, c.score, c.letter, c.gp, c.cp]),
      foot: [["", "TOTAL", s.tnu, "", "", "", "", s.tcp]],
      styles: { fontSize: 9, cellPadding: 3, halign: "center", lineColor: [160, 185, 225], lineWidth: 0.4 },
      headStyles: { fillColor: NAVY, textColor: 255 }, footStyles: { fillColor: LIGHT, textColor: NAVY },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" }, 1: { halign: "left" } },
    });
    let y = doc.lastAutoTable.finalY + 22;
    const [a, b] = summaryText(s);
    doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(30).text(a, 24, y);
    doc.setFont("helvetica", "bolditalic").text(b, 24, y + 15);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90)
      .text("Grading: " + window.PORTAL_CONFIG.scale.map(([m, l, g]) => `${l}=${g} (${m}+)`).join("   "), 24, y + 36);
    doc.setDrawColor(...NAVY).line(24, y + 90, 180, y + 90).line(W - 180, y + 90, W - 24, y + 90);
    doc.setTextColor(...NAVY).setFontSize(8.5).text("Registrar", 24, y + 102).text("Principal", W - 180, y + 102);
    footer(doc); doc.save(`${st.id.replace(/\W+/g, "_")}_${session.replace("/", "-")}_sem${n}.pdf`);
  }
  return { full, term };
})();

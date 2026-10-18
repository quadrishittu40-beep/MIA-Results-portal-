// Edit these to suit the academy.
window.PORTAL_CONFIG = {
  school: "MAKNAZUL 'IRFAN ACADEMY",
  motto: "Know Me Before You Worship Me",
  est: "EST. 2024",
  // Client-side passcode for the admin page. NOT real security - see README.
  adminPasscode: "9862",
  // ---- Shared online mode (optional). Leave apiKey empty to run without a backend. See FIREBASE_SETUP.md ----
  firebase: { apiKey: "", authDomain: "", projectId: "", appId: "" },
  adminEmail: "",           // the admin's Firebase login email
  defaults: { programme: "ISLAMIC STUDIES", department: "DEPARTMENT OF ISLAMIC STUDIES", faculty: "ARABIC & ISLAMIC SCIENCES", entryMode: "UME" },
  totalSemesters: 8,        // semesters needed to graduate
  requiredUnits: 120,       // total units passed required to graduate
  passMark: 40,
  // [minimum score, letter, grade point]
  scale: [[70,"A",5],[60,"B",4],[50,"C",3],[45,"D",2],[40,"E",1],[0,"F",0]],
  // [minimum CGPA, class]
  classes: [[4.5,"First Class"],[3.5,"Second Class (Upper)"],[2.4,"Second Class (Lower)"],[1.5,"Third Class"],[1.0,"Pass"]]
};

# Maknazul 'Irfan Academy - Student Result Portal

Blue-themed result portal. Students look up their ID to see their full profile (100-400 Level, both semesters per session, laid out like the university profile sheet) and download PDFs:
- **Full profile PDF** (all levels, outstanding courses, disciplinary status, academic summary)
- **Per-semester PDF** (course titles, scores, grades, GP, credit points, signatures)

## Publish on GitHub Pages
1. Create a GitHub repo, push these files to `main`.
2. Repo **Settings → Pages → Deploy from branch → main / (root)**.
3. Open `https://<your-username>.github.io/<repo>/`.

## Add / update results
1. Open `#/admin` on the site, log in with the passcode in `config.js` (change it first).
2. Add students, sessions and courses (grade, GP, CGPA etc. are calculated automatically).
3. Click **Export data.json**, replace `data/students.json` in the repo and commit. The public site updates in a minute.

## Important limits
GitHub Pages is static hosting, so there is no server database. Admin edits live in that browser until you export and commit. The admin passcode and all data in `students.json` are visible to anyone who views the site's source, so don't treat this as confidential storage. For private per-student access, add a backend (e.g. Firebase/Supabase) later.

`config.js` holds the grading scale, units required to graduate, and degree classes. The sample student is fictional.

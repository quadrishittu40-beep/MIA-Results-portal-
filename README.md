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

## Student login
Students open the site, tap **First time? Create your password**, then choose a password for their Student ID. Afterwards they log in with ID + password to see their dashboard: profile, current result, previous results, deferment, and PDF downloads.

Passwords are stored (hashed) in the browser of the device where they were created, so a student must set one on each device. This is a convenience gate, not strong security: the results file itself is public. A real shared login needs a backend (Firebase/Supabase).

## Layout
Home (portal links) → Student Sign In / Register / Reset password → dashboard with photo, name and menu: Academic Profiles (Current Result, Academic Profiles, Un-Official Transcript), Notifications, Course Profile, My Account. Admin can upload each student's passport photo and add notifications.

## Shared online mode
Without setup the site runs per-device (see limits above). Follow **FIREBASE_SETUP.md** to turn on shared mode: student self-registration, login on any device, and admin results that appear for students immediately.

## Backups
Admin page → **Download backup** saves all students and results as a JSON file (do this weekly; the page warns after 7 days). **Restore from backup file** puts them back. The portal also keeps the last 5 automatic snapshots in the admin's browser (taken before every save, delete or restore) under **Restore this snapshot**. Snapshots live only in that browser, so the downloaded file is your real backup.

## Online backup
In shared (Firebase) mode the admin page has **Back up now**, daily automatic backups, and **Restore this online backup** (newest 10 kept). Requires the updated `firestore.rules`.

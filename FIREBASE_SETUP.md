# Turn on shared online mode (free Firebase)

This lets students register on their own phones and lets the admin add results that every student sees straight away. All steps can be done from a phone browser (use "Desktop site" if a page looks cramped).

1. Go to **console.firebase.google.com**, sign in with a Google account, tap **Add project**, name it (e.g. `mia-results`), turn Google Analytics off, then **Create**.
2. **Build → Authentication → Get started → Email/Password → Enable → Save.**
3. **Authentication → Users → Add user**: enter the admin email and a strong password. This is the admin login for the portal.
4. **Build → Firestore Database → Create database** → pick a region → **Start in production mode** → Create.
5. Firestore **Rules** tab: delete everything, paste the contents of `firestore.rules` from this project, and change `admin@example.com` to your admin email. Tap **Publish**.
6. Gear icon → **Project settings → General → Your apps → Web (`</>`)** → register the app (no hosting). Copy `apiKey`, `authDomain`, `projectId`, `appId`.
7. In your GitHub repo, edit **config.js**: paste those four values into `firebase: { ... }` and put the admin email in `adminEmail`. Commit.
8. Firebase **Authentication → Settings → Authorized domains → Add domain**: `quadrishittu40-beep.github.io`.

Done. Open the site: **Admin Portal → Login** with the admin email/password, add or edit students and results. Students tap **Register**.

## How registration works
- If the admin already created the student, the student registers with the Student ID, the exact **year of entry** the admin entered, and a password of their choice.
- If the admin hasn't created the student yet, registering creates the profile (name, ID, year of entry); the admin then adds the results.
- The first person to register an ID owns it. If someone registers the wrong ID, open the student in Admin and tap **Reset registration**.
- Forgotten password: delete that student's login in Firebase **Authentication → Users** (their email looks like `mia-2024-001@mia-portal.app`), tap **Reset registration** in Admin, and the student registers again.

The Firebase web keys in config.js are meant to be public; the security comes from the rules in step 5.

## Online backup (already in the updated rules)
Admin page → **Online backup**: **Back up now** saves all students and results inside your Firebase project, and a backup is also made automatically once a day when you open the admin page. The newest 10 are kept; pick one and tap **Restore this online backup** to roll back. If backups say "unavailable", re-paste the latest `firestore.rules` (it now has a `backups` section) and tap Publish.
Tip: online backups live in the same Firebase project, so still tap **Download backup** now and then to keep a copy outside it.

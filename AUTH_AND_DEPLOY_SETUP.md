# FinalForge — Authentication & Public Launch Setup

## Implemented access model

- First student registration: approved Student ID + `@my.sliit.lk` email + Sri Lankan mobile number + SMS OTP + password.
- Returning student login: Student ID + password.
- Password reset: linked mobile OTP.
- Admin login: admin email + password plus a Firebase custom `admin: true` claim. No Student ID is required for the admin.
- The original student roster must stay private and must never be served from `/assets`, `/resources`, GitHub, or Vercel.
- Student progress is scoped to the signed-in user through `progress/{uid}`.

## Firebase activation

1. Create a Firebase project for FinalForge.
2. Enable Authentication → Email/Password and Phone.
3. Add the production Vercel/custom domain to Authentication → Authorized domains.
4. Create Firestore.
5. Copy the Firebase web-app config into `assets/firebase-config.js` and set `enabled: true`.
6. Deploy `firebase/firestore.rules`.
7. Place the private roster locally at `firebase/private/students.json` and run `npm run seed:students` from `firebase/` using Firebase Admin credentials.
8. Provision the admin with `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables, then run `npm run seed:admin`.

Never place the admin password, service-account JSON, roster, or real `.env` values in Git.

## Pre-launch checks

- Approved ID can register; unapproved ID cannot.
- An ID cannot be claimed twice.
- Student login works with Student ID + password.
- Password reset requires the linked phone OTP.
- Admin console requires the server-issued admin claim.
- Firestore rejects admin reads from ordinary student accounts even if the UI is modified in DevTools.
- Test Android Chrome, iPhone Safari, tablet, laptop and desktop.

## Vercel

The repository contains `vercel.json` security headers and `.vercelignore` protection for private Firebase setup files. Authentication remains intentionally disabled until real Firebase configuration and OTP are activated; there is no fake production OTP bypass.

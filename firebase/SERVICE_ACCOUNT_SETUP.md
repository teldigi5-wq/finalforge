# FinalForge dedicated service account setup

Firebase project `finalforge-dd1cf` remains on Spark. Never enable billing,
Blaze, or Identity Platform for these steps.

## Production signup and activation identity

Use `finalforge-signup@finalforge-dd1cf.iam.gserviceaccount.com` as the dedicated
production service account. Do not use the default Firebase Admin SDK account.
The service account is shared by the small FinalForge signup, verification-window,
account-activation, public-stats and protected-resource handlers, so its permissions
must stay intentionally narrow.

The custom project IAM role needs only the Firestore and Auth capabilities used by
these server handlers:

- `firebaseauth.users.create` — create an unverified Firebase user only after the Student ID allowlist check passes.
- `datastore.entities.get` — read the student allowlist, pending registration, claim, profile, rate-limit and public-stat documents used by the server flows.
- `datastore.databases.get` — begin/rollback Firestore transactions.
- `datastore.entities.create` and `datastore.entities.update` — create/update rate-limit records, pending registrations, the one-to-one Student ID claim, the verified student profile, and the aggregate public registration count.

Also keep the standard **Firebase Authentication Viewer** role (`roles/firebaseauth.viewer`)
on this dedicated account. FinalForge uses it for server-side user lookup and revoked-token
verification. Do not substitute Firebase Authentication Admin.

Firestore server IAM grants document permissions across the database; Firestore Security
Rules do not constrain Admin SDK writes to particular collections. For that reason the
production handlers deliberately keep all document paths fixed in source and never accept
collection names or Firestore paths from the browser.

The browser no longer creates student claims or profiles. Registration is now:

1. FinalForge validates the approved Student ID and derives the SLIIT mailbox server-side.
2. The server creates an unverified Firebase user and a `pending_registrations/{uid}` record.
3. FinalForge gives the student a **20-minute application activation window** to verify the SLIIT mailbox.
4. After Firebase reports `email_verified=true`, `POST /api/activate-account` rechecks the allowlist and pending-registration deadline and creates the one-to-one claim/profile server-side.
5. Expired, still-unverified accounts can authenticate with the same password and use `POST /api/restart-registration` to obtain a new 20-minute FinalForge activation window.

The 20-minute limit is a FinalForge activation boundary. It must not be described as a
custom Firebase email-link expiration value.

Do not add Owner, Editor, Firebase Authentication Admin, `firebaseauth.users.update`,
`firebaseauth.users.delete`, or `datastore.entities.delete` to this production service
account. The registration restart flow intentionally reuses the existing unverified Auth
user rather than requiring delete/update permissions.

`FIREBASE_SERVICE_ACCOUNT_JSON` must contain only this dedicated account's JSON. Store it
as a server-side production secret in the hosting environment; never expose it through a
public environment variable, source file, build artifact, browser bundle, command output,
or chat. Keep `SIGNUP_RATE_SECRET` as a separate random server-only secret. Restrict
production deployment access to trusted project administrators.

## Firestore rules boundary

Publish `firebase/firestore.rules` with the release. The v64 rules deny browser reads/writes
to `pending_registrations`, deny browser creation/update of `student_claims`, and deny
browser creation of student `profiles`. Those writes belong only to the server-certified
activation endpoint. Existing activated students retain the narrowly scoped profile
`lastLoginAt` update and their own approved progress access.

## Private one-time tasks

Use an authenticated Google-hosted operator environment and Application Default Credentials
to run `npm run seed:students` and `npm run seed:admin` from the `firebase/` directory. The
roster stays in ignored `firebase/private/students.json`.

The one-time admin operator may require `firebaseauth.users.get`, `firebaseauth.users.create`,
`firebaseauth.users.update`, and the Firestore permissions needed to create/update the admin
profile. Give those permissions only to the temporary operator identity, never to the
production signup service account. Revoke them after verifying the `admin: true` claim.
Enter the admin password privately; never put it in Git, hosting variables intended for the
browser, a command-line argument, or chat.

Before release, verify the expected student allowlist count, keep direct Firebase client
self-signup disabled, test a real approved student's create → verify → activate → logout →
login flow, test an expired 20-minute activation restart, and confirm an unapproved Student
ID is denied without creating an active FinalForge profile.

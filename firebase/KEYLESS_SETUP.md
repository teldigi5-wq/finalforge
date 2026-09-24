# FinalForge keyless activation plan

Project: `finalforge-dd1cf`. Firestore database: `(default)` in `asia-south1`.

## Current gate

Google's Workload Identity Federation setup guide requires billing enabled on
the project hosting the workload identity pool. FinalForge must stay on Firebase
Spark, so do not enable federation APIs, create a pool, or deploy the signup
endpoint until that requirement is resolved with the project owner. Vercel OIDC
itself is available on all Vercel plans. No service-account key is needed in
the application code.

## Intended production configuration, if the billing gate is resolved

1. Create a dedicated `finalforge-signup` service account without a key.
2. Create a Google workload identity pool and Vercel OIDC provider with Google's
   default audience and issuer matching the Vercel project's issuer mode.
3. Map `google.subject=assertion.sub` and restrict the provider attribute
   condition and `roles/iam.workloadIdentityUser` binding to the exact Vercel
   owner, FinalForge project, and **production** environment. Do not grant a
   whole pool or all Vercel projects the right to impersonate the account.
4. Create a custom project IAM role containing only:
   `firebaseauth.users.create`, `datastore.entities.get`,
   `datastore.entities.create`, `datastore.entities.update`, and
   `datastore.databases.get` (Firestore transactions). Assign it to the
   dedicated account. Do not grant Owner, Editor, or Firebase Auth Admin.
   Firestore server IAM applies at the database/project scope, so these entity
   permissions cannot be restricted to only `student_allowlist`,
   `student_claims`, and `signup_rate` with Firestore Security Rules.
5. Enable Vercel Secure Backend Access with OIDC for the actual project. Set
   `GCP_PROJECT_NUMBER=954266816069`, pool/provider IDs, and
   `GCP_SERVICE_ACCOUNT_EMAIL` as nonsecret production environment variables.
   Set `SIGNUP_RATE_SECRET` as a private, random production environment secret.
6. Confirm Firebase Authentication's end-user **Enable create (sign-up)**
   switch stays off. The server function alone creates unverified accounts
   after the private active allowlist check. Do not deploy before the private
   allowlist is seeded and the OIDC exchange is tested.

The server obtains a Vercel OIDC token with the Google provider audience,
exchanges it with Google STS, and impersonates `finalforge-signup` for a
short-lived access token. A separate keyless Firestore client and Firebase Auth
client share that token for one request. No private key or roster is bundled.

## One-time data and administrator

Use an authenticated Google-hosted environment with Application Default
Credentials for `firebase/scripts/seed-allowlist.mjs` and
`firebase/scripts/seed-admin.mjs`. Keep `firebase/private/students.json` outside
Git and Vercel. The administrator script needs privileged, temporary operator
access; the public signup service account must never receive the ability to
set custom claims. Verify 460 allowlist documents after seeding and provide
the admin password only through a private interactive entry method.

Do not switch `assets/firebase-config.js` to `enabled: true`, merge to main,
or deploy production until the keyless access, private seed, and end-to-end
security and functional tests succeed.

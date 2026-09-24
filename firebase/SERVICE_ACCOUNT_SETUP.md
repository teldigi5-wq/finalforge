# FinalForge dedicated service account setup

Firebase project `finalforge-dd1cf` remains on Spark. Never enable billing,
Blaze, or Identity Platform for these steps.

## Production signup identity

Create `finalforge-signup@finalforge-dd1cf.iam.gserviceaccount.com` as a new
service account. Do not use the default Firebase Admin SDK account. Create a
custom project IAM role for this account with only:

- `firebaseauth.users.create` — create an unverified user after allowlist check.
- `datastore.entities.get` — read a Student ID allowlist and claim document,
  and the rate-limit transaction document.
- `datastore.databases.get` — begin/rollback a Firestore transaction.
- `datastore.entities.create` and `datastore.entities.update` — write only the
  rate-limit document in application code.

Firestore's server IAM grants these document permissions across the database;
Security Rules do not constrain server SDK calls to specific collections. The
signup function therefore must be reviewed and kept small. It does not write
claims/profiles. The verified student's client creates a one-to-one claim and
profile as one batch under the published Security Rules.

Do not add Owner, Editor, Firebase Authentication Admin, `firebaseauth.users.update`,
or `datastore.entities.delete` to the production signup service account.
`firebaseauth.users.update` would permit modifying user records and claims,
not only setting one administrator's claim.

The `FIREBASE_SERVICE_ACCOUNT_JSON` server environment secret must contain
only the new account's JSON (the endpoint checks its project and exact email).
Add it to the **Production server environment only**, never a public Vercel
variable, source file, build artifact, or frontend config. Add a separate
random `SIGNUP_RATE_SECRET` production environment secret. Restrict deployment
access to trusted project administrators. Verify the secret is unavailable in
client assets and Vercel build logs. Remove temporary local key copies after
securely storing the JSON in Vercel.

## Private one-time tasks

Use an authenticated Google-hosted operator environment and Application Default
Credentials to run `npm run seed:students` and `npm run seed:admin` from the
`firebase/` directory. The roster stays in ignored `firebase/private/students.json`.
The admin operator needs `firebaseauth.users.get`, `firebaseauth.users.create`,
`firebaseauth.users.update`, and the Firestore document permissions needed to
create/update the admin profile. Give these to a temporary operator identity,
not the production signup service account. Revoke them after verifying the
`admin: true` claim. Enter the admin password privately; never put it in Git,
Vercel, a command line argument, or chat.

Before launch, count exactly 460 `student_allowlist` documents, verify the
direct Firebase client signup switch remains off, and test the complete
email-verification flow with an explicitly approved student's mailbox.

# Main branch signup admission security

This intentionally backports only allowlist-first registration from the
active FinalForge hardening branch. It does not merge the branch's hundreds
of additional UI, exam, or resource changes.

## Runtime prerequisites

- Private server-side Vercel environment variable FIREBASE_SERVICE_ACCOUNT_JSON:
  **only** the scoped finalforge-signup service account for the intended project.
- Private SIGNUP_RATE_SECRET, randomly generated with adequate entropy.
- Provisioned Firestore student_allowlist documents and deployed restrictive
  Firestore rules. Firebase service-account credentials must never be exposed
  in the browser or committed into Git.
- The backend must be reachable at /api/signup. No automatic direct Firebase
  browser-signup fallback is permitted.
- Lock down direct user self-registration in Firebase Authentication, if the
  project's authentication tier supports that control. The Firestore allowlist
  is an independent mandatory layer for protecting application records.
- Configure authorized authentication action domains for the verified mailbox
  flow.

## Release gates (before connecting or deploying main to production)

1. Verify that production is presently linked to the separate
   fix/firebase-activation-hardening branch, not main.
2. In preview, test invalid/unapproved IDs return 400/403 and do not create
   Auth users; approved test IDs create Auth users only after allowlist check.
3. Test successful SLIIT email verification, login and logout, single-ID claims,
   disabled accounts, password reset, and rate limit 429 behavior.
4. Confirm both the new route and the secure Firebase rules are deployed
   before announcing account registration ready.
5. Preserve the known-good production deployment and recovery plan.

Security regression tests are in tests/signup.test.js and the dedicated CI
workflow. These are not substitutes for staging integration checks.

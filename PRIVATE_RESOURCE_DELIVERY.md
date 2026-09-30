# FinalForge private resource delivery

This release boundary keeps Firebase Authentication and Firestore as FinalForge's only identity/entitlement system while moving course files and the official timetable out of the public Git tree.

## Storage boundary

Use a **dedicated FinalForge Supabase project** and a **private** Storage bucket named `finalforge-resources` (or set an explicit alternative through the server-only bucket variable). Do not reuse another application's Supabase project.

The recovered V5.1 package is the canonical migration source for this release: 100 course resources (93 PDF, 4 TXT, 3 PNG) plus the Version 3 timetable dated 15 Sep 2026. The files themselves are intentionally not committed to this repository.

## Server-only Vercel variables

Set these only on the FinalForge server deployment:

- `FINALFORGE_SUPABASE_URL`
- `FINALFORGE_SUPABASE_SECRET_KEY`
- `FINALFORGE_SUPABASE_BUCKET` (defaults to `finalforge-resources`)

The Supabase secret/service key must never be prefixed with `NEXT_PUBLIC_`, copied into browser assets, logged, or stored in Firestore/localStorage.

## Request flow

1. The browser resolves the selected item to a stable FinalForge resource ID.
2. The browser obtains the current Firebase ID token and POSTs only `{ resourceId }` to `/api/resource-url`.
3. The endpoint verifies the Firebase token with revocation checking enabled.
4. Students must pass the existing profile + active allowlist + Student-ID claim boundary. Admin access requires a verified Firebase email and `admin:true`.
5. The server maps the stable ID to a server-side storage path and requests a 90-second signed URL from the private Supabase bucket.
6. Only that short-lived URL is returned. Signed URLs and tokens are never persisted by FinalForge.

Browser-supplied raw paths are rejected.

## Object layout

Upload objects using the paths recorded in `api/_resource-manifest-v1.js`. The private bucket should therefore contain the recovered `resources/...` tree and:

`official/Y1S1_Final_Exam_Timetable_V3_15-09-2026.pdf`

Past Papers are intentionally external/public and are not part of this bucket or gateway.

## Cache boundary

`/api/` and `/resource/` are network-only in the service worker. Responses marked `private` or `no-store` are never written to Cache Storage. Signed Supabase URLs remain cross-origin and are outside the FinalForge service-worker cache.

# Offline FinalForge registration-denial benchmark

**Safety boundary:** This runs `registerStudent` directly with entirely synthetic input and a mocked Firestore interface. It uses no Firebase credentials, no real users, no Auth SDK create operation, no live network and no production data. The mocked `auth.createUser` throws if invoked.

## Reproduce
```bash
npm ci --ignore-scripts
npm run benchmark:offline
```

The read-only `Offline signup performance baseline` workflow runs on benchmark-related changes and manual dispatch and provides a downloadable `benchmark-results.json` artifact for 14 days.

The four scenarios are malformed student ID (600 requests), absent allowlist (300), inactive allowlist (300), and already-claimed student ID (300). Benchmarks warm up for 16 iterations before reporting median/p95/p99/max handler times, synthetic in-process throughput, CPU time, heap peak and post-GC heap delta. All must return the expected non-success status, and **no account creation is permitted**.

GitHub Actions shared runners vary; the p95 budgets are **advisory only**, not performance SLAs or guaranteed scale capacities. This is deliberately not a concurrency/load test against Firebase transactions, Vercel functions, email verification, device traffic or a student browser. Before a production release, independently validate Firestore Security Rules and authentication journeys in an authorized test environment, with known test accounts and no bulk signup operations.

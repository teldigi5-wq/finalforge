import test from 'node:test';
import assert from 'node:assert/strict';
import { federationConfig } from '../api/keyless.js';

const env = {
  GCP_PROJECT_NUMBER: '954266816069',
  GCP_WORKLOAD_IDENTITY_POOL_ID: 'finalforge-vercel',
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: 'vercel',
  GCP_SERVICE_ACCOUNT_EMAIL: 'finalforge-signup@finalforge-dd1cf.iam.gserviceaccount.com',
};

test('keyless config binds tokens to the exact FinalForge provider and service account', () => {
  assert.deepEqual(federationConfig(env), {
    audience: 'https://iam.googleapis.com/projects/954266816069/locations/global/workloadIdentityPools/finalforge-vercel/providers/vercel',
    serviceAccount: env.GCP_SERVICE_ACCOUNT_EMAIL,
  });
});

test('wrong project and foreign service account fail closed', () => {
  assert.throws(() => federationConfig({ ...env, GCP_PROJECT_NUMBER: '123456789012' }));
  assert.throws(() => federationConfig({ ...env, GCP_SERVICE_ACCOUNT_EMAIL: 'elsewhere@other-project.iam.gserviceaccount.com' }));
});

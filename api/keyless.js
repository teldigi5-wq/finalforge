import { randomUUID } from 'node:crypto';
import { getVercelOidcToken } from '@vercel/oidc';
import { ExternalAccountClient, GoogleAuth } from 'google-auth-library';
import { Firestore } from '@google-cloud/firestore';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = 'finalforge-dd1cf';

export function federationConfig(env = process.env) {
  const number = env.GCP_PROJECT_NUMBER;
  const pool = env.GCP_WORKLOAD_IDENTITY_POOL_ID;
  const provider = env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
  const serviceAccount = env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (number !== '954266816069' || !/^[a-z][a-z0-9-]{3,31}$/.test(pool || '') ||
      !/^[a-z][a-z0-9-]{3,31}$/.test(provider || '') ||
      !/^[a-z0-9-]+@finalforge-dd1cf\.iam\.gserviceaccount\.com$/.test(serviceAccount || '')) {
    throw new Error('FinalForge workload federation is not configured');
  }
  const audience = `https://iam.googleapis.com/projects/${number}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`;
  return { audience, serviceAccount };
}

export async function keylessServices() {
  const { audience, serviceAccount } = federationConfig();
  // The Vercel helper obtains the function's platform-issued token and requests
  // the Google provider audience. Capture it for this one request only.
  const oidcToken = await getVercelOidcToken({ audience });
  const client = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience: `//${audience.slice('https://'.length)}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: async () => oidcToken },
  });
  if (!client) throw new Error('Unable to initialize workload federation');
  const googleAuth = new GoogleAuth({ projectId, authClient: client });
  const db = new Firestore({ projectId, auth: googleAuth, preferRest: true });
  const app = initializeApp({
    projectId,
    credential: {
      async getAccessToken() {
        const token = await client.getAccessToken();
        if (!token.token) throw new Error('Unable to obtain short-lived Firebase access token');
        return {
          access_token: token.token,
          expires_in: Math.max(1, Math.floor(((client.credentials.expiry_date || Date.now() + 300000) - Date.now()) / 1000)),
        };
      },
    },
  }, `signup-${randomUUID()}`);
  return { auth: getAuth(app), db, close: async () => { await db.terminate(); await deleteApp(app); } };
}

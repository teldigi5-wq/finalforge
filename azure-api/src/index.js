import { app } from '@azure/functions';

import { runVercelHandler } from './adapter.js';

import signupHandler from './vercel/signup.js';
import activateAccountHandler from './vercel/activate-account.js';
import restartRegistrationHandler from './vercel/restart-registration.js';
import rateHandler from './vercel/rate.js';
import publicStatsHandler from './vercel/public-stats.js';
import resourceUrlHandler from './vercel/resource-url.js';
import adminQuestionsHandler from './vercel/admin-questions.js';
import questionBankHandler from './vercel/question-bank.js';

app.http('signup', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'signup',
  handler: async request =>
    runVercelHandler(
      signupHandler,
      request,
      { maxBodyBytes: 1536 }
    )
});

app.http('activate-account', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'activate-account',
  handler: async request =>
    runVercelHandler(
      activateAccountHandler,
      request,
      { maxBodyBytes: 512 }
    )
});

app.http('restart-registration', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'restart-registration',
  handler: async request =>
    runVercelHandler(
      restartRegistrationHandler,
      request,
      { maxBodyBytes: 512 }
    )
});

app.http('rate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'rate',
  handler: async request =>
    runVercelHandler(
      rateHandler,
      request,
      { maxBodyBytes: 1024 }
    )
});

app.http('public-stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'public-stats',
  handler: async request =>
    runVercelHandler(
      publicStatsHandler,
      request
    )
});

app.http('resource-url', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'resource-url',
  handler: async request =>
    runVercelHandler(
      resourceUrlHandler,
      request,
      { maxBodyBytes: 2048 }
    )
});

/*
 * Azure Functions reserves root paths that begin with /admin for host APIs.
 * Static Web Apps exposes this externally under /api, so keep the function
 * route neutral and let the handler enforce the real admin claim boundary.
 */
app.http('question-studio-admin', {
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  authLevel: 'anonymous',
  route: 'question-studio-admin',
  handler: async request =>
    runVercelHandler(
      adminQuestionsHandler,
      request,
      { maxBodyBytes: 32768 }
    )
});

app.http('question-bank', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'question-bank',
  handler: async request =>
    runVercelHandler(
      questionBankHandler,
      request
    )
});

import { app } from '@azure/functions';

import { runVercelHandler } from './adapter.js';

import signupHandler from './vercel/signup.js';
import rateHandler from './vercel/rate.js';
import publicStatsHandler from './vercel/public-stats.js';
import resourceUrlHandler from './vercel/resource-url.js';

app.http('signup', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'signup',
  handler: async request =>
    runVercelHandler(
      signupHandler,
      request,
      { maxBodyBytes: 2048 }
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

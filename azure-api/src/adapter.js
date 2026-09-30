function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function configuredPublicOrigin() {
  const value = normalizeOrigin(
    process.env.FINALFORGE_PUBLIC_ORIGIN
  );

  if (!value) return '';

  try {
    const url = new URL(value);

    if (url.protocol !== 'https:') {
      return '';
    }

    if (url.pathname !== '/' || url.search || url.hash) {
      return '';
    }

    return url.origin;
  } catch {
    return '';
  }
}

function requestHeaders(request) {
  const headers = {};

  for (const [key, value] of request.headers.entries()) {
    headers[String(key).toLowerCase()] = value;
  }

  const forwardedFor = String(
    headers['x-forwarded-for'] ||
    headers['x-azure-clientip'] ||
    ''
  );

  // Compatibility with the existing certified FinalForge handlers.
  headers['x-vercel-forwarded-for'] = forwardedFor;

  return headers;
}

function responseAdapter() {
  let statusCode = 200;
  let jsonBody = null;
  const headers = {};

  const response = {
    setHeader(name, value) {
      headers[String(name)] = Array.isArray(value)
        ? value.join(', ')
        : String(value);

      return response;
    },

    status(code) {
      statusCode = Number(code);
      return response;
    },

    json(payload) {
      jsonBody = payload;
      return response;
    }
  };

  return {
    response,

    result() {
      return {
        status: statusCode,
        headers,
        jsonBody
      };
    }
  };
}

function forbiddenOrigin() {
  return {
    status: 403,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    },
    jsonBody: {
      error: 'Invalid origin.'
    }
  };
}

export async function runVercelHandler(
  handler,
  request,
  { maxBodyBytes = 0 } = {}
) {
  const method = request.method.toUpperCase();
  const headers = requestHeaders(request);

  /*
   * Azure Static Web Apps proxies API requests through its managed
   * Functions backend. Do not trust X-Forwarded-Host for authorization.
   *
   * Instead, state-changing requests must exactly match the public
   * origin configured as an Azure application setting.
   */
  if (!['GET', 'HEAD'].includes(method)) {
    const trustedOrigin = configuredPublicOrigin();
    const suppliedOrigin = normalizeOrigin(headers.origin);

    if (!trustedOrigin || suppliedOrigin !== trustedOrigin) {
      return forbiddenOrigin();
    }

    // Existing FinalForge Vercel handlers independently perform:
    //
    // origin === https://${host}
    //
    // Give them the already server-validated public hostname.
    headers.host = new URL(trustedOrigin).host;
  } else {
    // GET handlers do not use Origin as an authorization boundary.
    headers.host = new URL(request.url).host;
  }

  let body;

  if (!['GET', 'HEAD'].includes(method)) {
    let raw = '';

    try {
      raw = await request.text();
    } catch {
      return {
        status: 400,
        headers: {
          'Cache-Control': 'no-store'
        },
        jsonBody: {
          error: 'Invalid request body.'
        }
      };
    }

    const actualSize = Buffer.byteLength(raw, 'utf8');

    headers['content-length'] = String(actualSize);

    if (maxBodyBytes && actualSize > maxBodyBytes) {
      return {
        status: 413,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        },
        jsonBody: {
          error: 'Request too large.'
        }
      };
    }

    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        return {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          },
          jsonBody: {
            error: 'Invalid JSON.'
          }
        };
      }
    } else {
      body = {};
    }
  }

  const remoteAddress = String(
    headers['x-forwarded-for'] ||
    headers['x-azure-clientip'] ||
    'unknown'
  )
    .split(',')[0]
    .trim();

  const req = {
    method,
    headers,
    body,
    socket: {
      remoteAddress: remoteAddress || 'unknown'
    }
  };

  const output = responseAdapter();

  try {
    await handler(req, output.response);
    return output.result();
  } catch {
    return {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      },
      jsonBody: {
        error: 'Service temporarily unavailable.'
      }
    };
  }
}

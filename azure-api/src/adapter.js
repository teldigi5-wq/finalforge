function requestHeaders(request) {
  const headers = {};

  for (const [key, value] of request.headers.entries()) {
    headers[String(key).toLowerCase()] = value;
  }

  const requestUrl = new URL(request.url);

  const forwardedHost = String(
    headers['x-forwarded-host'] || ''
  )
    .split(',')[0]
    .trim();

  headers.host = forwardedHost || requestUrl.host;

  const forwardedFor = String(
    headers['x-forwarded-for'] ||
    headers['x-azure-clientip'] ||
    ''
  );

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

export async function runVercelHandler(
  handler,
  request,
  { maxBodyBytes = 0 } = {}
) {
  const headers = requestHeaders(request);

  let body;

  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    let raw = '';

    try {
      raw = await request.text();
    } catch {
      return {
        status: 400,
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
    method: request.method.toUpperCase(),
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

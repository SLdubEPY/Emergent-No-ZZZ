let csrfToken = null;
let sessionPromise = null;

async function parseResponse(response) {
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function request(path, options = {}, canRetry = true) {
  const headers = { accept: 'application/json', ...options.headers };
  if (options.body) headers['content-type'] = 'application/json';
  if (options.method && options.method !== 'GET') {
    if (!csrfToken) await initializeSession();
    headers['x-csrf-token'] = csrfToken;
  }

  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: 'same-origin',
      signal: options.signal || AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError') throw new Error('The secure API timed out. Please try again.');
    throw new Error('Could not reach the secure API. Check your connection and try again.');
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    if (canRetry && response.status === 403 && payload?.error?.code === 'CSRF_INVALID') {
      csrfToken = null;
      await initializeSession();
      return request(path, options, false);
    }
    throw new Error(payload?.error?.message || 'The secure API request failed.');
  }
  if (payload?.csrfToken) csrfToken = payload.csrfToken;
  return payload;
}

export async function initializeSession() {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    let response;
    try {
      response = await fetch('/api/v1/session', {
        credentials: 'same-origin', headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error('Could not establish a secure session.');
    }
    if (!response.ok) throw new Error('Could not establish a secure session.');
    const data = await response.json();
    if (!data?.csrfToken) throw new Error('The secure session response was invalid.');
    csrfToken = data.csrfToken;
    return data;
  })();
  try { return await sessionPromise; }
  finally { sessionPromise = null; }
}

export const api = {
  listVentures: () => request('/v1/ventures'),
  signUp: input => request('/v1/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  login: input => request('/v1/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request('/v1/auth/logout', { method: 'POST' }),
  me: () => request('/v1/auth/me'),
  exportAccount: () => request('/v1/auth/export'),
  deleteAccount: password => request('/v1/auth/account', { method: 'DELETE', body: JSON.stringify({ password, confirmation: 'DELETE' }) }),
  createBlueprint: brief => request('/v1/blueprints', { method: 'POST', body: JSON.stringify(brief) }),
  createVenture: brief => request('/v1/ventures', { method: 'POST', body: JSON.stringify(brief) }),
  deleteVenture: id => request(`/v1/ventures/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  operator: message => request('/v1/operator', { method: 'POST', body: JSON.stringify({ message }) }),
};

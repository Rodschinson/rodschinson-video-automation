/**
 * Central fetch wrapper — automatically attaches the auth token from localStorage.
 * Drop-in replacement for fetch(): same signature, same return value.
 */
export function apiFetch(url, opts = {}) {
  const token = localStorage.getItem('cs_auth_token')
  return fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

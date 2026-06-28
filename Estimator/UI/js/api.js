// ═══════════════════════════════════════════ API SERVICE ════
// All calls to the Express server (port 4000).
// Every function returns the unwrapped `data` on success,
// or throws an Error with the server's error message.

const API_BASE = 'http://localhost:4000/api';

async function _fetch(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
  return json.data;
}

// ── Groups ────────────────────────────────────────────────

const api = {
  // GET /api/groups
  getGroups() {
    return _fetch('GET', '/groups');
  },

  // GET /api/groups/:id
  getGroup(groupId) {
    return _fetch('GET', `/groups/${groupId}`);
  },

  // POST /api/groups
  createGroup(payload) {
    return _fetch('POST', '/groups', payload);
  },

  // ── Actuals ──────────────────────────────────────────────

  // GET /api/groups/:groupId/actuals?year=2026
  getActuals(groupId, year) {
    return _fetch('GET', `/groups/${groupId}/actuals?year=${year}`);
  },

  // POST /api/groups/:groupId/actuals
  saveActuals(groupId, year, monthIdx, actualsMap) {
    return _fetch('POST', `/groups/${groupId}/actuals`, {
      year,
      monthIdx,
      actuals: actualsMap,
      savedAt: new Date().toISOString(),
    });
  },

  // ── Bills ────────────────────────────────────────────────

  // GET /api/groups/:groupId/bills[?monthIdx=N]
  getBills(groupId, monthIdx) {
    const qs = monthIdx !== undefined ? `?monthIdx=${monthIdx}` : '';
    return _fetch('GET', `/groups/${groupId}/bills${qs}`);
  },

  // POST /api/groups/:groupId/bills
  submitBill(groupId, payload) {
    return _fetch('POST', `/groups/${groupId}/bills`, payload);
  },

  // ── Logs ─────────────────────────────────────────────────

  // GET /api/groups/:groupId/logs[?monthIdx=N]
  getLogs(groupId, monthIdx) {
    const qs = monthIdx !== undefined ? `?monthIdx=${monthIdx}` : '';
    return _fetch('GET', `/groups/${groupId}/logs${qs}`);
  },

  // ── Analysis ─────────────────────────────────────────────

  // POST /api/groups/:groupId/analysis?year=2026&monthIdx=N
  getAnalysis(groupId, year, monthIdx, categories) {
    return _fetch(
      'POST',
      `/groups/${groupId}/analysis?year=${year}&monthIdx=${monthIdx}`,
      { categories }
    );
  },
};

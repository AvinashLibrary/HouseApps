const API_BASE = 'http://localhost:4000/api';

async function _fetch(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
  return json.data;
}

export const api = {
  getGroups:   ()                   => _fetch('GET',  '/groups'),
  getGroup:    (id)                 => _fetch('GET',  `/groups/${id}`),
  createGroup: (payload)            => _fetch('POST', '/groups', payload),
  getActuals:  (gid, year)          => _fetch('GET',  `/groups/${gid}/actuals?year=${year}`),
  saveActuals: (gid, year, mi, map) => _fetch('POST', `/groups/${gid}/actuals`, { year, monthIdx: mi, actuals: map, savedAt: new Date().toISOString() }),
  getBills:    (gid, mi)            => _fetch('GET',  `/groups/${gid}/bills${mi !== undefined ? `?monthIdx=${mi}` : ''}`),
  submitBill:  (gid, payload)       => _fetch('POST', `/groups/${gid}/bills`, payload),
  getLogs:     (gid, mi)            => _fetch('GET',  `/groups/${gid}/logs${mi !== undefined ? `?monthIdx=${mi}` : ''}`),
  getAnalysis: (gid, year, mi, cats)=> _fetch('POST', `/groups/${gid}/analysis?year=${year}&monthIdx=${mi}`, { categories: cats }),
};

const API_BASE = 'http://localhost:4000/api';

async function _fetch(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
  return json.data;
}

// Separate from _fetch because multipart requests must NOT set a Content-Type
// header manually — the browser needs to add its own boundary string, which
// only happens if Content-Type is left unset when the body is a FormData.
async function _fetchMultipart(method, path, formData) {
  const res = await fetch(API_BASE + path, { method, body: formData });
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
  scanReceipt: (gid, file)          => { const fd = new FormData(); fd.append('receipt', file); return _fetchMultipart('POST', `/groups/${gid}/ocr`, fd); },
};
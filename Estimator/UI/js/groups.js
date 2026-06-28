// ═══════════════════════════════════════ HASH ROUTER ══════
// Routes:
//   #/hub                     → Group Hub
//   #/group/:id               → Calculator, default tab (dashboard)
//   #/group/:id/:tab          → Calculator, specific tab

// ── Boot ──────────────────────────────────────────────────
// Called once by index.html before the hash router runs.
// Loads groups from the server; if the server has none, seeds the default group.
async function init() {
  try {
    const serverGroups = await api.getGroups();
    groups = serverGroups;
  } catch (e) {
    console.error('Failed to load groups from server:', e);
    showToast('⚠ Could not connect to server — groups unavailable');
  }
}

async function router() {
  const hash = location.hash || '#/hub';
  const parts = hash.replace('#/', '').split('/');
  const view  = parts[0];

  if (view === 'group' && parts[1]) {
    const id  = parts[1];
    const tab = parts[2] || 'dashboard';
    const grp = groups.find(g => g.id === id);
    if (grp) {
      await _activateApp(grp, tab);
    } else {
      navigate('/hub');
    }
  } else {
    _activateHub();
  }
}

// Push a new hash without triggering the popstate handler re-entrantly
function navigate(path) {
  location.hash = '#' + path;
}

// Called by tab clicks to keep URL in sync
function setTabInUrl(tabName) {
  if (!currentGroup) return;
  history.replaceState(null, '', `#/group/${currentGroup.id}/${tabName}`);
}

function _activateHub() {
  currentGroup = null;
  document.getElementById('view-hub').style.display = 'block';
  document.getElementById('view-app').style.display = 'none';
  document.getElementById('header-right-hub').style.display = '';
  document.getElementById('header-right-app').style.display = 'none';
  document.getElementById('header-subtitle').textContent = '2026';
  renderGroupHub();
  cancelEditor();
}

async function _activateApp(grp, tab) {
  currentGroup = grp;
  document.getElementById('view-hub').style.display = 'none';
  document.getElementById('view-app').style.display = 'block';
  document.getElementById('header-right-hub').style.display = 'none';
  document.getElementById('header-right-app').style.display = 'flex';
  document.getElementById('header-group-name').textContent = currentGroup.name;
  document.getElementById('header-subtitle').textContent   = currentGroup.name;

  // Load actuals, bills and logs for this group from the server
  await _loadGroupData(grp.id);

  buildAll();
  showTab(tab);
}

async function _loadGroupData(groupId) {
  const year = 2026;
  // Reset in-memory state before loading
  Object.keys(actuals).forEach(k => delete actuals[k]);
  billLog.length   = 0;
  changeLog.length = 0;

  try {
    const [actualsResp, bills, logs] = await Promise.all([
      api.getActuals(groupId, year),
      api.getBills(groupId),
      api.getLogs(groupId),
    ]);

    // actualsResp.months = { "5": { "rent_rent": 22500 }, ... }
    // UI key format: "{itemKey}-{monthIdx}"  (monthIdx = calendarMonth - 1? No — server monthIdx 0-11)
    if (actualsResp && actualsResp.months) {
      Object.entries(actualsResp.months).forEach(([monthIdx, items]) => {
        Object.entries(items).forEach(([itemKey, val]) => {
          actuals[`${itemKey}-${monthIdx}`] = val;
        });
      });
    }

    // Bills: server returns BillEntry[] with ts as ISO string — convert to Date
    bills.forEach(b => billLog.push({ ...b, ts: new Date(b.ts) }));

    // Logs: server ChangeEntry[] — ts as ISO string
    logs.forEach(e => changeLog.push({ ...e, ts: new Date(e.ts) }));

    // Sort newest first (server may return oldest first)
    billLog.sort((a, b) => b.ts - a.ts);
    changeLog.sort((a, b) => b.ts - a.ts);
  } catch (e) {
    console.error('Failed to load group data:', e);
    showToast('⚠ Could not load saved data — working offline');
  }
}

// ═══════════════════════════════════════ GROUP HUB ════════

function renderGroupHub() {
  const grid = document.getElementById('group-grid');
  if (groups.length === 0) {
    grid.innerHTML = `<div class="hub-empty"><div class="es-icon">🏠</div><h3>No groups yet</h3><p>Create your first household group to get started.</p></div>`;
    return;
  }
  grid.innerHTML = groups.map(g => {
    const avatars = g.members.map(m =>
      `<div class="avatar" style="background:${m.color}" title="${m.name}">${m.name.slice(0,2).toUpperCase()}</div>`
    ).join('');
    return `<div class="group-card">
      <div class="gc-name">${g.name}</div>
      <div class="gc-members">${avatars}</div>
      <div class="gc-meta">${g.members.length} member${g.members.length !== 1 ? 's' : ''}</div>
      <div class="gc-actions">
        <button class="btn-open" onclick="openGroup('${g.id}')">Open</button>
        <button class="btn-icon" title="Edit"   onclick="editGroup('${g.id}')">✏️</button>
        <button class="btn-icon" title="Delete" onclick="deleteGroup('${g.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function openGroup(id) {
  navigate(`/group/${id}/dashboard`);
}

function goToHub() {
  navigate('/hub');
}

function deleteGroup(id) {
  if (!confirm('Delete this group?')) return;
  groups = groups.filter(g => g.id !== id);
  renderGroupHub();
}

// ═══════════════════════════════════════ GROUP EDITOR ═════

let editorMembers = [];

function startNewGroup() {
  editingGroupId = null;
  document.getElementById('editor-title').textContent = 'New Group';
  document.getElementById('editor-name').value = '';
  editorMembers = [{ id: 'p' + Date.now(), name: '', color: MEMBER_COLORS[0], salary: 0, familyDeduction: 0 }];
  renderMemberRows();
  renderBudgetPctsTable();
  renderSplitsTable();
  document.getElementById('group-editor').style.display = 'block';
  document.getElementById('group-editor').scrollIntoView({ behavior: 'smooth' });
}

function editGroup(id) {
  const g = groups.find(g => g.id === id);
  if (!g) return;
  editingGroupId = id;
  document.getElementById('editor-title').textContent = 'Edit Group';
  document.getElementById('editor-name').value = g.name;
  editorMembers = g.members.map(m => ({ ...m }));
  renderMemberRows();
  renderBudgetPctsTable(g.budgetPcts);
  renderSplitsTable(g.splits);
  document.getElementById('group-editor').style.display = 'block';
  document.getElementById('group-editor').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditor() {
  const panel = document.getElementById('group-editor');
  if (panel) panel.style.display = 'none';
  editingGroupId = null;
  editorMembers  = [];
}

function addMemberRow() {
  const idx = editorMembers.length;
  editorMembers.push({ id: 'p' + Date.now(), name: '', color: MEMBER_COLORS[idx % MEMBER_COLORS.length], salary: 0, familyDeduction: 0 });
  renderMemberRows();
  renderSplitsTable();
}

function removeMemberRow(id) {
  if (editorMembers.length <= 1) { showToast('⚠ At least one member required'); return; }
  editorMembers = editorMembers.filter(m => m.id !== id);
  renderMemberRows();
  renderSplitsTable();
}

function renderMemberRows() {
  document.getElementById('member-list').innerHTML = editorMembers.map((m, i) => `
    <div class="member-row" id="mrow-${m.id}">
      <input class="m-name" type="text" placeholder="Name" value="${m.name}"
        oninput="editorMembers[${i}].name=this.value; syncMemberToSplits()" />
      <input class="m-sal" type="number" placeholder="Salary" value="${m.salary||''}"
        oninput="editorMembers[${i}].salary=parseFloat(this.value)||0; updateMemberNet(${i})" />
      <input class="m-fam" type="number" placeholder="Family deduction" value="${m.familyDeduction||''}"
        oninput="editorMembers[${i}].familyDeduction=parseFloat(this.value)||0; updateMemberNet(${i})" />
      <div class="m-net" id="mnet-${m.id}">${fmt(Math.max(0,(m.salary||0)-(m.familyDeduction||0)))}</div>
      <button class="m-del" onclick="removeMemberRow('${m.id}')" title="Remove">✕</button>
    </div>`).join('');
}

function updateMemberNet(i) {
  const m = editorMembers[i];
  setTxt(`mnet-${m.id}`, fmt(Math.max(0, (m.salary||0) - (m.familyDeduction||0))));
}

function syncMemberToSplits() {
  renderSplitsTableHeaders();
}

// ═══════════════════════════════════ BUDGET PCT EDITOR ════

let editorBudgetPcts = {}; // working copy while editing

function renderBudgetPctsTable(existing) {
  editorBudgetPcts = existing
    ? JSON.parse(JSON.stringify(existing))
    : buildDefaultBudgetPcts();

  let html = '';
  BUDGET_STRUCTURE.forEach(cat => {
    const catPct     = (editorBudgetPcts[cat.key]?.pct ?? cat.pct) * 100;
    const subTotal   = BUDGET_STRUCTURE.find(c=>c.key===cat.key)?.subs
      .reduce((s,sub) => s + ((editorBudgetPcts[cat.key]?.subs?.[sub.key] ?? sub.pct)*100), 0) || 0;
    const subSumOk   = Math.round(subTotal) === 100;

    html += `<tr class="split-cat-hdr">
      <td><strong>${cat.label}</strong></td>
      <td style="text-align:center">
        <input class="split-inp" type="number" min="0" max="100" step="0.1"
          id="bpct-cat-${cat.key}" value="${catPct.toFixed(1)}"
          oninput="onBudgetCatPctInput('${cat.key}')" />
      </td>
      <td style="text-align:center;font-size:0.75rem;color:var(--muted)">
        <span id="bpct-subsum-${cat.key}" class="${subSumOk?'split-ok':'split-warn'}">
          ${subSumOk ? '✓ 100%' : `✗ ${subTotal.toFixed(1)}%`}
        </span>
      </td>
      <td style="color:var(--muted);font-size:0.75rem" id="bpct-cat-eff-${cat.key}">
        ${catPct.toFixed(1)}% of salary
      </td>
    </tr>`;

    cat.subs.forEach(sub => {
      const subPct = (editorBudgetPcts[cat.key]?.subs?.[sub.key] ?? sub.pct) * 100;
      const effPct = catPct * subPct / 100;
      html += `<tr class="sub-item">
        <td style="padding-left:24px">${sub.label}</td>
        <td></td>
        <td style="text-align:center">
          <input class="split-inp" type="number" min="0" max="100" step="0.1"
            id="bpct-sub-${sub.key}" value="${subPct.toFixed(1)}"
            oninput="onBudgetSubPctInput('${cat.key}','${sub.key}')" />
        </td>
        <td style="color:var(--muted);font-size:0.75rem" id="bpct-sub-eff-${sub.key}">
          ${effPct.toFixed(1)}% of salary
        </td>
      </tr>`;
    });
  });
  document.getElementById('budget-pcts-tbody').innerHTML = html;
  updateBudgetCatTotal();
}

function onBudgetCatPctInput(catKey) {
  const el  = document.getElementById(`bpct-cat-${catKey}`);
  const pct = parseFloat(el?.value) || 0;
  if (!editorBudgetPcts[catKey]) editorBudgetPcts[catKey] = { pct: 0, subs: {} };
  editorBudgetPcts[catKey].pct = pct / 100;
  // Update effective % labels for all subs in this cat
  const cat = BUDGET_STRUCTURE.find(c => c.key === catKey);
  if (cat) {
    cat.subs.forEach(sub => {
      const subPct = (editorBudgetPcts[catKey]?.subs?.[sub.key] ?? sub.pct) * 100;
      setTxt(`bpct-sub-eff-${sub.key}`, `${(pct * subPct / 100).toFixed(1)}% of salary`);
    });
    setTxt(`bpct-cat-eff-${catKey}`, `${pct.toFixed(1)}% of salary`);
  }
  updateBudgetCatTotal();
}

function onBudgetSubPctInput(catKey, subKey) {
  const el  = document.getElementById(`bpct-sub-${subKey}`);
  const pct = parseFloat(el?.value) || 0;
  if (!editorBudgetPcts[catKey]) editorBudgetPcts[catKey] = { pct: 0, subs: {} };
  if (!editorBudgetPcts[catKey].subs) editorBudgetPcts[catKey].subs = {};
  editorBudgetPcts[catKey].subs[subKey] = pct / 100;
  // Update this sub's effective %
  const catPct = (editorBudgetPcts[catKey]?.pct ?? 0) * 100;
  setTxt(`bpct-sub-eff-${subKey}`, `${(catPct * pct / 100).toFixed(1)}% of salary`);
  // Update sub-sum validity indicator for this category
  const cat     = BUDGET_STRUCTURE.find(c => c.key === catKey);
  if (cat) {
    const subSum  = cat.subs.reduce((s,sub) => s + ((editorBudgetPcts[catKey]?.subs?.[sub.key] ?? sub.pct)*100), 0);
    const sumOk   = Math.round(subSum) === 100;
    const totEl   = document.getElementById(`bpct-subsum-${catKey}`);
    if (totEl) {
      totEl.textContent = sumOk ? '✓ 100%' : `✗ ${subSum.toFixed(1)}%`;
      totEl.className   = sumOk ? 'split-ok' : 'split-warn';
    }
  }
}

function updateBudgetCatTotal() {
  const total = BUDGET_STRUCTURE.reduce((s, cat) => {
    const el = document.getElementById(`bpct-cat-${cat.key}`);
    return s + (parseFloat(el?.value) || 0);
  }, 0);
  const el = document.getElementById('bpct-cat-total');
  if (el) {
    el.textContent = total === 100 ? '✓ 100%' : `✗ ${total.toFixed(1)}%`;
    el.className   = total === 100 ? 'split-ok' : 'split-warn';
  }
}

function readBudgetPctsFromTable() {
  const pcts = {};
  BUDGET_STRUCTURE.forEach(cat => {
    const catEl = document.getElementById(`bpct-cat-${cat.key}`);
    pcts[cat.key] = { pct: (parseFloat(catEl?.value) || 0) / 100, subs: {} };
    cat.subs.forEach(sub => {
      const subEl = document.getElementById(`bpct-sub-${sub.key}`);
      pcts[cat.key].subs[sub.key] = (parseFloat(subEl?.value) || 0) / 100;
    });
  });
  return pcts;
}

function resetBudgetPctsToDefault() {
  renderBudgetPctsTable(buildDefaultBudgetPcts());
}

function validateBudgetPcts() {
  // Category % must sum to 100 and each category's sub-% must sum to 100
  const catTotal = BUDGET_STRUCTURE.reduce((s, cat) => {
    const el = document.getElementById(`bpct-cat-${cat.key}`);
    return s + (parseFloat(el?.value) || 0);
  }, 0);
  if (Math.round(catTotal) !== 100) {
    showToast(`⚠ Category percentages sum to ${catTotal.toFixed(1)}% — must be 100%`);
    return false;
  }
  for (const cat of BUDGET_STRUCTURE) {
    const subSum = cat.subs.reduce((s, sub) => {
      const el = document.getElementById(`bpct-sub-${sub.key}`);
      return s + (parseFloat(el?.value) || 0);
    }, 0);
    if (Math.round(subSum) !== 100) {
      showToast(`⚠ Sub-categories of "${cat.label}" sum to ${subSum.toFixed(1)}% — must be 100%`);
      return false;
    }
  }
  return true;
}

// ═══════════════════════════════════════ SPLIT EDITOR ═════

function renderSplitsTable(existingSplits) {
  renderSplitsTableHeaders();
  const splits = existingSplits || buildDefaultSplits(editorMembers);
  let html = '';
  BUDGET_STRUCTURE.forEach(cat => {
    html += `<tr class="split-cat-hdr"><td colspan="${editorMembers.length + 2}">${cat.label}</td></tr>`;
    cat.subs.forEach(sub => {
      const rowSum = editorMembers.reduce((s,m) => s + (splits[sub.key]?.[m.id] || 0), 0);
      html += `<tr>
        <td>${sub.label}</td>
        ${editorMembers.map(m => `
          <td><input class="split-inp" type="number" min="0" max="100"
            id="sp-${m.id}-${sub.key}"
            value="${splits[sub.key]?.[m.id] ?? 0}"
            oninput="onSplitInput('${m.id}','${sub.key}')" /></td>`).join('')}
        <td class="split-total ${rowSum===100?'split-ok':'split-warn'}" id="sptot-${sub.key}">
          ${rowSum===100 ? '✓ 100%' : `✗ ${rowSum}%`}
        </td>
      </tr>`;
    });
  });
  document.getElementById('splits-tbody').innerHTML = html;
}

function renderSplitsTableHeaders() {
  document.getElementById('splits-thead').innerHTML =
    `<th>Sub-Category</th>` +
    editorMembers.map(m => `<th style="background:${m.color}">${m.name || 'Member'}</th>`).join('') +
    `<th>Total</th>`;
}

function onSplitInput(_memberId, subKey) {
  const total = editorMembers.reduce((s,m) => {
    const el = document.getElementById(`sp-${m.id}-${subKey}`);
    return s + (parseFloat(el?.value) || 0);
  }, 0);
  const totEl = document.getElementById(`sptot-${subKey}`);
  if (totEl) {
    totEl.textContent = total === 100 ? '✓ 100%' : `✗ ${total}%`;
    totEl.className   = `split-total ${total === 100 ? 'split-ok' : 'split-warn'}`;
  }
}

function applyIncomeRatioAll() {
  const nets  = editorMembers.map(m => Math.max(0, (m.salary||0) - (m.familyDeduction||0)));
  const total = nets.reduce((s,n) => s+n, 0);
  const allSubs = BUDGET_STRUCTURE.flatMap(c => c.subs.map(s => s.key));
  allSubs.forEach(subKey => {
    let rem = 100;
    editorMembers.forEach((m, i) => {
      const el = document.getElementById(`sp-${m.id}-${subKey}`);
      if (!el) return;
      const pct = i < editorMembers.length - 1
        ? (total > 0 ? Math.round(nets[i] / total * 100) : Math.round(100 / editorMembers.length))
        : rem;
      el.value = pct;
      rem -= pct;
    });
    onSplitInput(editorMembers[0]?.id, subKey);
  });
}

function readSplitsFromTable() {
  const splits = {};
  BUDGET_STRUCTURE.flatMap(c => c.subs).forEach(sub => {
    splits[sub.key] = {};
    editorMembers.forEach(m => {
      const el = document.getElementById(`sp-${m.id}-${sub.key}`);
      splits[sub.key][m.id] = parseFloat(el?.value) || 0;
    });
  });
  return splits;
}

async function saveGroup() {
  const name = document.getElementById('editor-name').value.trim();
  if (!name) { showToast('⚠ Enter a group name'); return; }
  if (editorMembers.some(m => !m.name.trim())) { showToast('⚠ All members need a name'); return; }

  if (!validateBudgetPcts()) return;

  const splits  = readSplitsFromTable();
  const allSubs = BUDGET_STRUCTURE.flatMap(c => c.subs.map(s => s.key));
  const badRows = allSubs.filter(subKey => {
    const sum = editorMembers.reduce((s,m) => s + (splits[subKey]?.[m.id] || 0), 0);
    return sum !== 100;
  });
  if (badRows.length > 0) {
    showToast(`⚠ ${badRows.length} row(s) don't sum to 100% — fix before saving`);
    return;
  }

  const budgetPcts = readBudgetPctsFromTable();

  if (editingGroupId) {
    // Editing an existing group — update in local array only
    // (no PUT endpoint yet; server state reflects creation-time data)
    const g = groups.find(g => g.id === editingGroupId);
    if (g) { g.name = name; g.members = editorMembers.map(m => ({...m})); g.splits = splits; g.budgetPcts = budgetPcts; }
  } else {
    try {
      const saved = await api.createGroup({
        name,
        members:    editorMembers.map(m => ({...m})),
        splits,
        budgetPcts,
      });
      groups.push(saved);
    } catch (e) {
      showToast('⚠ Failed to save group: ' + e.message);
      return;
    }
  }
  cancelEditor();
  renderGroupHub();
  showToast('✓ Group saved');
}

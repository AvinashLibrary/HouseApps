// Debounced save for actuals — fires 800 ms after the last keystroke in a month
const _actualsSaveTimers = {};

function _scheduleActualsSave(mi) {
  clearTimeout(_actualsSaveTimers[mi]);
  _actualsSaveTimers[mi] = setTimeout(() => _flushActuals(mi), 800);
}

async function _flushActuals(mi) {
  if (!currentGroup) return;
  // Collect all item values for this month
  const monthActuals = {};
  BUDGET_STRUCTURE.forEach(cat => cat.subs.forEach(sub => {
    (DETAIL_ITEMS[sub.key] || []).forEach(item => {
      const v = actuals[`${item.key}-${mi}`];
      if (v !== undefined) monthActuals[item.key] = v;
    });
  }));
  try {
    await api.saveActuals(currentGroup.id, 2026, mi, monthActuals);
  } catch (e) {
    console.error('Failed to save actuals:', e);
    showToast('⚠ Actuals not saved: ' + e.message);
  }
}



function showTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-nav button').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('tab-' + name);
  if (panel) panel.classList.add('active');

  if (btn) {
    btn.classList.add('active');
  } else {
    const map = { dashboard:0, track:1, budget:2, analysis:3, receipts:4 };
    const btns = document.querySelectorAll('.tab-nav button');
    if (map[name] !== undefined) btns[map[name]]?.classList.add('active');
  }

  setTabInUrl(name);
  updateBadges();
}

function showTabByName(name) { showTab(name); }

function navigateToRow(subKey, mi) {
  if (mi !== undefined) activeMonth = mi;
  showTabByName('track');
  refreshTrackPills();
  refreshTrackTab();
  setTimeout(() => {
    const el = document.getElementById(`row-${subKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash-update');
      setTimeout(() => el.classList.remove('flash-update'), 700);
    }
  }, 80);
}

// ═══════════════════════════════════════ BUILD / REFRESH ═══

function buildAll() {
  buildIncomeCards();
  buildBudgetTab();
  buildTrackTab();
  buildAnalysisTab();
  buildTemplateAccordion();
  buildReceiptsFilters();
  buildModalCategoryDropdown();
  refreshAll();
}

function refreshAll() {
  refreshIncomeCards();
  refreshBudgetTab();
  refreshTrackTab();
  refreshDashboard();
  refreshAnalysis();
  renderBills();
  renderLog();
  updateBadges();
}

// ─── Income cards ─────────────────────────────────────────

function buildIncomeCards() {
  const members  = currentGroup?.members || [];
  const combined = getCombined();
  let html = members.map(m => {
    const net      = getMemberNet(m);
    const sharePct = combined > 0 ? (net / combined * 100).toFixed(1) : '0';
    return `<div class="income-card">
      <div class="ic-header" style="background:${m.color}">${m.name}</div>
      <div class="ic-body">
        <label>Gross Salary</label>
        <div class="ic-computed">${fmt(m.salary)}</div>
        <label>Family Deduction</label>
        <div class="ic-computed">${fmt(m.familyDeduction)}</div>
        <label>Net Contribution</label>
        <div class="ic-computed" style="font-size:1.1rem">${fmt(net)}</div>
        <label>Income Share</label>
        <div class="ic-computed">${sharePct}%</div>
      </div>
    </div>`;
  }).join('');
  html += `<div class="income-card" style="max-width:220px">
    <div class="ic-header ic-combined">Combined Household</div>
    <div class="ic-body">
      <label>Total Monthly Budget</label>
      <div class="ic-combined-val">${fmt(combined)}</div>
      <div style="height:6px"></div>
      <label style="margin-top:0"><a onclick="goToHub()" style="color:var(--primary);cursor:pointer;text-decoration:underline">⇄ Change Group / Edit Members</a></label>
    </div>
  </div>`;
  document.getElementById('income-cards-markup').innerHTML = html;
}

function refreshIncomeCards() {
  setTxt('efund-val', fmt(getCombined() * 6));
}

// ─── Budget tab ───────────────────────────────────────────

function buildBudgetTab() {
  const members = currentGroup?.members || [];
  const thead   = document.querySelector('#tab-budget table thead tr');
  if (thead) {
    thead.innerHTML =
      `<th>Category / Sub-Category</th><th>% of Salary</th><th>Monthly Amount</th>` +
      members.map(m => `<th style="background:${m.color}">${m.name}</th>`).join('') +
      `<th>% of Total</th>`;
  }
  let html = '';
  BUDGET_STRUCTURE.forEach(cat => {
    html += `<tr class="${cat.cls}">
      <td><strong>${cat.label}</strong></td>
      <td><span class="budget-pct-pill">${(cat.pct*100).toFixed(0)}%</span></td>
      <td class="bold" id="b-cat-${cat.key}">—</td>
      ${members.map(() => '<td></td>').join('')}<td></td>
    </tr>`;
    cat.subs.forEach(sub => {
      html += `<tr class="sub-item">
        <td>${sub.label}</td>
        <td><span class="budget-pct-pill" style="background:#f3f4f6;color:var(--muted)">${(sub.pct*100).toFixed(0)}%</span></td>
        <td id="b-sub-${sub.key}">—</td>
        ${members.map(m => `<td id="b-person-${m.id}-${sub.key}" style="font-size:0.78rem">—</td>`).join('')}
        <td style="color:var(--muted);font-size:0.78rem" id="b-sub-pct-${sub.key}">—</td>
      </tr>`;
    });
  });
  document.getElementById('budget-tbody').innerHTML = html;
}

function refreshBudgetTab() {
  const members = currentGroup?.members || [];
  BUDGET_STRUCTURE.forEach(cat => {
    const catAmt = cat.subs.reduce((s, sub) => s + subBudget(cat, sub), 0);
    flashUpdate(`b-cat-${cat.key}`, fmt(catAmt));
    cat.subs.forEach(sub => {
      const amt = subBudget(cat, sub);
      const combined = getCombined();
      flashUpdate(`b-sub-${sub.key}`, fmt(amt));
      setTxt(`b-sub-pct-${sub.key}`, combined > 0 ? (amt / combined * 100).toFixed(1) + '% of salary' : '—');
      members.forEach(m => {
        const pAmt = personSubBudget(m, cat, sub);
        const pPct = (currentGroup?.splits?.[sub.key]?.[m.id]) ?? 0;
        setTxt(`b-person-${m.id}-${sub.key}`, `${fmt(pAmt)} (${pPct}%)`);
      });
    });
  });
}

// ─── Track Expenses tab ───────────────────────────────────

function buildTrackTab() {
  const pills = document.getElementById('track-month-pills');
  YEAR.forEach((y)=>{
    pills.innerHTML = MONTHS.map((m,i) =>
      `<button class="pill${i===activeMonth?' active':''}" onclick="setActiveMonth(${i})">${m}'${y}</button>`
    ).join('');
  })
  

  document.getElementById('track-thead').innerHTML =
    `<th>Category / Item</th><th>Budget</th>` +
    MONTHS.map((m,i) => `<th id="th-track-${i}">${m}</th>`).join('') ;

  let html = '';
  BUDGET_STRUCTURE.forEach(cat => {
    const coll = collapsed[cat.key] ? 'collapsed' : '';
    html += `<tr class="cat-header ${coll}" id="cat-hdr-${cat.key}" onclick="toggleCatCollapse('${cat.key}')">
      <td colspan="${2+MONTHS.length+2}" style="color:white">${cat.label}</td></tr>`;
    cat.subs.forEach(sub => {
      const budget = subBudget(cat, sub);
      html += `<tr class="${cat.cls}${collapsed[cat.key]?' collapsed-child':''}" id="row-${sub.key}">
        <td><strong>${sub.label}</strong></td>
        <td id="t-bud-${sub.key}">${fmt(budget)}</td>
        ${MONTHS.map((_,mi) => `<td id="t-cat-${sub.key}-${mi}" class="${mi===activeMonth?'col-active-month':''}">—</td>`).join('')}
        
      </tr>`;
      (DETAIL_ITEMS[sub.key]||[]).forEach(item => {
        html += `<tr class="sub-item${collapsed[cat.key]?' collapsed-child':''}" id="irow-${item.key}">
          <td>${item.label}</td><td></td>
          ${MONTHS.map((_,mi) => {
            const v = actuals[`${item.key}-${mi}`] || '';
            return `<td class="${mi===activeMonth?'col-active-month':''}">
              <input type="number" id="inp-${item.key}-${mi}" value="${v}" placeholder="0"
                onchange="onActualInput('${item.key}',${mi},this.value)"
                title="Budget for ${sub.label}: ${fmt(subBudget(cat,sub))}" />
            </td>`;
          }).join('')}
          
        </tr>`;
      });
    });
  });
  document.getElementById('track-tbody').innerHTML = html;
}

function refreshTrackPills() {
  const pills = document.getElementById('track-month-pills');
  if (!pills) return;
  pills.querySelectorAll('.pill').forEach((p,i) => p.classList.toggle('active', i === activeMonth));
}

function refreshTrackTab() {
  let grandBudget = 0, grandActual = 0;
  let monthBudget = 0, monthActual = 0;

  BUDGET_STRUCTURE.forEach(cat => {
    cat.subs.forEach(sub => {
      const monthlyBudget = subBudget(cat, sub);
      const yearlyBudget  = monthlyBudget * MONTHS.length;
      grandBudget += yearlyBudget;
      monthBudget += monthlyBudget;
      setTxt(`t-bud-${sub.key}`, fmt(monthlyBudget));

      MONTHS.forEach((_,mi) => {
        const tot = subActualMonth(sub, mi);
        setCell(`t-cat-${sub.key}-${mi}`, tot > 0 ? fmt(tot) : '—');
      });

      (DETAIL_ITEMS[sub.key]||[]).forEach(item => {
        const tot = MONTHS.reduce((s,_,mi) => s + (actuals[`${item.key}-${mi}`]||0), 0);
        setTxt(`i-total-${item.key}`, tot > 0 ? fmt(tot) : '—');
      });

      const actualTot = subActualTotal(sub);
      grandActual += actualTot;
      monthActual += subActualMonth(sub, activeMonth);
      setTxt(`t-total-${sub.key}`, actualTot > 0 ? fmt(actualTot) : '—');

      const excess = yearlyBudget - actualTot;
      const exEl   = document.getElementById(`t-excess-${sub.key}`);
      if (exEl) {
        if (actualTot === 0) { exEl.textContent = '—'; exEl.className = ''; }
        else if (excess >= 0) { exEl.textContent = fmt(excess) + ' saved'; exEl.className = 'green'; }
        else {
          exEl.textContent = fmt(-excess) + ' over';
          exEl.className   = 'red';
          exEl.parentElement.classList.add('flash-over');
          setTimeout(() => exEl.parentElement.classList.remove('flash-over'), 500);
        }
      }
    });
  });

  // Active month column highlight
  MONTHS.forEach((_,mi) => {
    document.querySelectorAll(`[id^="t-cat-"][id$="-${mi}"], [id^="inp-"][id$="-${mi}"]`).forEach(el => {
      const td = el.closest ? el.closest('td') : el.parentElement;
      if (td) td.classList.toggle('col-active-month', mi === activeMonth);
    });
    const th = document.getElementById(`th-track-${mi}`);
    if (th) th.classList.toggle('col-active-month', mi === activeMonth);
  });

  const net = monthBudget - monthActual;
  const monthName = MONTHS[activeMonth];
  document.getElementById('track-summary').innerHTML = `
    <div class="sbox"><div class="sbox-label">${monthName} Budget</div><div class="sbox-val">${fmt(monthBudget)}</div></div>
    <div class="sbox"><div class="sbox-label">${monthName} Entered</div><div class="sbox-val">${fmt(monthActual)}</div></div>
    <div class="sbox"><div class="sbox-label">${monthName} Remaining</div><div class="sbox-val ${net>=0?'green':'red'}">${fmt(Math.abs(net))}</div></div>`;
}

function setActiveMonth(mi) {
  activeMonth = mi;
  refreshTrackPills();
  refreshTrackTab();
}

function toggleCatCollapse(key) {
  collapsed[key] = !collapsed[key];
  const hdr = document.getElementById(`cat-hdr-${key}`);
  if (hdr) hdr.classList.toggle('collapsed', collapsed[key]);
  document.querySelectorAll('[id^="row-"], [id^="irow-"]').forEach(row => {
    for (const cat of BUDGET_STRUCTURE) {
      const belongs = cat.subs.some(sub =>
        row.id === `row-${sub.key}` ||
        (DETAIL_ITEMS[sub.key]||[]).some(it => row.id === `irow-${it.key}`)
      );
      if (belongs && cat.key === key) { row.classList.toggle('collapsed-child', collapsed[key]); break; }
    }
  });
}

function onActualInput(itemKey, mi, val) {
  const prev = actuals[`${itemKey}-${mi}`] || 0;
  const next = parseFloat(val) || 0;
  actuals[`${itemKey}-${mi}`] = next;

  let path = itemKey;
  for (const cat of BUDGET_STRUCTURE)
    for (const sub of cat.subs)
      for (const item of (DETAIL_ITEMS[sub.key]||[]))
        if (item.key === itemKey) path = `${sub.label} › ${item.label}`;

  changeLog.unshift({
    ts: new Date(), source: 'manual', path,
    month: MONTHS[mi], monthIdx: mi,
    subCatKey: findSubCatKey(itemKey), oldVal: prev, newVal: next
  });

  _scheduleActualsSave(mi);
  // refreshAll();
}

// ─── Dashboard ────────────────────────────────────────────

function refreshDashboard() {
  let currentMonth =  new Date().getMonth();
  const monthName = MONTHS[currentMonth];

  // KPIs — scoped to activeMonth
  let mSpent = 0, mBudget = 0;
  BUDGET_STRUCTURE.forEach(cat => {
    cat.subs.forEach(sub => {
      mBudget += subBudget(cat, sub);
      mSpent  += subActualMonth(sub, activeMonth);
    });
  });
  const pct = mBudget > 0 ? Math.round(mSpent / mBudget * 100) : 0;

  document.getElementById('dash-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">${monthName} Budget</div><div class="kpi-val">${fmt(mBudget)}</div></div>
    <div class="kpi-card"><div class="kpi-label">${monthName} Entered</div><div class="kpi-val">${fmt(mSpent)}</div></div>
    <div class="kpi-card"><div class="kpi-label">${monthName} Remaining</div><div class="kpi-val ${mBudget-mSpent>=0?'green':'red'}">${fmt(Math.abs(mBudget-mSpent))}</div></div>
    <div class="kpi-card"><div class="kpi-label">Budget Used</div><div class="kpi-val">${pct}%</div><div class="kpi-sub">${monthName} vs monthly budget</div></div>`;

  // Health bars — scoped to activeMonth
  let healthHtml = '';
  BUDGET_STRUCTURE.forEach(cat => {
    const budget = cat.subs.reduce((s, sub) => s + subBudget(cat, sub), 0);
    const spent  = catActualMonth(cat, activeMonth);
    const p      = budget > 0 ? Math.min(spent / budget * 100, 100) : 0;
    const cls    = p > 100 ? 'over' : p > 80 ? 'warn' : 'ok';
    const status = p > 100 ? `Over by ${fmt(spent-budget)}` : p > 80 ? `${Math.round(100-p)}% headroom` : `${fmt(budget-spent)} remaining`;
    healthHtml += `<div class="health-card" onclick="navigateToRow('${cat.subs[0].key}', ${activeMonth})">
      <div class="health-cat">${cat.label}</div>
      <div class="health-spent">${fmt(spent)}</div>
      <div class="health-budget">of ${fmt(budget)} budget</div>
      <div class="progress-bar-wrap"><div class="progress-bar ${cls}" style="width:${p.toFixed(1)}%"></div></div>
      <div class="health-status ${cls==='ok'?'green':cls==='warn'?'':' red'}">${status}</div>
    </div>`;
  });
  document.getElementById('dash-health').innerHTML = healthHtml;

  // Dual-scope alerts: Monthly (amber) + Yearly (red)
  const monthlyAlerts = [], yearlyAlerts = [];
  BUDGET_STRUCTURE.forEach(cat => {
    cat.subs.forEach(sub => {
      const mActual = subActualMonth(sub, activeMonth);
      const mBudget = subBudget(cat, sub);
      const yActual = subActualTotal(sub);
      const yBudget = mBudget * MONTHS.length;
      if (mActual > mBudget) monthlyAlerts.push({ sub, over: mActual - mBudget });
      if (yActual > yBudget) yearlyAlerts.push({ sub, over: yActual - yBudget });
    });
  });

  const alertsEl = document.getElementById('dash-alerts');
  if (monthlyAlerts.length === 0 && yearlyAlerts.length === 0) {
    alertsEl.innerHTML = `<div class="no-alerts">✓ All categories within budget for ${monthName}</div>`;
  } else {
    let chips = '';
    monthlyAlerts.forEach(a => {
      chips += `<span class="alert-chip alert-chip-monthly" onclick="navigateToRow('${a.sub.key}', ${activeMonth})">
        [Monthly] ${a.sub.label} — over by ${fmt(a.over)}
      </span>`;
    });
    yearlyAlerts.forEach(a => {
      chips += `<span class="alert-chip" onclick="navigateToRow('${a.sub.key}', ${activeMonth})">
        [Yearly] ${a.sub.label} — over by ${fmt(a.over)}
      </span>`;
    });
    alertsEl.innerHTML = `<div class="alert-chips">${chips}</div>`;
  }

  // Recent entries — all changes, newest first
  const recentEl = document.getElementById('dash-recent');
  const recent   = changeLog.slice(0, 5);
  recentEl.innerHTML = recent.length === 0
    ? `<div class="muted" style="font-size:0.85rem">No entries yet. Start by entering expenses in Track Expenses or uploading a bill.</div>`
    : recent.map(e => `
        <div class="recent-entry" onclick="navigateToRow('${e.subCatKey||''}', ${e.monthIdx||0})">
          <div class="recent-dot" style="background:${e.source==='bill'?'#0369a1':'var(--primary)'}"></div>
          <div class="recent-cat">${e.source==='bill'?'📎 ':''}${e.path}</div>
          <div class="recent-month">${e.month}</div>
          <div class="recent-amt">${fmt(e.newVal)}</div>
        </div>`).join('');
}

// ─── Analysis tab ─────────────────────────────────────────

function buildAnalysisTab() {
  document.getElementById('analysis-thead').innerHTML =
    `<th>Category</th><th>Budget</th>` +
    MONTHS.map((m,i) =>
      `<th class="clickable" onclick="setActiveMonth(${i});showTabByName('track')" id="ath-${i}">
        ${m}<span class="month-badge ${monthHasData(i)?'has-data':'no-data'}"></span>
      </th>`
    ).join('') +
    `<th>Balance</th>`;

  let html = '';
  BUDGET_STRUCTURE.forEach(cat => {
    html += `<tr class="${cat.cls}"><td colspan="${3+MONTHS.length}"><strong>${cat.label}</strong></td></tr>`;
    cat.subs.forEach(sub => {
      html += `<tr class="sub-item" style="cursor:pointer" onclick="navigateToRow('${sub.key}')">
        <td>${sub.label}</td>
        <td id="an-bud-${sub.key}">—</td>
        ${MONTHS.map((_,mi) => `<td id="an-${sub.key}-${mi}">—</td>`).join('')}
        <td id="an-bal-${sub.key}">—</td>
      </tr>`;
    });
  });
  document.getElementById('analysis-tbody').innerHTML = html;
}

function refreshAnalysis() {
  let totalSaved = 0, totalOver = 0;

  BUDGET_STRUCTURE.forEach(cat => {
    cat.subs.forEach(sub => {
      const budget = subBudget(cat, sub);
      setTxt(`an-bud-${sub.key}`, fmt(budget));
      let balance = 0;
      MONTHS.forEach((_,mi) => {
        const actual = subActualMonth(sub, mi);
        const diff   = budget - actual;
        balance += diff;
        const el = document.getElementById(`an-${sub.key}-${mi}`);
        if (el) {
          if (actual === 0) { el.textContent = '—'; el.className = ''; }
          else { el.textContent = fmtDiff(diff); el.className = diff >= 0 ? 'green-cell' : 'red-cell'; }
        }
      });
      const balEl = document.getElementById(`an-bal-${sub.key}`);
      if (balEl) { balEl.textContent = fmt(Math.abs(balance)); balEl.className = balance >= 0 ? 'green' : 'red'; }
      if (balance >= 0) totalSaved += balance; else totalOver += Math.abs(balance);
    });
  });

  MONTHS.forEach((_,i) => {
    const th = document.getElementById(`ath-${i}`);
    if (!th) return;
    const badge = th.querySelector('.month-badge');
    if (badge) badge.className = `month-badge ${monthHasData(i)?'has-data':'no-data'}`;
  });

  const net = totalSaved - totalOver;
  document.getElementById('analysis-summary').innerHTML = `
    <div class="sbox"><div class="sbox-label">Total Saved</div><div class="sbox-val green">${fmt(totalSaved)}</div></div>
    <div class="sbox"><div class="sbox-label">Total Overspent</div><div class="sbox-val red">${fmt(totalOver)}</div></div>
    <div class="sbox"><div class="sbox-label">Net Position</div><div class="sbox-val ${net>=0?'green':'red'}">${fmt(Math.abs(net))} ${net>=0?'ahead':'behind'}</div></div>`;
}

// ─── Template accordion ───────────────────────────────────

function buildTemplateAccordion() {
  const clsMap = { needs:'need', wants:'want', savings:'save' };
  let html = '';
  BUDGET_STRUCTURE.forEach(cat => {
    html += `<div class="tmpl-cat ${clsMap[cat.key]}">${cat.label} (${(cat.pct*100).toFixed(0)}%)</div>`;
    cat.subs.forEach(sub => {
      html += `<div class="tmpl-item">• ${sub.label} (${(sub.pct*100).toFixed(0)}% of ${cat.label})</div>`;
      (DETAIL_ITEMS[sub.key]||[]).forEach(item => {
        html += `<div class="tmpl-item" style="padding-left:28px">– ${item.label}</div>`;
      });
    });
  });
  document.getElementById('tmpl-body').innerHTML = html;
}

function toggleAccordion() {
  document.getElementById('tmpl-btn').classList.toggle('open');
  document.getElementById('tmpl-body').classList.toggle('open');
}

// ─── Receipts & Log ───────────────────────────────────────

function buildReceiptsFilters() {
  const mp = document.getElementById('receipt-month-pills');
  mp.innerHTML =
    `<button class="pill active" onclick="setReceiptMonthFilter('all',this)">All</button>` +
    MONTHS.map((m,i) => `<button class="pill" onclick="setReceiptMonthFilter(${i},this)">${m}</button>`).join('');

  const sel = document.getElementById('receipt-cat-filter');
  sel.innerHTML = '<option value="">All Categories</option>';
  BUDGET_STRUCTURE.forEach(cat => {
    const og = document.createElement('optgroup');
    og.label = cat.label;
    cat.subs.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub.key; opt.textContent = sub.label;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
}

function setReceiptMonthFilter(val, btn) {
  receiptMonthFilter = val;
  document.querySelectorAll('#receipt-month-pills .pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBills();
}

function renderBills() {
  const catFilter = document.getElementById('receipt-cat-filter')?.value || '';
  const bills     = billLog.filter(b => {
    if (receiptMonthFilter !== 'all' && b.monthIdx !== receiptMonthFilter) return false;
    if (catFilter && b.subCatKey !== catFilter) return false;
    return true;
  });

  const container = document.getElementById('bill-grid-container');
  if (bills.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="es-icon">📭</div>
      <h3>No receipts yet</h3>
      <p>Upload your first bill from the Dashboard or Track Expenses tab.</p>
    </div>`;
    return;
  }
  container.innerHTML = `<div class="bill-grid">${bills.map(b => `
    <div class="bill-card" data-file="${b.fileName}">
      <div class="bill-card-top">
        <div class="bill-filename">📎 ${b.fileName}</div>
        <div class="bill-amount">${fmt(b.amount)}</div>
      </div>
      <div class="bill-badges">
        <span class="badge badge-cat">${b.subCatLabel}</span>
        <span class="badge badge-month">${MONTHS[b.monthIdx]}</span>
      </div>
      ${b.note ? `<div class="bill-note">${b.note}</div>` : ''}
      <div class="bill-ts">${formatTs(b.ts)}</div>
      <a class="bill-link" onclick="navigateToRow('${b.subCatKey}', ${b.monthIdx})">→ View in Expenses</a>
    </div>`).join('')}</div>`;
}

function renderLog() {
  const container = document.getElementById('log-list-container');
  if (changeLog.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="es-icon">📋</div><h3>No changes recorded yet</h3><p>Entries appear here as you add or edit expenses.</p></div>`;
    return;
  }
  container.innerHTML = changeLog.map(e => `
    <div class="log-entry" onclick="navigateToRow('${e.subCatKey||''}', ${e.monthIdx||0})">
      <div class="log-icon">${e.source==='bill'?'📎':'✏️'}</div>
      <div class="log-meta">
        <div class="log-path">${e.path}</div>
        <div class="log-detail">${e.month} · ${e.oldVal===undefined?'':fmt(e.oldVal)+' → '}<strong>${fmt(e.newVal)}</strong>${e.note?` · "${e.note}"`:''}</div>
      </div>
      <div class="log-ts">${formatTs(e.ts)}</div>
    </div>`).join('');
}

function clearLog() {
  changeLog.length = 0;
  renderLog();
  updateBadges();
}

function switchReceiptsView(view) {
  document.getElementById('vt-bills').classList.toggle('active', view === 'bills');
  document.getElementById('vt-log').classList.toggle('active', view === 'log');
  document.getElementById('receipts-bills-view').style.display = view === 'bills' ? '' : 'none';
  document.getElementById('receipts-log-view').style.display   = view === 'log'   ? '' : 'none';
  document.getElementById('receipts-filters').style.display    = view === 'bills' ? '' : 'none';
}

// ─── Bill modal ───────────────────────────────────────────

function buildModalCategoryDropdown() {
  const sel = document.getElementById('modal-category');
  sel.innerHTML = '';
  BUDGET_STRUCTURE.forEach(cat => {
    const og = document.createElement('optgroup');
    og.label = cat.label;
    cat.subs.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub.key; opt.textContent = sub.label;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
}

function openModal() {
  document.getElementById('modal-month').innerHTML =
    MONTHS.map((m,i) => `<option value="${i}" ${i===activeMonth?'selected':''}>${m}</option>`).join('');
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-amount').value = '';
  document.getElementById('modal-note').value   = '';
  document.getElementById('file-inp').value     = '';
  document.getElementById('file-name-display').style.display = 'none';
  document.getElementById('file-zone').classList.remove('has-file');
}

function closeModal()              { document.getElementById('modal-overlay').classList.remove('open'); }
function handleOverlayClick(e)    { if (e.target === document.getElementById('modal-overlay')) closeModal(); }

function onFileSelect(inp) {
  const f    = inp.files[0];
  const disp = document.getElementById('file-name-display');
  const zone = document.getElementById('file-zone');
  if (f) { disp.textContent = '📄 ' + f.name; disp.style.display = 'block'; zone.classList.add('has-file'); }
}

async function submitBill() {
  const amtEl  = document.getElementById('modal-amount');
  const amount = parseFloat(amtEl.value);
  if (!amount || amount <= 0) { amtEl.focus(); showToast('⚠ Please enter a valid bill amount'); return; }

  const subCatKey = document.getElementById('modal-category').value;
  const monthIdx  = parseInt(document.getElementById('modal-month').value);
  const note      = document.getElementById('modal-note').value.trim();
  const fileInp   = document.getElementById('file-inp');
  const fileName  = fileInp.files[0] ? fileInp.files[0].name : 'No file selected';

  const subCatLabel = (() => {
    for (const cat of BUDGET_STRUCTURE)
      for (const sub of cat.subs)
        if (sub.key === subCatKey) return sub.label;
    return subCatKey;
  })();

  // Optimistically update in-memory actuals (server also adds to actuals on its side)
  const firstItem = (DETAIL_ITEMS[subCatKey]||[])[0];
  if (firstItem) {
    const k = `${firstItem.key}-${monthIdx}`;
    actuals[k] = (actuals[k]||0) + amount;
    const inpEl = document.getElementById(`inp-${firstItem.key}-${monthIdx}`);
    if (inpEl) inpEl.value = actuals[k];
  }

  const ts = new Date();
  const localBill = { ts, fileName, amount, subCatKey, subCatLabel, monthIdx, note };
  billLog.unshift(localBill);
  changeLog.unshift({ ts, source:'bill', path: subCatLabel, month: MONTHS[monthIdx],
    monthIdx, subCatKey, newVal: amount, note: fileName + (note ? ` · ${note}` : '') });

  closeModal();
  refreshAll();
  showToast(`✓ ${fmt(amount)} added to ${subCatLabel} · ${MONTHS[monthIdx]}`);

  // Persist to server (fire and forget — UI already updated)
  if (currentGroup) {
    api.submitBill(currentGroup.id, {
      fileName,
      amount,
      subCatKey,
      subCatLabel,
      monthIdx,
      year: 2026,
      note,
    }).catch(e => {
      console.error('Failed to save bill:', e);
      showToast('⚠ Bill not persisted: ' + e.message);
    });
  }
}

// ─── Badges ───────────────────────────────────────────────

function updateBadges() {
  const emptyMonths = MONTHS.filter((_,i) => !monthHasData(i)).length;
  const tb = document.getElementById('badge-track');
  if (tb) { tb.textContent = emptyMonths > 0 ? emptyMonths + ' empty' : ''; tb.style.display = emptyMonths > 0 ? '' : 'none'; }

  let overCount = 0;
  BUDGET_STRUCTURE.forEach(cat => cat.subs.forEach(sub => {
    if (subActualTotal(sub) > subBudget(cat, sub)) overCount++;
  }));
  const ab = document.getElementById('badge-analysis');
  if (ab) { ab.textContent = overCount > 0 ? overCount : ''; ab.style.display = overCount > 0 ? '' : 'none'; }

  const rb = document.getElementById('badge-receipts');
  if (rb) { rb.textContent = billLog.length > 0 ? billLog.length + ' bill' + (billLog.length > 1 ? 's' : '') : ''; rb.style.display = billLog.length > 0 ? '' : 'none'; }
}

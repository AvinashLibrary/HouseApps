// ═══════════════════════════════════════════ DATA MODEL ════

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEAR = ['26' , '27'];

const BUDGET_STRUCTURE = [
  { key:'needs', label:'Essentials / Needs', pct:0.30, cls:'cat-need', color:'#065f46',
    subs:[
      { key:'rent',      label:'Rent and Utilities',           pct:0.40 },
      { key:'grocery',   label:'Groceries and Food',           pct:0.20 },
      { key:'transport', label:'Transportation',               pct:0.10 },
      { key:'insurance', label:'Insurance and EMI',            pct:0.05 },
      { key:'health',    label:'Healthcare',                   pct:0.08 },
      { key:'other_ess', label:'Other Essentials',             pct:0.17 },
    ]
  },
  { key:'wants', label:'Wants / Lifestyle', pct:0.18, cls:'cat-want', color:'#78350f',
    subs:[
      { key:'shopping',  label:'Shopping',                     pct:0.20 },
      { key:'dining',    label:'Dining and Entertainment',     pct:0.10 },
      { key:'subs',      label:'Subscriptions and Activities', pct:0.10 },
      { key:'travel',    label:'Travel and Holiday',           pct:0.55 },
      { key:'misc',      label:'Miscellaneous Wants',          pct:0.15 },
    ]
  },
  { key:'savings', label:'Savings and Investments', pct:0.52, cls:'cat-save', color:'#3730a3',
    subs:[
      { key:'emfund',    label:'Emergency Fund Contribution',  pct:0.25 },
      { key:'parent',    label:"Parent's Outing Planning",     pct:0.15 },
      { key:'home',      label:'Home Planning (RD)',           pct:0.40 },
      { key:'equity',    label:'Other Investments (RD/MF)',    pct:0.10 },
      { key:'gold',      label:'Gold',                         pct:0.10 },
    ]
  }
];

const DETAIL_ITEMS = {
  rent:      [{key:'rent_rent',label:'Rent'},{key:'rent_elec',label:'Electricity'},{key:'rent_maint',label:'Maintenance'}],
  grocery:   [{key:'gro_groc',label:'Groceries'},{key:'gro_veg',label:'Vegetables'},{key:'gro_fruit',label:'Fruits'},{key:'gro_online',label:'Online Orders'},{key:'gro_nonveg',label:'Non-Veg'}],
  transport: [{key:'tr_metro',label:'Metro'},{key:'tr_cab',label:'Cab'},{key:'tr_auto',label:'Auto/Rickshaw'},{key:'tr_train',label:'Train'}],
  insurance: [{key:'ins_emi',label:'EMI'},{key:'ins_ins',label:'Insurance'}],
  health:    [{key:'hc_hosp',label:'Hospital'},{key:'hc_med',label:'Medicines'}],
  other_ess: [{key:'oe_misc',label:'CMA / Misc Essentials'}],
  shopping:  [{key:'sh_self',label:'Self'},{key:'sh_rel',label:'For Relatives'}],
  dining:    [{key:'dn_movie',label:'Movies'},{key:'dn_rest',label:'Restaurants'}],
  subs:      [{key:'sb_aud',label:'Audible'},{key:'sb_prime',label:'Amazon Prime'},{key:'sb_net',label:'Internet'}],
  travel:    [{key:'tv_dom',label:'Domestic Tour'},{key:'tv_intl',label:'International Tour'}],
  misc:      [{key:'ms_adhoc',label:'Adhoc'}],
  emfund:    [{key:'ef_cash',label:'Cash in Hand / Bank'}],
  parent:    [{key:'pr_outing',label:"Parents' Outing"}],
  home:      [{key:'hm_rd',label:'RD - Home Fund'}],
  equity:    [{key:'eq_rd',label:'RD / MF'}],
  gold:      [{key:'gd_gold',label:'Gold Purchase'}],
};

// ═══════════════════════════════════════════ STATE ═════════

const actuals = {};   // populated from server when a group is opened
const billLog   = [];
const changeLog = [];

let activeMonth         = 0;
let receiptMonthFilter  = 'all';
let collapsed           = {};

// ── Group state ───────────────────────────────────────────

const MEMBER_COLORS = ['#7c3aed','#0369a1','#0891b2','#b45309','#15803d','#be185d','#7c3aed','#c2410c'];

let groups         = [];   // loaded from server on boot
let currentGroup   = null;
let editingGroupId = null;

// ═══════════════════════════════════════════ PURE HELPERS ══

function buildDefaultSplits(members) {
  const nets  = members.map(m => Math.max(0, m.salary - m.familyDeduction));
  const total = nets.reduce((s,n) => s+n, 0);
  const splits = {};
  const allSubs = BUDGET_STRUCTURE.flatMap(c => c.subs.map(s => s.key));
  allSubs.forEach(subKey => {
    splits[subKey] = {};
    members.forEach((m, i) => {
      splits[subKey][m.id] = total > 0
        ? Math.round(nets[i] / total * 100)
        : Math.round(100 / members.length);
    });
    // Fix floating-point rounding so row sums to exactly 100
    const diff = 100 - members.reduce((s,m) => s + (splits[subKey][m.id] || 0), 0);
    if (diff !== 0 && members.length > 0) splits[subKey][members[0].id] += diff;
  });
  return splits;
}

// Returns default budget percentages mirroring BUDGET_STRUCTURE constants
// budgetPcts = { [catKey]: { pct, subs: { [subKey]: pct } } }
function buildDefaultBudgetPcts() {
  const pcts = {};
  BUDGET_STRUCTURE.forEach(cat => {
    pcts[cat.key] = { pct: cat.pct };
    pcts[cat.key].subs = {};
    cat.subs.forEach(sub => { pcts[cat.key].subs[sub.key] = sub.pct; });
  });
  return pcts;
}


const fmt     = v => '₹' + Math.round(v).toLocaleString('en-IN');
const fmtDiff = v => (v >= 0 ? '+' : '−') + fmt(Math.abs(v)).slice(1);

function getMemberNet(m) { return Math.max(0, (m.salary||0) - (m.familyDeduction||0)); }

function getCombined() {
  if (!currentGroup) return 235000;
  return currentGroup.members.reduce((s,m) => s + getMemberNet(m), 0);
}

function personSubBudget(member, cat, sub) {
  const pct = (currentGroup?.splits?.[sub.key]?.[member.id]) ?? 0;
  return subBudget(cat, sub) * pct / 100;
}

function subBudget(cat, sub) {
  const catPct = currentGroup?.budgetPcts?.[cat.key]?.pct ?? cat.pct;
  const subPct = currentGroup?.budgetPcts?.[cat.key]?.subs?.[sub.key] ?? sub.pct;
  return getCombined() * catPct * subPct;
}
function subActualMonth(sub, mi)     { return (DETAIL_ITEMS[sub.key]||[]).reduce((s,item) => s + (actuals[`${item.key}-${mi}`]||0), 0); }
function catActualMonth(cat, mi)     { return cat.subs.reduce((s,sub) => s + subActualMonth(sub, mi), 0); }
function subActualTotal(sub)         { return MONTHS.reduce((s,_,mi) => s + subActualMonth(sub, mi), 0); }
function catActualTotal(cat)         { return MONTHS.reduce((s,_,mi) => s + catActualMonth(cat, mi), 0); }
// Returns budget - actual for one sub-category in one month (positive = under, negative = over)
function getMonthlyVariance(cat, sub, mi) { return subBudget(cat, sub) - subActualMonth(sub, mi); }

function findSubForKey(subKey) {
  for (const cat of BUDGET_STRUCTURE)
    for (const sub of cat.subs)
      if (sub.key === subKey) return { cat, sub };
  return null;
}

function findSubCatKey(itemKey) {
  for (const cat of BUDGET_STRUCTURE)
    for (const sub of cat.subs)
      if ((DETAIL_ITEMS[sub.key]||[]).some(it => it.key === itemKey)) return sub.key;
  return null;
}

function monthHasData(mi) {
  return BUDGET_STRUCTURE.some(cat => cat.subs.some(sub =>
    (DETAIL_ITEMS[sub.key]||[]).some(item => (actuals[`${item.key}-${mi}`]||0) > 0)
  ));
}

// ── DOM utils ─────────────────────────────────────────────

function setTxt(id, val)  { const el = document.getElementById(id); if (el) el.textContent = val; }
function setCell(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function flashUpdate(id, newVal) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.textContent !== newVal) {
    el.textContent = newVal;
    el.classList.remove('flash-update');
    void el.offsetWidth;
    el.classList.add('flash-update');
    setTimeout(() => el.classList.remove('flash-update'), 700);
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function formatTs(d) {
  if (!d) return '';
  return d.toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

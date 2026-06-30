import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';

// ── Budget structure (mirrors vanilla JS BUDGET_STRUCTURE) ──
export const BUDGET_STRUCTURE = [
  { key: 'needs', label: 'Needs', pct: 0.50, cls: 'cat-needs', subs: [
    { key: 'housing',     label: 'Housing',     pct: 0.40 },
    { key: 'food',        label: 'Food',        pct: 0.20 },
    { key: 'transport',   label: 'Transport',   pct: 0.15 },
    { key: 'utilities',   label: 'Utilities',   pct: 0.15 },
    { key: 'health',      label: 'Health',      pct: 0.10 },
  ]},
  { key: 'wants', label: 'Wants', pct: 0.30, cls: 'cat-wants', subs: [
    { key: 'entertainment', label: 'Entertainment', pct: 0.40 },
    { key: 'dining',        label: 'Dining Out',    pct: 0.30 },
    { key: 'shopping',      label: 'Shopping',      pct: 0.30 },
  ]},
  { key: 'savings', label: 'Savings', pct: 0.20, cls: 'cat-savings', subs: [
    { key: 'emergency',    label: 'Emergency Fund', pct: 0.50 },
    { key: 'investments',  label: 'Investments',    pct: 0.50 },
  ]},
];

// ── Detail items per sub-category ──────────────────────────
export const DETAIL_ITEMS = {
  housing:       [{ key: 'housing_rent', label: 'Rent' }, { key: 'housing_maint', label: 'Maintenance' }, { key: 'housing_other', label: 'Other' }],
  food:          [{ key: 'food_grocery', label: 'Groceries' }, { key: 'food_home', label: 'Home Cooking' }, { key: 'food_other', label: 'Other' }],
  transport:     [{ key: 'transport_fuel', label: 'Fuel/Metro' }, { key: 'transport_cab', label: 'Cab/Auto' }, { key: 'transport_other', label: 'Other' }],
  utilities:     [{ key: 'util_electric', label: 'Electricity' }, { key: 'util_internet', label: 'Internet' }, { key: 'util_gas', label: 'Gas/Water' }, { key: 'util_mobile', label: 'Mobile' }],
  health:        [{ key: 'health_ins', label: 'Insurance' }, { key: 'health_med', label: 'Medicine' }, { key: 'health_gym', label: 'Gym/Fitness' }],
  entertainment: [{ key: 'ent_ott', label: 'OTT/Streaming' }, { key: 'ent_games', label: 'Games' }, { key: 'ent_events', label: 'Events/Outings' }],
  dining:        [{ key: 'dining_rest', label: 'Restaurants' }, { key: 'dining_delivery', label: 'Food Delivery' }, { key: 'dining_cafe', label: 'Cafes' }],
  shopping:      [{ key: 'shop_clothing', label: 'Clothing' }, { key: 'shop_home', label: 'Home & Decor' }, { key: 'shop_gifts', label: 'Gifts' }],
  emergency:     [{ key: 'emerg_fund', label: 'Emergency Deposit' }],
  investments:   [{ key: 'inv_sip', label: 'SIP/MF' }, { key: 'inv_fd', label: 'FD/RD' }, { key: 'inv_other', label: 'Other' }],
};

export const MEMBER_COLORS = ['#818cf8','#34d399','#fb923c','#f472b6','#60a5fa','#a78bfa'];
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const ACTIVE_YEAR = 2026;

// ── Helper: build default budget pcts object ────────────────
export function buildDefaultBudgetPcts() {
  const pcts = {};
  BUDGET_STRUCTURE.forEach(cat => {
    pcts[cat.key] = { pct: cat.pct, subs: {} };
    cat.subs.forEach(sub => { pcts[cat.key].subs[sub.key] = sub.pct; });
  });
  return pcts;
}

// ── Helper: build equal splits for members ──────────────────
export function buildDefaultSplits(members) {
  const splits = {};
  BUDGET_STRUCTURE.forEach(cat => cat.subs.forEach(sub => {
    splits[sub.key] = {};
    const eq = members.length ? Math.round(100 / members.length) : 100;
    members.forEach((m, i) => {
      splits[sub.key][m.id] = i === members.length - 1 ? 100 - eq * (members.length - 1) : eq;
    });
  }));
  return splits;
}

// ── Helper: find which sub a detail item belongs to ─────────
export function findSubCatKey(itemKey) {
  for (const [subKey, items] of Object.entries(DETAIL_ITEMS))
    if (items.some(it => it.key === itemKey)) return subKey;
  return '';
}

// ── Context ─────────────────────────────────────────────────
const AppContext = createContext(null);

const LS_GROUPS_KEY = 'mindfulspend_groups';

function loadLocalGroups() {
  try { return JSON.parse(localStorage.getItem(LS_GROUPS_KEY) || '[]'); }
  catch { return []; }
}

function saveLocalGroups(groups) {
  try { localStorage.setItem(LS_GROUPS_KEY, JSON.stringify(groups)); }
  catch { /* ignore quota errors */ }
}

export function AppProvider({ children }) {
  const [groups, setGroups]             = useState(() => loadLocalGroups());
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [actuals, setActuals]           = useState({}); // { "itemKey-monthIdx": number }
  const [billLog, setBillLog]           = useState([]); // [{ ts, fileName, amount, subCatKey, subCatLabel, monthIdx, note }]
  const [changeLog, setChangeLog]       = useState([]); // [{ ts, source, path, month, monthIdx, subCatKey, oldVal, newVal, note }]
  const [toast, setToast]               = useState({ msg: '', show: false });
  const [loading, setLoading]           = useState(false);

  // Debounce timers for actuals save
  const saveTimers = useRef({});

  // ── Toast ──────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  }, []);

  // ── Load groups from server on mount (falls back to localStorage) ──
  const loadGroups = useCallback(async () => {
    try {
      const serverGroups = await api.getGroups();
      setGroups(serverGroups);
      saveLocalGroups(serverGroups);
    } catch (e) {
      console.warn('Server unavailable — using locally saved groups instead');
      setGroups([]);
    }
  }, []);

  // ── Load group actuals/bills/logs from server ─────────────
  const loadGroupData = useCallback(async (groupId) => {
    setLoading(true);
    setActuals({});
    setBillLog([]);
    setChangeLog([]);
    try {
      const [actualsResp, bills, logs] = await Promise.all([
        api.getActuals(groupId, ACTIVE_YEAR),
        api.getBills(groupId),
        api.getLogs(groupId),
      ]);
      if (actualsResp?.months) {
        const flat = {};
        Object.entries(actualsResp.months).forEach(([mi, items]) => {
          Object.entries(items).forEach(([itemKey, val]) => {
            flat[`${itemKey}-${mi}`] = val;
          });
        });
        setActuals(flat);
      }
      const sortedBills = bills.map(b => ({ ...b, ts: new Date(b.ts) })).sort((a, b) => b.ts - a.ts);
      const sortedLogs  = logs.map(e  => ({ ...e, ts: new Date(e.ts)  })).sort((a, b) => b.ts - a.ts);
      setBillLog(sortedBills);
      setChangeLog(sortedLogs);
    } catch (e) {
      console.warn('Server unavailable — working with local data only:', e.message);
      // Silently fall back to empty actuals/bills/logs; no server backend running.
    }
    setLoading(false);
  }, []);

  // ── Groups CRUD ────────────────────────────────────────────
  const createGroup = useCallback(async (payload) => {
    let saved;
    try {
      saved = await api.createGroup(payload);
    } catch (e) {
      console.warn('Server unavailable — saving group locally instead:', e.message);
      saved = { ...payload, id: 'local_' + Date.now() };
    }
    setGroups(prev => {
      const next = [...prev, saved];
      saveLocalGroups(next);
      return next;
    });
    return saved;
  }, []);

  const updateGroupLocal = useCallback((group) => {
    setGroups(prev => {
      const next = prev.map(g => g.id === group.id ? group : g);
      saveLocalGroups(next);
      return next;
    });
  }, []);

  const deleteGroup = useCallback((id) => {
    setGroups(prev => {
      const next = prev.filter(g => g.id !== id);
      saveLocalGroups(next);
      return next;
    });
  }, []);

  // ── Actuals ────────────────────────────────────────────────
  const setActualValue = useCallback((itemKey, monthIdx, val, path) => {
    setActuals(prev => {
      const k = `${itemKey}-${monthIdx}`;
      const oldVal = prev[k] ?? 0;
      const newVal = parseFloat(val) || 0;
      const next = { ...prev, [k]: newVal };

      // Add to change log
      setChangeLog(cl => [{
        ts: new Date(), source: 'manual', path,
        month: MONTHS[monthIdx], monthIdx,
        subCatKey: findSubCatKey(itemKey), oldVal, newVal,
        id: Date.now(),
      }, ...cl]);

      // Debounced server save
      clearTimeout(saveTimers.current[monthIdx]);
      saveTimers.current[monthIdx] = setTimeout(async () => {
        if (!activeGroupId) return;
        const monthActuals = {};
        BUDGET_STRUCTURE.forEach(cat => cat.subs.forEach(sub => {
          (DETAIL_ITEMS[sub.key] || []).forEach(item => {
            const v = next[`${item.key}-${monthIdx}`];
            if (v !== undefined) monthActuals[item.key] = v;
          });
        }));
        try {
          await api.saveActuals(activeGroupId, ACTIVE_YEAR, monthIdx, monthActuals);
        } catch (e) {
          console.warn('Server unavailable — actuals kept locally only:', e.message);
        }
      }, 800);

      return next;
    });
  }, [activeGroupId, showToast]);

  // ── Bills ──────────────────────────────────────────────────
  const submitBill = useCallback(async (groupId, billPayload) => {
    const { amount, subCatKey, subCatLabel, monthIdx, note, fileName } = billPayload;

    // Optimistically update actuals for first detail item in that sub
    const firstItem = (DETAIL_ITEMS[subCatKey] || [])[0];
    if (firstItem) {
      const k = `${firstItem.key}-${monthIdx}`;
      setActuals(prev => ({ ...prev, [k]: (prev[k] || 0) + amount }));
    }

    const ts = new Date();
    setBillLog(prev => [{ ts, fileName, amount, subCatKey, subCatLabel, monthIdx, note, id: Date.now() }, ...prev]);
    setChangeLog(prev => [{ ts, source: 'bill', path: subCatLabel, month: MONTHS[monthIdx], monthIdx, subCatKey, newVal: amount, note: fileName + (note ? ` · ${note}` : ''), id: Date.now() }, ...prev]);

    // Fire-and-forget to server
    try {
      await api.submitBill(groupId, { ...billPayload, year: ACTIVE_YEAR });
    } catch (e) {
      console.warn('Server unavailable — bill kept locally only:', e.message);
    }
  }, [showToast]);

  const clearLog = useCallback(() => {
    setChangeLog([]);
    setBillLog([]);
  }, []);

  // ── Computed helpers ───────────────────────────────────────
  const getActual = useCallback((itemKey, monthIdx) => {
    return actuals[`${itemKey}-${monthIdx}`] ?? 0;
  }, [actuals]);

  const getSubActualMonth = useCallback((subKey, monthIdx) => {
    return (DETAIL_ITEMS[subKey] || []).reduce((s, item) => s + (actuals[`${item.key}-${monthIdx}`] ?? 0), 0);
  }, [actuals]);

  const getCatActualMonth = useCallback((catKey, monthIdx) => {
    const cat = BUDGET_STRUCTURE.find(c => c.key === catKey);
    if (!cat) return 0;
    return cat.subs.reduce((s, sub) => s + getSubActualMonth(sub.key, monthIdx), 0);
  }, [getSubActualMonth]);

  const activeGroup = groups.find(g => g.id === activeGroupId) ?? null;

  const getTotalNet = useCallback((group) => {
    return (group?.members ?? []).reduce((s, m) => s + Math.max(0, (parseFloat(m.salary) || 0) - (parseFloat(m.familyDeduction) || 0)), 0);
  }, []);

  const getSubBudget = useCallback((group, cat, sub) => {
    const net      = getTotalNet(group);
    const catPct   = group?.budgetPcts?.[cat.key]?.pct ?? cat.pct;
    const subPct   = group?.budgetPcts?.[cat.key]?.subs?.[sub.key] ?? sub.pct;
    return net * catPct * subPct;
  }, [getTotalNet]);

  return (
    <AppContext.Provider value={{
      groups, activeGroup, activeGroupId, setActiveGroupId,
      loading,
      loadGroups, loadGroupData,
      createGroup, updateGroupLocal, deleteGroup,
      actuals, getActual, getSubActualMonth, getCatActualMonth, setActualValue,
      billLog, changeLog, submitBill, clearLog,
      getTotalNet, getSubBudget,
      toast, showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

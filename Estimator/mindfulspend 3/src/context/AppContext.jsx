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

// ── Currency support ─────────────────────────────────────────
// group.currency stores one of these `code` values. Falls back to DEFAULT_CURRENCY
// for groups created before this field existed.
export const CURRENCIES = [
  { code: 'INR', symbol: '₹',    label: 'Indian Rupee',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',    label: 'US Dollar',      locale: 'en-US' },
  { code: 'EUR', symbol: '€',    label: 'Euro',           locale: 'de-DE' },
  { code: 'GBP', symbol: '£',    label: 'British Pound',  locale: 'en-GB' },
  { code: 'AED', symbol: 'د.إ',  label: 'UAE Dirham',     locale: 'ar-AE' },
  { code: 'SGD', symbol: 'S$',   label: 'Singapore Dollar', locale: 'en-SG' },
];
export const DEFAULT_CURRENCY = 'INR';

export function getCurrencyInfo(code) {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES.find(c => c.code === DEFAULT_CURRENCY);
}

export function getCurrencySymbol(code) {
  return getCurrencyInfo(code).symbol;
}

// Formats a number with the right symbol + locale grouping, e.g. "₹1,20,000" or "$120,000".
export function formatAmount(amount, code = DEFAULT_CURRENCY) {
  const { symbol, locale } = getCurrencyInfo(code);
  const n = Number.isFinite(amount) ? amount : (parseFloat(amount) || 0);
  return `${symbol}${n.toLocaleString(locale)}`;
}

// ── Group status ──────────────────────────────────────────────
// group.status stores one of these `key` values. Falls back to DEFAULT_STATUS
// for groups created before this field existed.
export const GROUP_STATUSES = [
  { key: 'active',    label: 'Active',    color: '#34d399' },
  { key: 'completed', label: 'Completed', color: '#60a5fa' },
  { key: 'archived',  label: 'Archived',  color: '#9ca3af' },
];
export const DEFAULT_STATUS = 'active';

export function getStatusInfo(status) {
  return GROUP_STATUSES.find(s => s.key === status) ?? GROUP_STATUSES.find(s => s.key === DEFAULT_STATUS);
}

export const GROUP_TYPES = [
  { key: 'household',  label: 'Household',  icon: '🏠', desc: 'Shared household bills & budget' },
  { key: 'roommates',  label: 'Roommates',  icon: '🛋️', desc: 'Flatmates splitting rent & expenses' },
  { key: 'couple',     label: 'Couple',     icon: '💑', desc: 'Partners managing shared finances' },
  { key: 'travel',     label: 'Travel',     icon: '✈️', desc: 'Group trip expenses' },
  { key: 'family',     label: 'Family',     icon: '👨‍👩‍👧‍👦', desc: 'Family pooled budget' },
  { key: 'occasion',   label: 'Occasion',   icon: '🎉', desc: 'Wedding, ceremony or celebration' },
];

// ── Helper: build default budget pcts object ────────────────
// Pass a group type key to get type-specific defaults; omit for household defaults.
const TYPE_BUDGET_DEFAULTS = {
  household: {
    needs: { pct: 0.50, subs: { housing: 0.40, food: 0.20, transport: 0.15, utilities: 0.15, health: 0.10 } },
    wants: { pct: 0.30, subs: { entertainment: 0.40, dining: 0.30, shopping: 0.30 } },
    savings: { pct: 0.20, subs: { emergency: 0.50, investments: 0.50 } },
  },
  roommates: {
    needs: { pct: 0.80, subs: { housing: 0.30, food: 0.35, transport: 0.10, utilities: 0.20, health: 0.05 } },
    wants: { pct: 0.20, subs: { entertainment: 0.25, dining: 0.45, shopping: 0.30 } }
  },
  couple: {
    needs: { pct: 0.45, subs: { housing: 0.40, food: 0.20, transport: 0.15, utilities: 0.15, health: 0.10 } },
    wants: { pct: 0.30, subs: { entertainment: 0.30, dining: 0.40, shopping: 0.30 } },
    savings: { pct: 0.25, subs: { emergency: 0.50, investments: 0.50 } },
  },
  travel: {
    needs: { pct: 0.70, subs: { housing: 0.20, food: 0.30, transport: 0.35, utilities: 0.05, health: 0.10 } },
    wants: { pct: 0.25, subs: { entertainment: 0.55, dining: 0.35, shopping: 0.10 } },
    savings: { pct: 0.05, subs: { emergency: 1.00} },
  },
  family: {
    needs: { pct: 0.60, subs: { housing: 0.30, food: 0.20, transport: 0.15, utilities: 0.15, health: 0.20 } },
    wants: { pct: 0.20, subs: { entertainment: 0.35, dining: 0.30, shopping: 0.35 } },
    savings: { pct: 0.20, subs: { emergency: 0.50, investments: 0.50 } },
  },
  occasion: {
    needs: { pct: 0.65, subs: { housing: 0.35, food: 0.30, transport: 0.10, utilities: 0.20, health: 0.05 } },
    wants: { pct: 0.30, subs: { entertainment: 0.55, dining: 0.30, shopping: 0.15 } },
    savings: { pct: 0.05, subs: { emergency: 1.00} },
  },
};

export function buildDefaultBudgetPcts(type) {
  const defaults = TYPE_BUDGET_DEFAULTS[type] ?? TYPE_BUDGET_DEFAULTS.household;
  const fallback = TYPE_BUDGET_DEFAULTS.household;
  const hidden = TYPE_HIDDEN_SUBS[type] ?? [];
  const pcts = {};
  BUDGET_STRUCTURE.forEach(cat => {
    const catDef = defaults[cat.key] ?? fallback[cat.key];
    pcts[cat.key] = { pct: catDef.pct, subs: {} };
    cat.subs.forEach(sub => {
      pcts[cat.key].subs[sub.key] = hidden.includes(sub.key)
        ? 0
        : (catDef.subs[sub.key] ?? fallback[cat.key].subs[sub.key]);
    });
  });
  return pcts;
}

// ── Sub-category label overrides per group type ─────────────
const TYPE_LABEL_OVERRIDES = {
  travel: {
    housing: 'Accommodation',
    utilities: 'Misc / SIM',
  },
  roommates: {
    food: 'Groceries & Supplies',
    utilities: 'Maid & Utilities',
    shopping: 'Home Supplies',
  },
  occasion: {
    housing: 'Venue',
    utilities: 'Decor & Setup',
    entertainment: 'Photography & Music',
    dining: 'Catering',
    shopping: 'Gifts & Favours',
    health: 'Misc',
  },
};

export function getSubLabel(type, subKey, defaultLabel) {
  return TYPE_LABEL_OVERRIDES[type]?.[subKey] ?? defaultLabel;
}

// Sub-categories to hide entirely for a given type
export const TYPE_HIDDEN_SUBS = {
  roommates: ['emergency', 'investments'],
  travel:    ['investments'],
  occasion:  ['investments'],
};

export const TYPE_HIDDEN_CATS = {
  roommates: ['savings'],
};

export function visibleSubs(type, cat) {
  const hidden = TYPE_HIDDEN_SUBS[type] ?? [];
  return cat.subs.filter(sub => !hidden.includes(sub.key));
}

export function visibleCats(type) {
  const hidden = TYPE_HIDDEN_CATS[type] ?? [];
  return BUDGET_STRUCTURE.filter(cat => !hidden.includes(cat.key));
}

// ── Detail item overrides per group type ────────────────────
const TYPE_DETAIL_ITEMS = {
  travel: {
    housing:       [{ key: 'housing_rent', label: 'Hotel/Hostel' }, { key: 'housing_maint', label: 'Airbnb/Homestay' }, { key: 'housing_other', label: 'Other' }],
    food:          [{ key: 'food_grocery', label: 'Restaurant' }, { key: 'food_home', label: 'Street Food' }, { key: 'food_other', label: 'Groceries' }],
    transport:     [{ key: 'transport_fuel', label: 'Flights/Trains' }, { key: 'transport_cab', label: 'Local Transport' }, { key: 'transport_other', label: 'Cab/Taxi' }],
    utilities:     [{ key: 'util_electric', label: 'SIM/Data' }, { key: 'util_internet', label: 'Misc' }, { key: 'util_gas', label: 'Other' }],
    health:        [{ key: 'health_ins', label: 'Travel Insurance' }, { key: 'health_med', label: 'Medicine' }, { key: 'health_gym', label: 'Other' }],
    entertainment: [{ key: 'ent_ott', label: 'Activities' }, { key: 'ent_games', label: 'Entry Tickets' }, { key: 'ent_events', label: 'Tours/Guides' }],
    dining:        [{ key: 'dining_rest', label: 'Fine Dining' }, { key: 'dining_delivery', label: 'Cafes' }, { key: 'dining_cafe', label: 'Street Food' }],
    shopping:      [{ key: 'shop_clothing', label: 'Souvenirs' }, { key: 'shop_home', label: 'Clothing' }, { key: 'shop_gifts', label: 'Other' }],
    emergency:     [{ key: 'emerg_fund', label: 'Emergency Reserve' }],
  },
  roommates: {
    food:          [{ key: 'food_grocery', label: 'Vegetables & Fruits' }, { key: 'food_home', label: 'Groceries' }, { key: 'food_other', label: 'Cleaning Items' }],
    utilities:     [{ key: 'util_electric', label: 'Maid' }, { key: 'util_internet', label: 'Electricity' }, { key: 'util_gas', label: 'Internet' }, { key: 'util_mobile', label: 'Gas/Water' }],
    shopping:      [{ key: 'shop_clothing', label: 'Kitchen Items' }, { key: 'shop_home', label: 'Home Essentials' }, { key: 'shop_gifts', label: 'Other' }],
    entertainment: [{ key: 'ent_ott', label: 'OTT/Streaming' }, { key: 'ent_games', label: 'Games' }, { key: 'ent_events', label: 'Outings' }],
    dining:        [{ key: 'dining_rest', label: 'Restaurants' }, { key: 'dining_delivery', label: 'Food Delivery' }, { key: 'dining_cafe', label: 'Cafes' }],
  },
  occasion: {
    housing:       [{ key: 'housing_rent', label: 'Venue Booking' }, { key: 'housing_maint', label: 'Advance Payment' }, { key: 'housing_other', label: 'Other' }],
    food:          [{ key: 'food_grocery', label: 'Catering Contract' }, { key: 'food_home', label: 'Food & Beverages' }, { key: 'food_other', label: 'Other' }],
    transport:     [{ key: 'transport_fuel', label: 'Guest Transport' }, { key: 'transport_cab', label: 'Baraat/Procession' }, { key: 'transport_other', label: 'Other' }],
    utilities:     [{ key: 'util_electric', label: 'Stage/Mandap' }, { key: 'util_internet', label: 'Flowers & Decor' }, { key: 'util_gas', label: 'Lighting' }, { key: 'util_mobile', label: 'Other' }],
    health:        [{ key: 'health_ins', label: 'Miscellaneous 1' }, { key: 'health_med', label: 'Miscellaneous 2' }, { key: 'health_gym', label: 'Other' }],
    entertainment: [{ key: 'ent_ott', label: 'Photographer' }, { key: 'ent_games', label: 'Videographer' }, { key: 'ent_events', label: 'DJ/Band' }],
    dining:        [{ key: 'dining_rest', label: 'Catering Vendor' }, { key: 'dining_delivery', label: 'Beverages' }, { key: 'dining_cafe', label: 'Other' }],
    shopping:      [{ key: 'shop_clothing', label: 'Return Gifts' }, { key: 'shop_home', label: 'Outfits' }, { key: 'shop_gifts', label: 'Accessories' }],
    emergency:     [{ key: 'emerg_fund', label: 'Contingency Fund' }],
  },
};

export function getDetailItems(type, subKey) {
  return TYPE_DETAIL_ITEMS[type]?.[subKey] ?? DETAIL_ITEMS[subKey] ?? [];
}
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

  const updateGroupStatus = useCallback((id, status) => {
    setGroups(prev => {
      const next = prev.map(g => g.id === id ? { ...g, status } : g);
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
    const groupType = groups.find(g => g.id === groupId)?.type;
    const firstItem = getDetailItems(groupType, subCatKey)[0];
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
    // Sum all known item keys for this sub across all types to avoid missing saved data
    const allKeys = new Set([
      ...(DETAIL_ITEMS[subKey] || []).map(i => i.key),
      ...Object.values(TYPE_DETAIL_ITEMS).flatMap(t => (t[subKey] || []).map(i => i.key)),
    ]);
    return [...allKeys].reduce((s, key) => s + (actuals[`${key}-${monthIdx}`] ?? 0), 0);
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
      createGroup, updateGroupLocal, updateGroupStatus, deleteGroup,
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
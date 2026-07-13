import { useState, useEffect } from 'react';
import { useApp, BUDGET_STRUCTURE, MEMBER_COLORS, GROUP_TYPES, getSubLabel, visibleCats, visibleSubs, buildDefaultBudgetPcts, buildDefaultSplits, CURRENCIES, DEFAULT_CURRENCY, getCurrencySymbol, formatAmount, GROUP_STATUSES, DEFAULT_STATUS } from '../context/AppContext';

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function calcNet(salary, familyDeduction) {
  return Math.max(0, toNum(salary) - toNum(familyDeduction));
}

// Convert a budgetPcts object (fractions, e.g. 0.3) into plain string-percent
// form (e.g. "30") for editing in simple text inputs.
function pctsToStrings(pcts) {
  const out = {};
  BUDGET_STRUCTURE.forEach(cat => {
    const catFrac = pcts?.[cat.key]?.pct ?? cat.pct;
    out[cat.key] = { pct: String(Math.round(catFrac * 1000) / 10), subs: {} };
    cat.subs.forEach(sub => {
      const subFrac = pcts?.[cat.key]?.subs?.[sub.key] ?? sub.pct;
      out[cat.key].subs[sub.key] = String(Math.round(subFrac * 1000) / 10);
    });
  });
  return out;
}

// Convert string-percent form back into fraction form for saving.
function stringsToFractions(strs) {
  const out = {};
  BUDGET_STRUCTURE.forEach(cat => {
    out[cat.key] = { pct: toNum(strs?.[cat.key]?.pct) / 100, subs: {} };
    cat.subs.forEach(sub => {
      out[cat.key].subs[sub.key] = toNum(strs?.[cat.key]?.subs?.[sub.key]) / 100;
    });
  });
  return out;
}

// Splits stored as plain numbers already; convert to strings for inputs.
function splitsToStrings(members, splits) {
  const out = {};
  BUDGET_STRUCTURE.forEach(cat => cat.subs.forEach(sub => {
    out[sub.key] = {};
    members.forEach(m => {
      const v = splits?.[sub.key]?.[m.id];
      out[sub.key][m.id] = v === undefined || v === null ? '' : String(v);
    });
  }));
  return out;
}

export default function GroupEditor({ editGroup, onDone, onCancel }) {
  const { createGroup, updateGroupLocal, showToast } = useApp();
  const isEdit = !!editGroup;

  const [name, setName]             = useState('');
  const [type, setType]             = useState('household');
  const [currency, setCurrency]     = useState(DEFAULT_CURRENCY);
  const [status, setStatus]         = useState(DEFAULT_STATUS);
  const [tripEndDate, setTripEndDate] = useState('');
  const [members, setMembers]       = useState([{ id: 'p' + Date.now(), name: '', color: MEMBER_COLORS[0], salary: null , familyDeduction: null }]);
  // budgetPcts / splits are kept as plain strings while editing (simple text inputs)
  const [budgetPctStrs, setBudgetPctStrs] = useState(() => pctsToStrings(buildDefaultBudgetPcts('household')));
  const [splitStrs, setSplitStrs]         = useState({});
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    if (editGroup) {
      const mem = editGroup.members.map(m => ({ ...m }));
      setName(editGroup.name);
      setType(editGroup.type ?? 'household');
      setCurrency(editGroup.currency ?? DEFAULT_CURRENCY);
      setStatus(editGroup.status ?? DEFAULT_STATUS);
      setTripEndDate(editGroup.tripEndDate ?? '');
      setMembers(mem);
      setBudgetPctStrs(pctsToStrings(editGroup.budgetPcts));
      setSplitStrs(splitsToStrings(mem, editGroup.splits ?? buildDefaultSplits(mem)));
    } else {
      const initMembers = [{ id: 'p' + Date.now(), name: '', color: MEMBER_COLORS[0], salary: null , familyDeduction: null }];
      setName('');
      setType('household');
      setCurrency(DEFAULT_CURRENCY);
      setStatus(DEFAULT_STATUS);
      setTripEndDate('');
      setMembers(initMembers);
      setBudgetPctStrs(pctsToStrings(buildDefaultBudgetPcts('household')));
      setSplitStrs(splitsToStrings(initMembers, buildDefaultSplits(initMembers)));
    }
  }, [editGroup]);

  // ── Reset budget pcts when type changes (new group only) ──
  useEffect(() => {
    if (!editGroup) {
      setBudgetPctStrs(pctsToStrings(buildDefaultBudgetPcts(type)));
    }
  }, [type]); // eslint-disable-line

  // ── Members ────────────────────────────────────────────────
  const addMember = () => {
    const m = { id: 'p' + Date.now(), name: '', color: MEMBER_COLORS[members.length % MEMBER_COLORS.length], salary: null, familyDeduction: null };
    const next = [...members, m];
    setMembers(next);
    setSplitStrs(splitsToStrings(next, buildDefaultSplits(next)));
  };

  const removeMember = (id) => {
    if (members.length <= 1) { showToast('⚠ At least one member required'); return; }
    const next = members.filter(m => m.id !== id);
    setMembers(next);
    setSplitStrs(splitsToStrings(next, buildDefaultSplits(next)));
  };

  const updateMember = (id, field, val) =>
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));

  // ── Budget pcts (simple string inputs — no parsing until blur/save) ──
  const updateCatPct = (catKey, val) =>
    setBudgetPctStrs(prev => ({ ...prev, [catKey]: { ...prev[catKey], pct: val } }));

  const updateSubPct = (catKey, subKey, val) =>
    setBudgetPctStrs(prev => ({
      ...prev,
      [catKey]: { ...prev[catKey], subs: { ...prev[catKey]?.subs, [subKey]: val } }
    }));

  // ── Splits ─────────────────────────────────────────────────
  const updateSplit = (subKey, memberId, val) =>
    setSplitStrs(prev => ({ ...prev, [subKey]: { ...prev[subKey], [memberId]: val } }));

  const applyIncomeRatio = () => {
    const nets  = members.map(m => calcNet(m.salary, m.familyDeduction));
    const total = nets.reduce((s, n) => s + n, 0);
    const next  = {};
    BUDGET_STRUCTURE.forEach(cat => cat.subs.forEach(sub => {
      next[sub.key] = {};
      let rem = 100;
      members.forEach((m, i) => {
        const pct = i < members.length - 1
          ? (total > 0 ? Math.round(nets[i] / total * 100) : Math.round(100 / members.length))
          : rem;
        next[sub.key][m.id] = String(pct);
        rem -= pct;
      });
    }));
    setSplitStrs(next);
  };

  // ── Derived numbers (computed fresh from strings each render) ──
  const catPctNum = (catKey) => toNum(budgetPctStrs[catKey]?.pct);
  const subPctNum = (catKey, subKey) => toNum(budgetPctStrs[catKey]?.subs?.[subKey]);

  const catTotal = Math.round(visibleCats(type).reduce((s, cat) => s + catPctNum(cat.key), 0) * 10) / 10;

  // ── Validation ─────────────────────────────────────────────
  const validate = () => {
    if (!name.trim()) { showToast('⚠ Enter a group name'); return false; }
    if (members.some(m => !m.name.trim())) { showToast('⚠ All members need a name'); return false; }
    if (Math.round(catTotal) !== 100) { showToast(`⚠ Category % sum to ${catTotal.toFixed(1)}% — must be 100%`); return false; }
    for (const cat of visibleCats(type)) {
      const subSum = Math.round(visibleSubs(type, cat).reduce((s, sub) => s + subPctNum(cat.key, sub.key), 0) * 10) / 10;
      if (Math.round(subSum) !== 100) { showToast(`⚠ Sub-categories of "${cat.label}" sum to ${subSum.toFixed(1)}%`); return false; }
    }
    const badRows = visibleCats(type).flatMap(c => visibleSubs(type, c)).filter(sub => {
      const sum = members.reduce((s, m) => s + toNum(splitStrs[sub.key]?.[m.id]), 0);
      return Math.round(sum) !== 100;
    });
    if (badRows.length > 0) { showToast(`⚠ ${badRows.length} split row(s) don't sum to 100%`); return false; }
    return true;
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const budgetPcts = stringsToFractions(budgetPctStrs);
    const splits = {};
    BUDGET_STRUCTURE.forEach(cat => cat.subs.forEach(sub => {
      splits[sub.key] = {};
      members.forEach(m => { splits[sub.key][m.id] = toNum(splitStrs[sub.key]?.[m.id]); });
    }));

    const payload = { name: name.trim(), type, currency, status, tripEndDate: type === 'travel' ? tripEndDate : null, members: members.map(m => ({
      ...m,
      salary:           parseFloat(m.salary)           || 0,
      familyDeduction:  parseFloat(m.familyDeduction)  || 0,
    })), budgetPcts, splits };
    try {
      if (isEdit) {
        const updated = { ...editGroup, ...payload };
        updateGroupLocal(updated);
        showToast('✓ Group updated');
        onDone(updated);
      } else {
        const saved = await createGroup(payload);
        showToast('✓ Group created');
        onDone(saved);
      }
    } catch (e) {
      showToast('⚠ Failed to save group: ' + e.message);
    }
    setSaving(false);
  };

  const validMembers = members.filter(m => m.name.trim());

  return (
    <div className="editor-panel">
      <h3>{isEdit ? 'Edit Group' : 'New Group'}</h3>

      {/* Name */}
      <div className="editor-section">
        <div className="editor-section-title">Group Name</div>
        <input disabled={isEdit} className="modal-inp" style={{ maxWidth: 340 }} placeholder="e.g. Mumbai Flat 2026"
          value={name} onChange={e => setName(e.target.value)} />
      </div>

      {/* Currency */}
      <div className="editor-section">
        <div className="editor-section-title">Currency</div>
        <select className="modal-inp" style={{ maxWidth: 220 }}
          value={currency} onChange={e => setCurrency(e.target.value)}>
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.symbol} — {c.label} ({c.code})</option>
          ))}
        </select>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>
          All amounts for this group — budget, splits, bills — will be shown in this currency.
        </p>
      </div>

      {/* Status — only relevant once a group exists */}
      {isEdit && (
        <div className="editor-section">
          <div className="editor-section-title">Status</div>
          <div className="group-type-grid">
            {GROUP_STATUSES.map(s => (
              <button
                key={s.key}
                type="button"
                className={`group-type-btn${status === s.key ? ' selected' : ''}`}
                style={status === s.key ? { borderColor: s.color } : undefined}
                onClick={() => {
                  if (s.key === 'archived' && status !== 'archived' && !window.confirm(`Archive "${name}"? It will be hidden from the main group list until unarchived.`)) return;
                  setStatus(s.key);
                }}
              >
                <span className="gt-icon" style={{ color: s.color }}>●</span>
                <span className="gt-label">{s.label}</span>
              </button>
            ))}
          </div>
          {status === 'completed' && ['travel', 'roommates'].includes(type) && (
            <p style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              💡 Marking a {type === 'travel' ? 'trip' : 'roommate group'} as completed keeps all its data intact — you can still open it to review the final numbers.
            </p>
          )}
        </div>
      )}

      {/* Type */}
      <div className="editor-section">
        <div className="editor-section-title">Group Type</div>
        <div className="group-type-grid">
          {GROUP_TYPES.map(gt => (
            <button
              key={gt.key}
              disabled = {isEdit && type !== gt.key}
              className={`group-type-btn${type === gt.key ? ' selected' : ''}`}
              onClick={() => setType(gt.key)}
              type="button"
            >
              <span className="gt-icon">{gt.icon}</span>
              <span className="gt-label">{gt.label}</span>
              <span className="gt-desc">{gt.desc}</span>
            </button>
          ))}
        </div>
        {type === 'travel' && (
          <div style={{ marginTop: 12 }}>
            <div className="editor-section-title" style={{ fontSize: '0.78rem', marginBottom: 4 }}>Trip End Date</div>
            <input className="modal-inp" type="date" style={{ maxWidth: 200 }}
              value={tripEndDate} onChange={e => setTripEndDate(e.target.value)} />
          </div>
        )}
        {type === 'occasion' && (
          <p style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            💡 Budget categories are mapped for occasions — <strong>Housing = Venue</strong> · <strong>Utilities = Decor</strong> · <strong>Entertainment = Photography &amp; Music</strong>
          </p>
        )}
      </div>

      {/* Members */}
      <div className="editor-section">
        <div className="editor-section-title">Members</div>

        {/* Header row — columns depend on type */}
        {type === 'roommates' ? (
          <div className="member-row-header member-row-name-only">
            <span>Name</span><span />
          </div>
        ) : ['travel', 'occasion'].includes(type) ? (
          <div className="member-row-header member-row-contribution">
            <span>Name</span><span>Contribution ({getCurrencySymbol(currency)})</span><span />
          </div>
        ) : (
          <div className="member-row-header">
            <span>Name</span><span>Gross Salary</span><span>Family Deduction</span><span>Net</span><span />
          </div>
        )}

        {members.map((m) => (
          <div className={`member-row${type === 'roommates' ? ' member-row-name-only' : ['travel','occasion'].includes(type) ? ' member-row-contribution' : ''}`} key={m.id}>
            <input className="modal-inp" placeholder="Name" value={m.name}
              onChange={e => updateMember(m.id, 'name', e.target.value)} />
            {type === 'roommates' ? null : ['travel', 'occasion'].includes(type) ? (
              <input className="modal-inp" placeholder={`${getCurrencySymbol(currency)} Amount`} value={m.salary}
                onChange={e => updateMember(m.id, 'salary', e.target.value)} />
            ) : (
              <>
                <input className="modal-inp" placeholder={`${getCurrencySymbol(currency)} Gross`} value={m.salary}
                  onChange={e => updateMember(m.id, 'salary', e.target.value)} />
                <input className="modal-inp" placeholder={`${getCurrencySymbol(currency)} Deduction`} value={m.familyDeduction}
                  onChange={e => updateMember(m.id, 'familyDeduction', e.target.value)} />
                <div className="member-net">{formatAmount(calcNet(m.salary, m.familyDeduction), currency)}</div>
              </>
            )}
            <button className="btn-remove" onClick={() => removeMember(m.id)}>✕</button>
          </div>
        ))}
        <button className="btn-add-member" onClick={addMember}>+ Add Member</button>
        {validMembers.length > 0 && (
          <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--green)' }}>
            {type === 'travel' || type === 'occasion'
              ? `Total pool: ${formatAmount(validMembers.reduce((s, m) => s + (parseFloat(m.salary) || 0), 0), currency)}`
              : type === 'roommates'
              ? `${validMembers.length} member${validMembers.length !== 1 ? 's' : ''}`
              : `Combined net: ${formatAmount(validMembers.reduce((s, m) => s + calcNet(m.salary, m.familyDeduction), 0), currency)}/month`
            }
          </div>
        )}
      </div>

      {/* Budget Pcts */}
      <div className="editor-section">
        <div className="splits-toolbar">
          <div className="editor-section-title" style={{ margin: 0 }}>Budget Allocation (%)</div>
          <button className="btn-auto-all" onClick={() => setBudgetPctStrs(pctsToStrings(buildDefaultBudgetPcts()))}>↺ Reset to defaults</button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
          Category % must sum to 100%. Sub-category % within each category must also sum to 100%.
        </p>
        <div className="splits-table-wrap">
          <table className="splits-table">
            <thead><tr>
              <th style={{ textAlign: 'left' }}>Category / Sub-Category</th>
              <th style={{ textAlign: 'center', width: 90 }}>% of Total</th>
              <th style={{ textAlign: 'center', width: 90 }}>% within Cat</th>
              <th style={{ textAlign: 'left', fontSize: '0.7rem', opacity: 0.75 }}>
                {['travel','occasion'].includes(type) ? 'Effective % of pool' : 'Effective % of salary'}
              </th>
            </tr></thead>
            <tbody>
              {visibleCats(type).map(cat => {
                const catPct   = catPctNum(cat.key);
                const subSum   = Math.round(visibleSubs(type, cat).reduce((s, sub) => s + subPctNum(cat.key, sub.key), 0) * 10) / 10;
                const subSumOk = Math.round(subSum) === 100;
                return [
                  <tr key={cat.key} style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <td><strong>{cat.label}</strong></td>
                    <td style={{ textAlign: 'center' }}>
                      <input className="modal-inp" style={{ width: 68, textAlign: 'center' }}
                        value={budgetPctStrs[cat.key]?.pct ?? ''}
                        onChange={e => updateCatPct(cat.key, e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                      <span className={subSumOk ? 'split-ok' : 'split-warn'}>
                        {subSumOk ? '✓ 100%' : `✗ ${subSum.toFixed(1)}%`}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{catPct.toFixed(1)}% of {['travel','occasion'].includes(type) ? 'pool' : 'salary'}</td>
                  </tr>,
                  ...visibleSubs(type, cat).map(sub => {
                    const subPct = subPctNum(cat.key, sub.key);
                    return (
                      <tr key={sub.key}>
                        <td style={{ paddingLeft: 24, color: 'var(--muted)', fontSize: '0.8rem' }}>↳ {getSubLabel(type, sub.key, sub.label)}</td>
                        <td />
                        <td style={{ textAlign: 'center' }}>
                          <input className="modal-inp" style={{ width: 68, textAlign: 'center' }}
                            value={budgetPctStrs[cat.key]?.subs?.[sub.key] ?? ''}
                            onChange={e => updateSubPct(cat.key, sub.key, e.target.value)} />
                        </td>
                        <td style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                          {(catPct * subPct / 100).toFixed(1)}% of {['travel','occasion'].includes(type) ? 'pool' : 'salary'}
                        </td>
                      </tr>
                    );
                  })
                ];
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: '0.78rem' }}>
          Category total: <strong className={Math.round(catTotal) === 100 ? 'split-ok' : 'split-warn'}>{catTotal.toFixed(1)}%</strong>
          {Math.round(catTotal) !== 100 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>⚠ Must equal 100%</span>}
        </div>
      </div>

      {/* Splits — only shown when >1 member */}
      {validMembers.length > 1 && (
        <div className="editor-section">
          <div className="splits-toolbar">
            <div className="editor-section-title" style={{ margin: 0 }}>Category Splits (%)</div>
            <button className="btn-auto-all" onClick={applyIncomeRatio}>↺ Apply income ratio to all</button>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
            Each row must sum to 100%. Defines each person's share of that sub-category.
          </p>
          <div className="splits-table-wrap">
            <table className="splits-table">
              <thead><tr>
                <th>Sub-Category</th>
                {validMembers.map(m => <th key={m.id} style={{ background: m.color, color: '#fff' }}>{m.name}</th>)}
                <th>Total</th>
              </tr></thead>
              <tbody>
                {visibleCats(type).map(cat => [
                  <tr key={`hdr-${cat.key}`} style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <td colSpan={validMembers.length + 2}><strong>{cat.label}</strong></td>
                  </tr>,
                  ...visibleSubs(type, cat).map(sub => {
                    const rowTotal = validMembers.reduce((s, m) => s + toNum(splitStrs[sub.key]?.[m.id]), 0);
                    return (
                      <tr key={sub.key}>
                        <td style={{ fontSize: '0.82rem' }}>{getSubLabel(type, sub.key, sub.label)}</td>
                        {validMembers.map(m => (
                          <td key={m.id}>
                            <input className="modal-inp" style={{ width: 68, textAlign: 'center' }}
                              value={splitStrs[sub.key]?.[m.id] ?? ''}
                              onChange={e => updateSplit(sub.key, m.id, e.target.value)} />
                          </td>
                        ))}
                        <td className={Math.round(rowTotal) === 100 ? 'split-ok' : 'split-warn'}>{rowTotal}%</td>
                      </tr>
                    );
                  })
                ])}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="editor-footer">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Group'}
        </button>
      </div>
    </div>
  );
}
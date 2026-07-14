import { useState } from 'react';
import { useApp, DETAIL_ITEMS, MEMBER_COLORS, getSubLabel, getDetailItems, visibleSubs, visibleCats, formatAmount, getAlertThreshold, DEFAULT_ALERT_THRESHOLD } from '../context/AppContext';

export default function BudgetTab() {
  const { activeGroup, getTotalNet, getSubBudget, updateAlertThreshold, clearDismissedAlerts } = useApp();
  const [accordionOpen, setAccordionOpen] = useState(false);

  if (!activeGroup) return null;

  const fmt = (n) => formatAmount(Math.round(n), activeGroup.currency);
  const threshold = getAlertThreshold(activeGroup);
  const thresholdPct = Math.round(threshold * 100);

  const handleThresholdChange = (pct) => {
    const clamped = Math.min(99, Math.max(50, pct));
    updateAlertThreshold(activeGroup.id, clamped / 100);
    // A changed threshold can un-flag or newly-flag categories, so previously
    // dismissed alerts (tied to the old threshold) shouldn't silently persist.
    clearDismissedAlerts(activeGroup.id);
  };

  const type = activeGroup.type ?? 'household';
  const showSalary = !['travel', 'occasion', 'roommates'].includes(type);
  const members = activeGroup.members ?? [];
  const totalNet = getTotalNet(activeGroup);
  const totalGross = members.reduce((s, m) => s + (parseFloat(m.salary) || 0), 0);
  const efund = totalNet * 6;
  const splits = activeGroup.splits ?? {};

  return (
    <section className="tab-panel active">
      {showSalary && (
      <div className="income-row">
        {members.map(m => {
          const gross = parseFloat(m.salary) || 0;
          const ded   = parseFloat(m.familyDeduction) || 0;
          const net   = Math.max(0, gross - ded);
          return (
            <div className="income-card" key={m.id} style={{ borderTop: `3px solid ${m.color || MEMBER_COLORS[0]}` }}>
              <div className="income-card-name">{m.name}</div>
              <div className="income-card-val">{fmt(net)}</div>
              <div className="income-card-sub">Net · Gross {fmt(gross)}</div>
            </div>
          );
        })}
        <div className="income-card" style={{ borderColor: 'var(--accent)', background: 'rgba(108,99,255,0.08)' }}>
          <div className="income-card-name">Combined Net</div>
          <div className="income-card-val">{fmt(totalNet)}</div>
          <div className="income-card-sub">Gross {fmt(totalGross)}</div>
        </div>
      </div>
      )}

      {showSalary && (
      <div className="efund-banner">
        🎯 Emergency Fund Target (6 × monthly salary): <strong>{fmt(efund)}</strong>
      </div>
      )}

      <div className="card">
        <div className="card-title">Budget Alert Settings</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 4 }}>
          Get flagged on the Dashboard when a category crosses this percentage of its budget.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <input
            type="range" min="50" max="99" step="1"
            value={thresholdPct}
            onChange={e => handleThresholdChange(parseInt(e.target.value))}
            style={{ flex: 1, maxWidth: 260 }}
          />
          <strong style={{ minWidth: 48 }}>{thresholdPct}%</strong>
          {thresholdPct !== Math.round(DEFAULT_ALERT_THRESHOLD * 100) && (
            <button
              onClick={() => handleThresholdChange(Math.round(DEFAULT_ALERT_THRESHOLD * 100))}
              style={{ background: 'none', border: 'none', color: 'var(--accent2)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Reset to default ({Math.round(DEFAULT_ALERT_THRESHOLD * 100)}%)
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Budget Allocation</div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Category / Sub-Category</th>
                <th>{showSalary ? '% of Salary' : '% of Pool'}</th>
                <th>Monthly Amount</th>
                {members.map(m => (
                  <th key={m.id} style={{ background: m.color, color: '#fff' }}>{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleCats(type).map(cat => {
                const catPct = activeGroup.budgetPcts?.[cat.key]?.pct ?? cat.pct;
                const catAmt = visibleSubs(type, cat).reduce((s, sub) => s + getSubBudget(activeGroup, cat, sub), 0);
                return (
                  <>
                    <tr key={cat.key} style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <td><strong>{cat.label}</strong></td>
                      <td>{(catPct * 100).toFixed(0)}%</td>
                      <td><strong>{fmt(catAmt)}</strong></td>
                      {members.map(m => <td key={m.id} />)}
                    </tr>
                    {visibleSubs(type, cat).map(sub => {
                      const subPct = activeGroup.budgetPcts?.[cat.key]?.subs?.[sub.key] ?? sub.pct;
                      const subAmt = getSubBudget(activeGroup, cat, sub);
                      return (
                        <tr key={sub.key} style={{ fontSize: '0.82rem' }}>
                          <td style={{ paddingLeft: 24, color: 'var(--muted)' }}>↳ {getSubLabel(type, sub.key, sub.label)}</td>
                          <td style={{ color: 'var(--muted)' }}>{(catPct * subPct * 100).toFixed(1)}%</td>
                          <td>{fmt(subAmt)}</td>
                          {members.map(m => {
                            const pPct = splits[sub.key]?.[m.id] ?? 0;
                            const pAmt = subAmt * pPct / 100;
                            return <td key={m.id} style={{ fontSize: '0.78rem' }}>{fmt(pAmt)} ({pPct}%)</td>;
                          })}
                        </tr>
                      );
                    })}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        <button className="accordion-btn" onClick={() => setAccordionOpen(o => !o)}>
          {accordionOpen ? '▲' : '▼'} Category Reference (Template)
        </button>
        <div className={`accordion-body ${accordionOpen ? 'open' : ''}`}>
          {visibleCats(type).map(cat => (
            <div key={cat.key} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                {cat.label} ({(cat.pct * 100).toFixed(0)}%)
              </div>
              {visibleSubs(activeGroup?.type, cat).map(sub => (
                <div key={sub.key} style={{ paddingLeft: 16 }}>
                  • {getSubLabel(activeGroup?.type, sub.key, sub.label)} ({(sub.pct * 100).toFixed(0)}% of {cat.label})
                  {getDetailItems(activeGroup?.type, sub.key).map(item => (
                    <div key={item.key} style={{ paddingLeft: 28, fontSize: '0.78rem' }}>– {item.label}</div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
import { useState } from 'react';
import { useApp, BUDGET_STRUCTURE, DETAIL_ITEMS, MEMBER_COLORS } from '../context/AppContext';

function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

export default function BudgetTab() {
  const { activeGroup, getTotalNet, getSubBudget } = useApp();
  const [accordionOpen, setAccordionOpen] = useState(false);

  if (!activeGroup) return null;

  const members = activeGroup.members ?? [];
  const totalNet = getTotalNet(activeGroup);
  const totalGross = members.reduce((s, m) => s + (parseFloat(m.salary) || 0), 0);
  const efund = totalNet * 6;
  const splits = activeGroup.splits ?? {};

  return (
    <section className="tab-panel active">
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

      <div className="efund-banner">
        🎯 Emergency Fund Target (6 × monthly salary): <strong>{fmt(efund)}</strong>
      </div>

      <div className="card">
        <div className="card-title">Budget Allocation</div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Category / Sub-Category</th>
                <th>% of Salary</th>
                <th>Monthly Amount</th>
                {members.map(m => (
                  <th key={m.id} style={{ background: m.color, color: '#fff' }}>{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUDGET_STRUCTURE.map(cat => {
                const catPct = activeGroup.budgetPcts?.[cat.key]?.pct ?? cat.pct;
                const catAmt = cat.subs.reduce((s, sub) => s + getSubBudget(activeGroup, cat, sub), 0);
                return (
                  <>
                    <tr key={cat.key} style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <td><strong>{cat.label}</strong></td>
                      <td>{(catPct * 100).toFixed(0)}%</td>
                      <td><strong>{fmt(catAmt)}</strong></td>
                      {members.map(m => <td key={m.id} />)}
                    </tr>
                    {cat.subs.map(sub => {
                      const subAmt = getSubBudget(activeGroup, cat, sub);
                      const subPct = activeGroup.budgetPcts?.[cat.key]?.subs?.[sub.key] ?? sub.pct;
                      return (
                        <tr key={sub.key} style={{ fontSize: '0.82rem' }}>
                          <td style={{ paddingLeft: 24, color: 'var(--muted)' }}>↳ {sub.label}</td>
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
          {BUDGET_STRUCTURE.map(cat => (
            <div key={cat.key} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                {cat.label} ({(cat.pct * 100).toFixed(0)}%)
              </div>
              {cat.subs.map(sub => (
                <div key={sub.key} style={{ paddingLeft: 16 }}>
                  • {sub.label} ({(sub.pct * 100).toFixed(0)}% of {cat.label})
                  {(DETAIL_ITEMS[sub.key] || []).map(item => (
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

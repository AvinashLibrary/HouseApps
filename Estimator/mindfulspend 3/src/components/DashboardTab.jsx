import { useState } from 'react';
import { useApp, MONTHS, getSubLabel, visibleSubs, visibleCats, formatAmount } from '../context/AppContext';

const MOTIVATIONS = [
  'Focusing on one month at a time brings clarity.',
  'Every rupee tracked is a step toward freedom.',
  'Small savings compound into big futures.',
  'Awareness is the first act of financial wellness.',
];

const CAT_ICONS   = { needs: '🏠', wants: '🛍', savings: '💰' };
const CAT_ICON_BG = { needs: '#dbeafe', wants: '#fef9c3', savings: '#e0e7ff' };

function fillColor(ratio) {
  if (ratio >= 1)    return 'fill-red';
  if (ratio >= 0.85) return 'fill-amber';
  return 'fill-green';
}

function TopMerchants({ billLog, currency }) {
  const totalsMap = new Map();
  billLog.forEach(b => {
    if (!b.merchant) return;
    totalsMap.set(b.merchant, (totalsMap.get(b.merchant) || 0) + b.amount);
  });
  const totals = Array.from(totalsMap.entries())
    .map(([merchant, total]) => ({ merchant, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (totals.length === 0) return null;
  const maxTotal = Math.max(...totals.map(m => m.total));

  return (
    <div className="cat-card" style={{ marginTop: 16 }}>
      <div className="cat-card-header">
        <div className="cat-card-name" style={{ flex: 1 }}>Top Merchants</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {totals.map(m => (
          <div key={m.merchant} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: '0.82rem' }}>{m.merchant}</span>
            <div style={{ flex: 2, background: 'var(--surface2)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
              <div style={{ width: `${(m.total / maxTotal) * 100}%`, height: '100%', background: 'var(--accent)' }} />
            </div>
            <strong style={{ fontSize: '0.82rem', minWidth: 80, textAlign: 'right' }}>{formatAmount(m.total, currency)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardTab({ onAddExpense, onNavigateToRow }) {
  const { activeGroup, getTotalNet, getSubBudget, getCatActualMonth, getSubActualMonth, billLog } = useApp();
  const [monthIdx, setMonthIdx] = useState(11);
  const [openCats, setOpenCats] = useState({});

  if (!activeGroup) return null;

  const fmt = (n) => formatAmount(Math.round(n), activeGroup.currency);
  const isPool = ['travel', 'occasion'].includes(activeGroup.type);
  const mi = isPool ? 0 : monthIdx;

  const totalNet = getTotalNet(activeGroup);

  let totalSpent = 0, totalBudget = 0;
  visibleCats(activeGroup.type).forEach(cat => {
    visibleSubs(activeGroup.type, cat).forEach(sub => {
      totalBudget += getSubBudget(activeGroup, cat, sub);
      totalSpent  += getSubActualMonth(sub.key, mi);
    });
  });

  const balance = totalBudget - totalSpent;
  const spentRatio = totalBudget > 0 ? Math.min(totalSpent / totalBudget, 1) : 0;
  const donutCirc = 87.96;
  const donutFill = spentRatio * donutCirc;
  const mot = MOTIVATIONS[mi % MOTIVATIONS.length];

  const toggleCard = (catKey) => setOpenCats(prev => ({ ...prev, [catKey]: !prev[catKey] }));

  return (
    <section className="tab-panel active">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">{isPool ? 'Pool Overview' : `${MONTHS[monthIdx]} Overview`}</h1>
        </div>
        <div className="dash-header-right">
          <button className="btn-add-expense" onClick={onAddExpense}>
            <span>+</span> Add Expense
          </button>
        </div>
      </div>

      {!isPool && (
        <div className="month-picker">
          <button className="month-arrow" onClick={() => setMonthIdx(i => (i - 1 + 12) % 12)}>‹</button>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{MONTHS[monthIdx]} 2026</span>
          <button className="month-arrow" onClick={() => setMonthIdx(i => (i + 1) % 12)}>›</button>
        </div>
      )}

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">TOTAL BUDGET</div>
          <div className="stat-value">{fmt(totalBudget)}</div>
        </div>
        <div className="stat-card stat-card--spent">
          <div className="stat-label">SPENT</div>
          <div className="stat-value">{fmt(totalSpent)}</div>
          <div className="stat-progress-wrap">
            <div className="stat-progress-bar" style={{ width: `${spentRatio * 100}%` }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">BALANCE</div>
          <div className="stat-value" style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmt(Math.abs(balance))}{balance < 0 ? ' over' : ''}
          </div>
          <div className="stat-donut-wrap">
            <svg viewBox="0 0 36 36" className="stat-donut">
              <circle className="donut-bg" cx="18" cy="18" r="14" />
              <circle className="donut-fg" cx="18" cy="18" r="14"
                strokeDasharray={`${donutFill.toFixed(2)} ${(donutCirc - donutFill).toFixed(2)}`}
                strokeDashoffset="21.99" />
            </svg>
          </div>
        </div>
      </div>

      <p className="drag-hint">⊙ Click a category to expand sub-category breakdown.</p>

      <div className="cat-cards">
        {visibleCats(activeGroup.type).map(cat => {
          const catBudget = visibleSubs(activeGroup.type, cat).reduce((s, sub) => s + getSubBudget(activeGroup, cat, sub), 0);
          const catSpent  = getCatActualMonth(cat.key, mi);
          const ratio = catBudget > 0 ? catSpent / catBudget : 0;
          const pct = Math.min(ratio * 100, 100);
          const icon = CAT_ICONS[cat.key] || '📂';
          const iconBg = CAT_ICON_BG[cat.key] || '#f3f4f6';
          const isOpen = !!openCats[cat.key];

          return (
            <div className="cat-card" key={cat.key}>
              <div className="cat-card-header" onClick={() => toggleCard(cat.key)} style={{ cursor: 'pointer' }}>
                <span style={{ background: iconBg, borderRadius: 6, padding: '2px 6px', marginRight: 6 }}>{icon}</span>
                <div className="cat-card-name" style={{ flex: 1 }}>{cat.label}</div>
                <div className="cat-card-pct">{fmt(catBudget)}</div>
              </div>
              <div className="cat-progress">
                <div className={`cat-progress-fill ${fillColor(ratio)}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="cat-amounts">
                <span>Spent <span className="cat-spent-val">{fmt(catSpent)}</span></span>
                <span>{Math.round(pct)}% used</span>
              </div>
              {isOpen && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {visibleSubs(activeGroup?.type, cat).map(sub => {
                    const subSpent = getSubActualMonth(sub.key, mi);
                    return (
                      <div
                        key={sub.key}
                        onClick={() => onNavigateToRow && onNavigateToRow(sub.key, mi)}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 2px', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        <span style={{ color: 'var(--muted)' }}>{getSubLabel(activeGroup?.type, sub.key, sub.label)}</span>
                        <span>{subSpent > 0 ? fmt(subSpent) : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <TopMerchants billLog={billLog} currency={activeGroup.currency} />

      <div className="motivation-card">
        <div className="mot-icon">🧘</div>
        <div className="mot-text">{mot}</div>
      </div>
    </section>
  );
}
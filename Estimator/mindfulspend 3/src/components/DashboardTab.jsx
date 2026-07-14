import { useState } from 'react';
import { useApp, MONTHS, getSubLabel, visibleSubs, visibleCats, formatAmount, getAlertThreshold, computeSpendForecast } from '../context/AppContext';

const MOTIVATIONS = [
  'Focusing on one month at a time brings clarity.',
  'Every rupee tracked is a step toward freedom.',
  'Small savings compound into big futures.',
  'Awareness is the first act of financial wellness.',
];

const CAT_ICONS   = { needs: '🏠', wants: '🛍', savings: '💰' };
const CAT_ICON_BG = { needs: '#dbeafe', wants: '#fef9c3', savings: '#e0e7ff' };

const TONE_COLOR = { warn: 'var(--red)', caution: '#f59e0b', good: 'var(--green)', info: 'var(--muted)' };

function fillColor(ratio) {
  if (ratio >= 1)    return 'fill-red';
  if (ratio >= 0.85) return 'fill-amber';
  return 'fill-green';
}

// Pure — derives a short, prioritized list of insights from data that already
// exists in context (no new state, no dependency on a separate alerts feature).
function buildInsights({ activeGroup, isPool, monthIdx, mi, cats, getSubBudget, getSubActualMonth, getCatActualMonth, totalSpent, totalBudget, billLog, fmt, threshold }) {
  const insights = [];

  if (totalSpent === 0) {
    insights.push({
      tone: 'info', icon: '💡',
      text: `No expenses logged ${isPool ? 'yet' : `for ${MONTHS[monthIdx]}`}. Add one to start tracking.`,
    });
  }

  // Per-category budget status
  cats.forEach(cat => {
    const catBudget = visibleSubs(activeGroup.type, cat).reduce((s, sub) => s + getSubBudget(activeGroup, cat, sub), 0);
    const catSpent = getCatActualMonth(cat.key, mi);
    if (catBudget <= 0 || catSpent <= 0) return;
    const ratio = catSpent / catBudget;
    if (ratio >= 1) {
      insights.push({ tone: 'warn', icon: '⚠️', text: `You're over budget in ${cat.label} by ${fmt(catSpent - catBudget)}.` });
    } else if (ratio >= threshold) {
      insights.push({ tone: 'caution', icon: '🟡', text: `${cat.label} is at ${Math.round(ratio * 100)}% of its budget — ${fmt(catBudget - catSpent)} left.` });
    } else if (ratio <= 0.5) {
      insights.push({ tone: 'good', icon: '✅', text: `${cat.label} is well under budget — only ${Math.round(ratio * 100)}% used so far.` });
    }
  });

  // Month-over-month comparison (only meaningful when there's a real month axis)
  if (!isPool && monthIdx > 0) {
    let prevSpent = 0;
    cats.forEach(cat => visibleSubs(activeGroup.type, cat).forEach(sub => {
      prevSpent += getSubActualMonth(sub.key, monthIdx - 1);
    }));
    if (prevSpent > 0 && totalSpent > 0) {
      const pctChange = ((totalSpent - prevSpent) / prevSpent) * 100;
      if (pctChange >= 10) {
        insights.push({ tone: 'warn', icon: '📈', text: `You've spent ${Math.round(pctChange)}% more than ${MONTHS[monthIdx - 1]}.` });
      } else if (pctChange <= -10) {
        insights.push({ tone: 'good', icon: '📉', text: `Nice — ${Math.round(Math.abs(pctChange))}% less spent than ${MONTHS[monthIdx - 1]}.` });
      }
    }
  }

  // Biggest single expense in scope
  const scopedBills = isPool ? billLog : billLog.filter(b => b.monthIdx === mi);
  if (scopedBills.length > 0) {
    const biggest = scopedBills.reduce((max, b) => (b.amount > max.amount ? b : max), scopedBills[0]);
    insights.push({
      tone: 'info', icon: '🧾',
      text: `Your biggest expense ${isPool ? '' : 'this month '}was ${fmt(biggest.amount)}${biggest.merchant ? ` at ${biggest.merchant}` : ` on ${biggest.subCatLabel}`}.`,
    });
  }

  // Prioritize warnings, then cautions, then good news, then info — show at most 4
  const rank = { warn: 0, caution: 1, good: 2, info: 3 };
  return insights.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 4);
}

// Stable per (category, month, severity) — dismissing an "over budget" alert
// doesn't hide a later, worse one, and it naturally resets when the month rolls over.
function buildAlertId(catKey, mi, type) {
  return `${catKey}-${mi}-${type}`;
}

function buildAlerts({ activeGroup, isPool, mi, cats, getSubBudget, getCatActualMonth, threshold, fmt }) {
  const alerts = [];
  cats.forEach(cat => {
    const catBudget = visibleSubs(activeGroup.type, cat).reduce((s, sub) => s + getSubBudget(activeGroup, cat, sub), 0);
    const catSpent = getCatActualMonth(cat.key, mi);
    if (catBudget <= 0 || catSpent <= 0) return;
    const ratio = catSpent / catBudget;
    if (ratio >= 1) {
      alerts.push({
        id: buildAlertId(cat.key, mi, 'over'), tone: 'warn', icon: '⚠️',
        text: `${cat.label} is over budget by ${fmt(catSpent - catBudget)}${isPool ? '' : ` this ${MONTHS[mi] || 'month'}`}.`,
      });
    } else if (ratio >= threshold) {
      alerts.push({
        id: buildAlertId(cat.key, mi, 'near'), tone: 'caution', icon: '🟡',
        text: `${cat.label} has reached ${Math.round(ratio * 100)}% of its budget — ${fmt(catBudget - catSpent)} left.`,
      });
    }
  });
  return alerts;
}

function BudgetAlerts({ alerts, dismissedIds, onDismiss, onResetDismissed }) {
  const visible = alerts.filter(a => !dismissedIds.includes(a.id));
  const hiddenCount = alerts.length - visible.length;

  if (visible.length === 0 && hiddenCount === 0) return null;

  return (
    <div className="cat-card" style={{ marginTop: 16, borderLeft: visible.some(a => a.tone === 'warn') ? '3px solid var(--red)' : visible.length ? '3px solid #f59e0b' : undefined }}>
      <div className="cat-card-header">
        <div className="cat-card-name" style={{ flex: 1 }}>🔔 Budget Alerts</div>
        {hiddenCount > 0 && (
          <button
            onClick={onResetDismissed}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            {hiddenCount} dismissed · reset
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 8 }}>All caught up — no active alerts.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {visible.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span>{a.icon}</span>
              <span style={{ flex: 1, fontSize: '0.85rem', color: TONE_COLOR[a.tone] }}>{a.text}</span>
              <button
                onClick={() => onDismiss(a.id)}
                title="Dismiss"
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpendForecast({ forecast, fmt }) {
  if (!forecast) return null;
  const flagged = forecast.perCategory.filter(c => c.status !== 'ok');
  const ratio = forecast.totalBudget > 0 ? forecast.totalPredicted / forecast.totalBudget : 0;

  return (
    <div className="cat-card" style={{ marginTop: 16 }}>
      <div className="cat-card-header">
        <div className="cat-card-name" style={{ flex: 1 }}>🔮 {MONTHS[forecast.targetMonth]} Forecast</div>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
        Based on your average spend over the last {forecast.trailingMonths.length} month{forecast.trailingMonths.length > 1 ? 's' : ''} — a simple trend projection, not a guarantee.
      </p>
      <div style={{ marginTop: 10, fontSize: '0.85rem' }}>
        Projected total: <strong>{fmt(forecast.totalPredicted)}</strong>
        <span style={{ color: 'var(--muted)' }}> of {fmt(forecast.totalBudget)} budget ({Math.round(ratio * 100)}%)</span>
      </div>
      {flagged.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {flagged.map(c => (
            <div key={c.key} style={{ fontSize: '0.82rem', color: c.status === 'over' ? 'var(--red)' : '#f59e0b' }}>
              {c.status === 'over' ? '⚠️' : '🟡'} {c.label} is on track to {c.status === 'over' ? 'exceed' : 'approach'} its budget — projected {fmt(c.predicted)} of {fmt(c.budget)}.
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SmartInsights({ insights }) {
  if (insights.length === 0) return null;
  return (
    <div className="cat-card" style={{ marginTop: 16 }}>
      <div className="cat-card-header">
        <div className="cat-card-name" style={{ flex: 1 }}>✨ Smart Insights</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        {insights.map((ins, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span>{ins.icon}</span>
            <span style={{ fontSize: '0.85rem', color: TONE_COLOR[ins.tone] }}>{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const { activeGroup, getTotalNet, getSubBudget, getCatActualMonth, getSubActualMonth, billLog, dismissAlert, clearDismissedAlerts } = useApp();
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

  const cats = visibleCats(activeGroup.type);
  const threshold = getAlertThreshold(activeGroup);
  const insights = buildInsights({
    activeGroup, isPool, monthIdx, mi, cats,
    getSubBudget, getSubActualMonth, getCatActualMonth,
    totalSpent, totalBudget, billLog, fmt, threshold,
  });
  const alerts = buildAlerts({ activeGroup, isPool, mi, cats, getSubBudget, getCatActualMonth, threshold, fmt });
  const dismissedIds = activeGroup.dismissedAlerts || [];
  const forecast = computeSpendForecast({ activeGroup, getSubBudget, getSubActualMonth });

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

      <BudgetAlerts
        alerts={alerts}
        dismissedIds={dismissedIds}
        onDismiss={(id) => dismissAlert(activeGroup.id, id)}
        onResetDismissed={() => clearDismissedAlerts(activeGroup.id)}
      />

      <SmartInsights insights={insights} />

      <SpendForecast forecast={forecast} fmt={fmt} />

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
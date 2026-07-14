import { useApp, MONTHS, getSubLabel, visibleSubs, visibleCats, PAYMENT_MODES, formatAmount } from '../context/AppContext';

function PaymentModeBreakdown({ bills, currency }) {
  const totals = PAYMENT_MODES.map(p => ({
    ...p,
    total: bills.filter(b => (b.paymentMode || 'other') === p.key).reduce((s, b) => s + b.amount, 0),
  })).filter(p => p.total > 0);

  if (totals.length === 0) return null;
  const grandTotal = totals.reduce((s, p) => s + p.total, 0);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-title">Spend by Payment Mode</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        {totals.map(p => (
          <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 24 }}>{p.icon}</span>
            <span style={{ flex: 1, fontSize: '0.85rem' }}>{p.label}</span>
            <div style={{ flex: 2, background: 'var(--surface2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${(p.total / grandTotal) * 100}%`, height: '100%', background: 'var(--accent)' }} />
            </div>
            <strong style={{ fontSize: '0.85rem', minWidth: 90, textAlign: 'right' }}>{formatAmount(p.total, currency)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function PoolAnalysis({ activeGroup, getSubBudget, getSubActualMonth, onNavigateToRow, billLog }) {
  let totalSaved = 0, totalOver = 0;
  const fmt = (n) => formatAmount(Math.round(n), activeGroup.currency);
  const fmtDiff = (n) => (n >= 0 ? '+' : '-') + fmt(Math.abs(n)).slice(1);

  return (
    <section className="tab-panel active">
      <div className="card">
        <div className="card-title">Budget vs. Actual — Pool Summary</div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {visibleCats(activeGroup.type).map(cat => (
                <>
                  <tr key={cat.key} style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <td colSpan={4}><strong>{cat.label}</strong></td>
                  </tr>
                  {visibleSubs(activeGroup.type, cat).map(sub => {
                    const budget = getSubBudget(activeGroup, cat, sub);
                    const spent = getSubActualMonth(sub.key, 0);
                    const balance = budget - spent;
                    if (balance >= 0) totalSaved += balance; else totalOver += Math.abs(balance);
                    return (
                      <tr key={sub.key} style={{ cursor: 'pointer' }} onClick={() => onNavigateToRow && onNavigateToRow(sub.key, 0)}>
                        <td>{getSubLabel(activeGroup.type, sub.key, sub.label)}</td>
                        <td style={{ color: 'var(--muted)' }}>{fmt(budget)}</td>
                        <td>{spent === 0 ? '—' : fmt(spent)}</td>
                        <td className={spent === 0 ? '' : balance >= 0 ? 'under-budget' : 'over-budget'}>
                          {spent === 0 ? '—' : fmtDiff(balance)}
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="summary-row" style={{ marginTop: 16 }}>
        <div className="summary-chip"><span>Total Saved:</span><strong style={{ color: 'var(--green)' }}>{fmt(totalSaved)}</strong></div>
        <div className="summary-chip"><span>Total Overspent:</span><strong style={{ color: 'var(--red)' }}>{fmt(totalOver)}</strong></div>
        <div className="summary-chip">
          <span>Net Position:</span>
          <strong style={{ color: totalSaved - totalOver >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmt(Math.abs(totalSaved - totalOver))} {totalSaved - totalOver >= 0 ? 'ahead' : 'behind'}
          </strong>
        </div>
      </div>
      <PaymentModeBreakdown bills={billLog} currency={activeGroup.currency} />
    </section>
  );
}

export default function AnalysisTab({ onNavigateToRow }) {
  const { activeGroup, getSubBudget, getSubActualMonth, billLog } = useApp();

  if (!activeGroup) return null;

  if (['travel', 'occasion'].includes(activeGroup.type)) {
    return <PoolAnalysis activeGroup={activeGroup} getSubBudget={getSubBudget} getSubActualMonth={getSubActualMonth} onNavigateToRow={onNavigateToRow} billLog={billLog} />;
  }

  const fmt = (n) => formatAmount(Math.round(n), activeGroup.currency);
  const fmtDiff = (n) => (n >= 0 ? '+' : '-') + fmt(Math.abs(n)).slice(1);

  const monthHasData = (mi) => {
    return visibleCats(activeGroup.type).some(cat =>
      visibleSubs(activeGroup.type, cat).some(sub => getSubActualMonth(sub.key, mi) > 0)
    );
  };

  let totalSaved = 0, totalOver = 0;

  return (
    <section className="tab-panel active">
      <div className="card">
        <div className="card-title">Budget vs. Actual — Savings &amp; Overspend (All Months)</div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Budget</th>
                {MONTHS.map((m, i) => (
                  <th key={m} style={{ cursor: 'pointer' }} onClick={() => onNavigateToRow && onNavigateToRow(null, i)}>
                    {m}
                    <span style={{
                      display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginLeft: 4,
                      background: monthHasData(i) ? 'var(--green)' : 'var(--border)',
                    }} />
                  </th>
                ))}
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {visibleCats(activeGroup.type).map(cat => (
                <>
                  <tr key={cat.key} style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <td colSpan={3 + MONTHS.length}><strong>{cat.label}</strong></td>
                  </tr>
                  {visibleSubs(activeGroup.type, cat).map(sub => {
                    const budget = getSubBudget(activeGroup, cat, sub);
                    let balance = 0;
                    const monthCells = MONTHS.map((_, mi) => {
                      const actual = getSubActualMonth(sub.key, mi);
                      const diff = budget - actual;
                      balance += diff;
                      return { actual, diff };
                    });
                    if (balance >= 0) totalSaved += balance; else totalOver += Math.abs(balance);

                    return (
                      <tr key={sub.key} style={{ cursor: 'pointer' }} onClick={() => onNavigateToRow && onNavigateToRow(sub.key)}>
                        <td>{getSubLabel(activeGroup.type, sub.key, sub.label)}</td>
                        <td style={{ color: 'var(--muted)' }}>{fmt(budget)}</td>
                        {monthCells.map((cell, mi) => (
                          <td key={mi} className={cell.actual === 0 ? '' : cell.diff >= 0 ? 'under-budget' : 'over-budget'} style={{ fontSize: '0.78rem' }}>
                            {cell.actual === 0 ? '—' : fmtDiff(cell.diff)}
                          </td>
                        ))}
                        <td className={balance >= 0 ? 'under-budget' : 'over-budget'}>{fmt(Math.abs(balance))}</td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="summary-row" style={{ marginTop: 16 }}>
        <div className="summary-chip"><span>Total Saved:</span><strong style={{ color: 'var(--green)' }}>{fmt(totalSaved)}</strong></div>
        <div className="summary-chip"><span>Total Overspent:</span><strong style={{ color: 'var(--red)' }}>{fmt(totalOver)}</strong></div>
        <div className="summary-chip">
          <span>Net Position:</span>
          <strong style={{ color: totalSaved - totalOver >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmt(Math.abs(totalSaved - totalOver))} {totalSaved - totalOver >= 0 ? 'ahead' : 'behind'}
          </strong>
        </div>
      </div>
      <PaymentModeBreakdown bills={billLog} currency={activeGroup.currency} />
    </section>
  );
}
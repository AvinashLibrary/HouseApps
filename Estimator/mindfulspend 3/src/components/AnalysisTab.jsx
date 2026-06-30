import { useApp, BUDGET_STRUCTURE, MONTHS } from '../context/AppContext';

function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fmtDiff(n) { return (n >= 0 ? '+' : '-') + fmt(Math.abs(n)).slice(1); }

export default function AnalysisTab({ onNavigateToRow }) {
  const { activeGroup, getSubBudget, getSubActualMonth, getCatActualMonth } = useApp();

  if (!activeGroup) return null;

  const monthHasData = (mi) => {
    return BUDGET_STRUCTURE.some(cat => cat.subs.some(sub => getSubActualMonth(sub.key, mi) > 0));
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
              {BUDGET_STRUCTURE.map(cat => (
                <>
                  <tr key={cat.key} style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <td colSpan={3 + MONTHS.length}><strong>{cat.label}</strong></td>
                  </tr>
                  {cat.subs.map(sub => {
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
                        <td>{sub.label}</td>
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
    </section>
  );
}

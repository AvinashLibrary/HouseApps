import { useState } from 'react';
import { useApp, BUDGET_STRUCTURE, MONTHS, getPaymentModeInfo, PAYMENT_MODES, formatAmount } from '../context/AppContext';

function formatTs(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ReceiptsTab({ onAddExpense, onNavigateToRow }) {
  const { activeGroup, billLog, changeLog, clearLog } = useApp();
  const [view, setView] = useState('bills');
  const [monthFilter, setMonthFilter] = useState('all'); // 'all' or index
  const [catFilter, setCatFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('');

  if (!activeGroup) return null;

  const fmt = (n) => formatAmount(n, activeGroup.currency);

  const allTags = Array.from(new Set(billLog.flatMap(b => b.tags || []))).sort();
  const allMerchants = Array.from(new Set(billLog.map(b => b.merchant).filter(Boolean))).sort();

  const bills = billLog.filter(b => {
    if (monthFilter !== 'all' && b.monthIdx !== monthFilter) return false;
    if (catFilter && b.subCatKey !== catFilter) return false;
    if (modeFilter && (b.paymentMode || 'other') !== modeFilter) return false;
    if (tagFilter && !(b.tags || []).includes(tagFilter)) return false;
    if (merchantFilter && b.merchant !== merchantFilter) return false;
    return true;
  });

  return (
    <section className="tab-panel active">
      <div className="receipts-toolbar">
        <div className="view-toggle">
          <button className={view === 'bills' ? 'active' : ''} onClick={() => setView('bills')}>📎 Bills</button>
          <button className={view === 'log' ? 'active' : ''} onClick={() => setView('log')}>📋 All Changes</button>
        </div>
        <button className="btn-upload-header" onClick={onAddExpense}>📎 Upload Bill</button>
      </div>

      {view === 'bills' && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div className="pill-row" style={{ margin: 0 }}>
              <button className={`pill ${monthFilter === 'all' ? 'active' : ''}`} onClick={() => setMonthFilter('all')}>All</button>
              {MONTHS.map((m, i) => (
                <button key={m} className={`pill ${monthFilter === i ? 'active' : ''}`} onClick={() => setMonthFilter(i)}>
                  {m}
                </button>
              ))}
            </div>
            <select style={{ width: 'auto', minWidth: 180 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {BUDGET_STRUCTURE.map(cat => (
                <optgroup label={cat.label} key={cat.key}>
                  {cat.subs.map(sub => <option key={sub.key} value={sub.key}>{sub.label}</option>)}
                </optgroup>
              ))}
            </select>
            <select style={{ width: 'auto', minWidth: 150 }} value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
              <option value="">All Payment Modes</option>
              {PAYMENT_MODES.map(p => <option key={p.key} value={p.key}>{p.icon} {p.label}</option>)}
            </select>
            {allTags.length > 0 && (
              <select style={{ width: 'auto', minWidth: 130 }} value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
                <option value="">All Tags</option>
                {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
              </select>
            )}
            {allMerchants.length > 0 && (
              <select style={{ width: 'auto', minWidth: 160 }} value={merchantFilter} onChange={e => setMerchantFilter(e.target.value)}>
                <option value="">All Merchants</option>
                {allMerchants.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>

          {bills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>📭</div>
              <p>No receipts yet</p>
              <p style={{ fontSize: '0.8rem' }}>Upload your first bill from the Dashboard or Track Expenses tab.</p>
              <button className="btn-primary" style={{ marginTop: 14 }} onClick={onAddExpense}>+ Upload Bill</button>
            </div>
          ) : (
            <div className="bill-grid">
              {bills.map(bill => (
                <div className="bill-card" key={bill.id ?? `${bill.fileName}-${bill.ts}`}>
                  <div className="bill-card-top">
                    <div>
                      {bill.merchant && <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{bill.merchant}</div>}
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>📎 {bill.fileName}</div>
                    </div>
                    <div className="bill-card-amt">{fmt(bill.amount)}</div>
                  </div>
                  <div className="bill-badges" style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-cat" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)' }}>{bill.subCatLabel}</span>
                    <span className="badge badge-month" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)' }}>{MONTHS[bill.monthIdx]}</span>
                    <span className="badge badge-mode" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)' }}>
                      {getPaymentModeInfo(bill.paymentMode).icon} {getPaymentModeInfo(bill.paymentMode).label}
                    </span>
                    {bill.recurringId && (
                      <span className="badge badge-recurring" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)' }}>
                        🔁 {bill.occurrence}/{bill.occurrenceCount}
                      </span>
                    )}
                  </div>
                  {bill.note && <div className="bill-card-note" style={{ marginTop: 6 }}>{bill.note}</div>}
                  {bill.tags && bill.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {bill.tags.map(t => (
                        <span key={t} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--muted)' }}>#{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 8 }}>{formatTs(bill.ts)}</div>
                  <a
                    style={{ display: 'inline-block', marginTop: 8, fontSize: '0.78rem', color: 'var(--accent2)', cursor: 'pointer' }}
                    onClick={() => onNavigateToRow && onNavigateToRow(bill.subCatKey, bill.monthIdx)}
                  >
                    → View in Expenses
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'log' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button onClick={clearLog} style={{ fontSize: '0.8rem', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Clear Log
            </button>
          </div>
          {changeLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>📋</div>
              <p>No changes recorded yet</p>
              <p style={{ fontSize: '0.8rem' }}>Entries appear here as you add or edit expenses.</p>
            </div>
          ) : (
            <div className="log-list">
              {changeLog.map(e => (
                <div
                  className="log-item"
                  key={e.id ?? `${e.path}-${e.ts}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onNavigateToRow && onNavigateToRow(e.subCatKey || '', e.monthIdx || 0)}
                >
                  <div>
                    <span style={{ marginRight: 8 }}>{e.source === 'bill' ? '📎' : '✏️'}</span>
                    <span className="log-item-msg">
                      {e.path} — {e.month}: {e.oldVal !== undefined && e.oldVal !== null ? `${fmt(e.oldVal)} → ` : ''}<strong>{fmt(e.newVal)}</strong>
                      {e.note ? ` · "${e.note}"` : ''}
                    </span>
                  </div>
                  <span className="log-item-time">{formatTs(e.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
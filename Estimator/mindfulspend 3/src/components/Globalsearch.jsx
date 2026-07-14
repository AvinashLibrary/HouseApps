import { useState, useMemo } from 'react';
import { useApp, MONTHS, getPaymentModeInfo, formatAmount } from '../context/AppContext';

// Global search over the active group's bills — category, note, file name, payment
// mode, month, and amount are all matched against a single free-text query.
// Selecting a result reuses the existing onNavigateToRow convention (same one
// Dashboard/Receipts/Analysis/Calendar already use) to jump into Track Expenses.
export default function GlobalSearch({ onNavigateToRow }) {
  const { activeGroup, billLog } = useApp();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!activeGroup || !q) return [];
    return billLog.filter(b => {
      const mode = getPaymentModeInfo(b.paymentMode);
      const haystack = [
        b.subCatLabel, b.note, b.fileName, b.merchant, mode.label, MONTHS[b.monthIdx], String(b.amount), ...(b.tags || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    }).slice(0, 20);
  }, [q, billLog, activeGroup]);

  if (!activeGroup) return null;

  const handleSelect = (bill) => {
    setQuery('');
    setOpen(false);
    onNavigateToRow && onNavigateToRow(bill.subCatKey, bill.monthIdx);
  };

  return (
    <div className="global-search" style={{ position: 'relative', padding: '0 8px', marginBottom: 12 }}>
      <input
        className="modal-inp"
        style={{ width: '100%' }}
        placeholder="🔍 Search bills…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && q && (
        <div
          style={{
            position: 'absolute', top: '110%', left: 8, right: 8, zIndex: 50,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
            maxHeight: 340, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: 14, fontSize: '0.8rem', color: 'var(--muted)' }}>
              No matches for &quot;{query}&quot;
            </div>
          ) : results.map(bill => {
            const mode = getPaymentModeInfo(bill.paymentMode);
            return (
              <div
                key={bill.id ?? `${bill.fileName}-${bill.ts}`}
                onMouseDown={() => handleSelect(bill)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {bill.merchant ? `${bill.merchant} · ` : ''}{bill.subCatLabel} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· {MONTHS[bill.monthIdx]}</span>
                  </div>
                  {bill.note && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{bill.note}</div>}
                  {bill.tags && bill.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      {bill.tags.map(t => (
                        <span key={t} style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 3, background: 'var(--surface2)', color: 'var(--muted)' }}>#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatAmount(bill.amount, activeGroup.currency)}</div>
                  <div style={{ fontSize: '0.75rem' }} title={mode.label}>{mode.icon}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
import { useState, useRef, useEffect } from 'react';
import { useApp, BUDGET_STRUCTURE, MONTHS, getSubLabel, visibleSubs, getCurrencySymbol, formatAmount, PAYMENT_MODES, DEFAULT_PAYMENT_MODE } from '../context/AppContext';

export default function BillModal({ open, onClose, defaultMonthIdx = 11 }) {
  const { activeGroup, submitBill, showToast } = useApp();
  const [amount, setAmount]     = useState('');
  const [subCatKey, setSubCatKey] = useState('');
  const [monthIdx, setMonthIdx] = useState(defaultMonthIdx);
  const [note, setNote]         = useState('');
  const [fileName, setFileName] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurMonths, setRecurMonths] = useState(3);
  const [paymentMode, setPaymentMode] = useState(DEFAULT_PAYMENT_MODE);
  const fileRef = useRef();

  useEffect(() => {
    if (open) {
      setAmount(''); setNote(''); setFileName('');
      setMonthIdx(defaultMonthIdx);
      setSubCatKey('');
      setIsRecurring(false);
      setRecurMonths(3);
      setPaymentMode(DEFAULT_PAYMENT_MODE);
    }
  }, [open, defaultMonthIdx]);

  if (!open || !activeGroup) return null;

  const isPool = ['travel', 'occasion'].includes(activeGroup.type);
  const currencySymbol = getCurrencySymbol(activeGroup.currency);
  const maxSpan = 12 - monthIdx;

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setFileName(f.name);
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { showToast('⚠ Please enter a valid bill amount'); return; }
    if (!subCatKey) { showToast('⚠ Please select a category'); return; }

    let subCatLabel = subCatKey;
    for (const cat of BUDGET_STRUCTURE)
      for (const sub of cat.subs)
        if (sub.key === subCatKey) subCatLabel = getSubLabel(activeGroup?.type, sub.key, sub.label);

    const effectiveMonthIdx = isPool ? 0 : monthIdx;
    const recurring = (!isPool && isRecurring && recurMonths > 1) ? { months: Math.min(recurMonths, 12 - effectiveMonthIdx) } : null;

    await submitBill(activeGroup.id, {
      fileName: fileName || 'No file selected',
      amount: amt,
      subCatKey,
      subCatLabel,
      monthIdx: effectiveMonthIdx,
      note: note.trim(),
      recurring,
      paymentMode,
    });

    const recurNote = recurring ? ` for ${recurring.months} months` : '';
    showToast(`✓ ${formatAmount(amt, activeGroup.currency)} added to ${subCatLabel}${isPool ? '' : ` · ${MONTHS[monthIdx]}`}${recurNote}`);
    onClose();
  };

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={e => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>📎 Upload Bill</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Bill / Receipt <span>(image, PDF)</span></label>
            <div className="file-zone" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} />
              {fileName ? <div style={{ color: 'var(--accent2)', fontWeight: 500 }}>📄 {fileName}</div>
                        : <div>📄 Click to select a file</div>}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Bill Total ({currencySymbol}) <span>— read from your bill</span></label>
            <input className="modal-inp" type="number" placeholder="e.g. 2500" min="0"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select value={subCatKey} onChange={e => setSubCatKey(e.target.value)}>
              <option value="">Select…</option>
              {BUDGET_STRUCTURE.map(cat => (
                <optgroup label={cat.label} key={cat.key}>
                  {visibleSubs(activeGroup?.type, cat).map(sub => <option key={sub.key} value={sub.key}>{getSubLabel(activeGroup?.type, sub.key, sub.label)}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
              {PAYMENT_MODES.map(p => <option key={p.key} value={p.key}>{p.icon} {p.label}</option>)}
            </select>
          </div>
          {!isPool && (
          <div className="form-group">
            <label className="form-label">Month</label>
            <select value={monthIdx} onChange={e => setMonthIdx(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m} 2026</option>)}
            </select>
          </div>
          )}
          {!isPool && (
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={isRecurring} disabled={maxSpan <= 1}
                onChange={e => setIsRecurring(e.target.checked)} />
              Repeat this expense monthly
            </label>
            {isRecurring && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>For</span>
                <input className="modal-inp" type="number" min="2" max={maxSpan} style={{ width: 70 }}
                  value={recurMonths} onChange={e => setRecurMonths(Math.max(2, Math.min(maxSpan, parseInt(e.target.value) || 2)))} />
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>months, starting {MONTHS[monthIdx]}</span>
              </div>
            )}
            {maxSpan <= 1 && (
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>
                Can't repeat past December — pick an earlier month to enable this.
              </p>
            )}
          </div>
          )}
          <div className="form-group">
            <label className="form-label">Note <span>(optional)</span></label>
            <input className="modal-inp" type="text" placeholder="e.g. Big Bazaar weekly shop"
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Add to Expenses</button>
        </div>
      </div>
    </div>
  );
}
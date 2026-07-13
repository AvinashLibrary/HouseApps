import { useState, useRef, useEffect } from 'react';
import { useApp, BUDGET_STRUCTURE, MONTHS, getSubLabel, visibleSubs } from '../context/AppContext';

export default function BillModal({ open, onClose, defaultMonthIdx = 11 }) {
  const { activeGroup, submitBill, showToast } = useApp();
  const [amount, setAmount]     = useState('');
  const [subCatKey, setSubCatKey] = useState('');
  const [monthIdx, setMonthIdx] = useState(defaultMonthIdx);
  const [note, setNote]         = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (open) {
      setAmount(''); setNote(''); setFileName('');
      setMonthIdx(defaultMonthIdx);
      setSubCatKey('');
    }
  }, [open, defaultMonthIdx]);

  if (!open || !activeGroup) return null;

  const isPool = ['travel', 'occasion'].includes(activeGroup.type);

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

    await submitBill(activeGroup.id, {
      fileName: fileName || 'No file selected',
      amount: amt,
      subCatKey,
      subCatLabel,
      monthIdx: effectiveMonthIdx,
      note: note.trim(),
    });

    showToast(`✓ ₹${amt.toLocaleString('en-IN')} added to ${subCatLabel}${isPool ? '' : ` · ${MONTHS[monthIdx]}`}`);
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
            <label className="form-label">Bill Total (₹) <span>— read from your bill</span></label>
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
          {!isPool && (
          <div className="form-group">
            <label className="form-label">Month</label>
            <select value={monthIdx} onChange={e => setMonthIdx(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m} 2026</option>)}
            </select>
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

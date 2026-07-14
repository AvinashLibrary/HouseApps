import { useState, useRef, useEffect } from 'react';
import { useApp, BUDGET_STRUCTURE, MONTHS, getSubLabel, visibleSubs, getCurrencySymbol, formatAmount, PAYMENT_MODES, DEFAULT_PAYMENT_MODE, normalizeTags } from '../context/AppContext';
import { parseExpenseText } from '../services/expenseParser';

export default function BillModal({ open, onClose, defaultMonthIdx = 11 }) {
  const { activeGroup, submitBill, showToast, billLog } = useApp();
  const [amount, setAmount]     = useState('');
  const [subCatKey, setSubCatKey] = useState('');
  const [monthIdx, setMonthIdx] = useState(defaultMonthIdx);
  const [note, setNote]         = useState('');
  const [fileName, setFileName] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurMonths, setRecurMonths] = useState(3);
  const [paymentMode, setPaymentMode] = useState(DEFAULT_PAYMENT_MODE);
  const [tagsInput, setTagsInput] = useState('');
  const [merchant, setMerchant] = useState('');
  const [aiText, setAiText] = useState('');
  const [showAi, setShowAi] = useState(false);
  const fileRef = useRef();

  // Recently used tags/merchants across this group's bills, for autocomplete
  const recentTags = Array.from(new Set(billLog.flatMap(b => b.tags || []))).slice(0, 20);
  const recentMerchants = Array.from(new Set(billLog.map(b => b.merchant).filter(Boolean))).slice(0, 20);

  useEffect(() => {
    if (open) {
      setAmount(''); setNote(''); setFileName('');
      setMonthIdx(defaultMonthIdx);
      setSubCatKey('');
      setIsRecurring(false);
      setRecurMonths(3);
      setPaymentMode(DEFAULT_PAYMENT_MODE);
      setTagsInput('');
      setMerchant('');
      setAiText('');
      setShowAi(false);
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

  const handleAiParse = () => {
    if (!aiText.trim()) return;
    const parsed = parseExpenseText(aiText);

    // Only accept a parsed category if it's actually a visible sub-category
    // for this group's type — e.g. "investments" is hidden for travel groups.
    const validSubKeys = BUDGET_STRUCTURE.flatMap(cat => visibleSubs(activeGroup?.type, cat).map(s => s.key));
    const categoryFound = parsed.subCatKey && validSubKeys.includes(parsed.subCatKey);

    if (parsed.amount) setAmount(String(parsed.amount));
    if (parsed.merchant) setMerchant(parsed.merchant);
    if (categoryFound) setSubCatKey(parsed.subCatKey);
    if (parsed.paymentMode) setPaymentMode(parsed.paymentMode);
    if (parsed.tags.length > 0) setTagsInput(parsed.tags.join(', '));
    if (parsed.recurring && !isPool) setIsRecurring(true);

    const missing = [];
    if (!parsed.amount) missing.push('amount');
    if (!categoryFound) missing.push('category');
    showToast(missing.length > 0
      ? `✨ Parsed what I could — please fill in ${missing.join(' and ')} below.`
      : '✨ Parsed! Double-check the fields below before saving.');
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
      tags: normalizeTags(tagsInput),
      merchant: merchant.trim(),
    });

    const recurNote = recurring ? ` for ${recurring.months} months` : '';
    const merchantNote = merchant.trim() ? ` at ${merchant.trim()}` : '';
    showToast(`✓ ${formatAmount(amt, activeGroup.currency)}${merchantNote} added to ${subCatLabel}${isPool ? '' : ` · ${MONTHS[monthIdx]}`}${recurNote}`);
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
            <button
              type="button"
              onClick={() => setShowAi(v => !v)}
              style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', color: 'var(--accent2)', fontSize: '0.85rem', width: '100%', textAlign: 'left' }}
            >
              ✨ {showAi ? 'Hide' : 'Try'} AI Entry — describe the expense in your own words
            </button>
            {showAi && (
              <div style={{ marginTop: 10 }}>
                <textarea
                  className="modal-inp"
                  style={{ width: '100%', minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="e.g. ₹450 at Big Bazaar for groceries, paid by UPI"
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: 0 }}>
                    This fills in fields below as a starting draft — always reviewed by you, never saved automatically.
                  </p>
                  <button type="button" className="btn-primary" style={{ padding: '4px 14px', fontSize: '0.82rem' }} onClick={handleAiParse}>
                    Parse
                  </button>
                </div>
              </div>
            )}
          </div>
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
            <label className="form-label">Merchant <span>(optional)</span></label>
            <input className="modal-inp" type="text" list="bill-merchant-suggestions" placeholder="e.g. Big Bazaar"
              value={merchant} onChange={e => setMerchant(e.target.value)} />
            {recentMerchants.length > 0 && (
              <datalist id="bill-merchant-suggestions">
                {recentMerchants.map(m => <option key={m} value={m} />)}
              </datalist>
            )}
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
          <div className="form-group">
            <label className="form-label">Tags <span>(optional, comma-separated)</span></label>
            <input className="modal-inp" type="text" list="bill-tag-suggestions" placeholder="e.g. work, reimbursable"
              value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
            {recentTags.length > 0 && (
              <datalist id="bill-tag-suggestions">
                {recentTags.map(t => <option key={t} value={t} />)}
              </datalist>
            )}
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
import { useState, useRef, useEffect } from 'react';
import { useApp, BUDGET_STRUCTURE, MONTHS, getSubLabel, getDetailItems, visibleSubs, visibleCats, formatAmount } from '../context/AppContext';

const CAT_ICONS   = { needs: '🏠', wants: '🛍', savings: '💰' };
const CAT_ICON_BG = { needs: '#dbeafe', wants: '#fef9c3', savings: '#e0e7ff' };

export default function TrackTab({ onAddExpense, focusSubKey, focusMonthIdx, onFocusHandled }) {
  const { activeGroup, getSubBudget, getSubActualMonth, getActual, setActualValue } = useApp();
  const [monthIdx, setMonthIdx] = useState(11);
  const [collapsed, setCollapsed] = useState({});
  const [catOrder, setCatOrder] = useState(BUDGET_STRUCTURE.map(c => c.key));
  const dragKey = useRef(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const cardRefs = useRef({});

  // Respond to navigation requests from Dashboard/Receipts ("View in Expenses")
  useEffect(() => {
    if (focusSubKey === undefined || focusSubKey === null) return;
    const poolType = activeGroup && ['travel', 'occasion'].includes(activeGroup.type);
    if (focusMonthIdx !== undefined && !poolType) setMonthIdx(focusMonthIdx);
    const cat = BUDGET_STRUCTURE.find(c => c.subs.some(s => s.key === focusSubKey));
    if (cat) {
      setCollapsed(prev => ({ ...prev, [cat.key]: false }));
      setTimeout(() => {
        cardRefs.current[cat.key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
    onFocusHandled && onFocusHandled();
  }, [focusSubKey, focusMonthIdx]); // eslint-disable-line

  if (!activeGroup) return null;

  const fmt = (n) => formatAmount(Math.round(n), activeGroup.currency);
  const fmtDiffAbs = (n) => fmt(Math.abs(n));

  const isPool = ['travel', 'occasion'].includes(activeGroup.type);
  const mi = isPool ? 0 : monthIdx;

  const cats = catOrder
    .map(k => BUDGET_STRUCTURE.find(c => c.key === k))
    .filter(c => c && visibleCats(activeGroup.type).some(vc => vc.key === c.key));

  let monthBudget = 0, monthActual = 0;
  visibleCats(activeGroup.type).forEach(cat => {
    visibleSubs(activeGroup.type, cat).forEach(sub => {
      monthBudget += getSubBudget(activeGroup, cat, sub);
      monthActual += getSubActualMonth(sub.key, mi);
    });
  });
  const net = monthBudget - monthActual;

  const toggleCard = (catKey) => setCollapsed(prev => ({ ...prev, [catKey]: !prev[catKey] }));

  // ── Drag & drop reordering ──────────────────────────────────
  const onDragStart = (catKey) => { dragKey.current = catKey; };
  const onDragOver = (e, catKey) => {
    if (catKey === dragKey.current) return;
    e.preventDefault();
    setDragOverKey(catKey);
  };
  const onDragLeave = () => setDragOverKey(null);
  const onDrop = (e, targetKey) => {
    e.preventDefault();
    setDragOverKey(null);
    if (!dragKey.current || dragKey.current === targetKey) return;
    const order = [...catOrder];
    const from = order.indexOf(dragKey.current);
    const to = order.indexOf(targetKey);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, dragKey.current);
    setCatOrder(order);
    dragKey.current = null;
  };

  const handleItemChange = (item, sub, val) => {
    setActualValue(item.key, mi, val, `${getSubLabel(activeGroup?.type, sub.key, sub.label)} › ${item.label}`);
  };

  return (
    <section className="tab-panel active">
      <div className="tab-toolbar">
        {isPool ? (
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Total Pool Expenses</span>
        ) : (
          <div className="month-picker" style={{ margin: 0 }}>
            <button className="month-arrow" onClick={() => setMonthIdx(i => (i - 1 + 12) % 12)}>‹</button>
            <span style={{ fontWeight: 600 }}>{MONTHS[monthIdx]} 2026</span>
            <button className="month-arrow" onClick={() => setMonthIdx(i => (i + 1) % 12)}>›</button>
          </div>
        )}
        <button className="btn-upload-header" onClick={onAddExpense}>📎 Upload Bill</button>
      </div>

      <div className="summary-row">
        <div className="summary-chip"><span>{isPool ? 'Total' : MONTHS[monthIdx]} Budget:</span><strong>{fmt(monthBudget)}</strong></div>
        <div className="summary-chip"><span>{isPool ? 'Total' : MONTHS[monthIdx]} Spent:</span><strong>{fmt(monthActual)}</strong></div>
        <div className="summary-chip">
          <span>{isPool ? 'Total' : MONTHS[monthIdx]} Remaining:</span>
          <strong style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtDiffAbs(net)}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cats.map(cat => {
          const icon = CAT_ICONS[cat.key] || '📂';
          const iconBg = CAT_ICON_BG[cat.key] || '#f3f4f6';
          const catSpent  = visibleSubs(activeGroup.type, cat).reduce((s, sub) => s + getSubActualMonth(sub.key, mi), 0);
          const catBudget = visibleSubs(activeGroup.type, cat).reduce((s, sub) => s + getSubBudget(activeGroup, cat, sub), 0);
          const isOpen = !collapsed[cat.key];
          const isDragOver = dragOverKey === cat.key;

          return (
            <div
              key={cat.key}
              ref={el => (cardRefs.current[cat.key] = el)}
              className="card"
              style={{ padding: 0, overflow: 'hidden', border: isDragOver ? '1px solid var(--accent)' : undefined }}
              draggable
              onDragStart={() => onDragStart(cat.key)}
              onDragOver={(e) => onDragOver(e, cat.key)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, cat.key)}
            >
              <div
                onClick={() => toggleCard(cat.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px',
                  cursor: 'pointer', borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                }}
              >
                <span style={{ cursor: 'grab', color: 'var(--muted)', fontSize: '1rem' }} onClick={e => e.stopPropagation()}>⠿</span>
                <span style={{ background: iconBg, borderRadius: 6, padding: '3px 7px' }}>{icon}</span>
                <span style={{ fontWeight: 600, flex: 1 }}>{cat.label}</span>
                <span style={{ fontWeight: 600 }}>{catSpent > 0 ? fmt(catSpent) : '—'}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Budget {fmt(catBudget)}</span>
                <span style={{ color: 'var(--muted)' }}>{isOpen ? '▾' : '▸'}</span>
              </div>

              {isOpen && (
                <div style={{ padding: '4px 20px 16px' }}>
                  {visibleSubs(activeGroup?.type, cat).map(sub => {
                    const subBud   = getSubBudget(activeGroup, cat, sub);
                    const subSpent = getSubActualMonth(sub.key, mi);
                    const variance = subBud - subSpent;
                    const varClass = subSpent === 0 ? '' : variance >= 0 ? 'var(--green)' : 'var(--red)';
                    const varText = subSpent === 0 ? '' : (variance >= 0 ? '−' : '+') + fmtDiffAbs(variance).slice(1) + (variance >= 0 ? ' left' : ' over');

                    return (
                      <div key={sub.key} style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{getSubLabel(activeGroup?.type, sub.key, sub.label)}</div>
                          <div style={{ fontSize: '0.82rem' }}>
                            <span style={{ fontWeight: 600 }}>{subSpent > 0 ? fmt(subSpent) : '—'}</span>
                            <span style={{ color: 'var(--muted)' }}> / {fmt(subBud)}</span>
                            {varText && <span style={{ color: varClass, marginLeft: 8, fontWeight: 600 }}>{varText}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {getDetailItems(activeGroup?.type, sub.key).map(item => {
                            const v = getActual(item.key, mi);
                            return (
                              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--muted)' }}>{item.label}</div>
                                <input
                                  type="number"
                                  className="modal-inp"
                                  style={{ width: 120, fontSize: '0.85rem' }}
                                  value={v || ''}
                                  placeholder="0"
                                  onChange={e => handleItemChange(item, sub, e.target.value)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
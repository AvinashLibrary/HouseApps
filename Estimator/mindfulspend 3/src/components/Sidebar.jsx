import { useApp, BUDGET_STRUCTURE, MONTHS } from '../context/AppContext';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'track',     icon: '✎', label: 'Track Expenses' },
  { id: 'budget',    icon: '◈', label: 'Budget & Income' },
  { id: 'analysis',  icon: '⌁', label: 'Analysis' },
  { id: 'receipts',  icon: '📎', label: 'Receipts & Log' },
];

export default function Sidebar({ activeTab, onTabChange, onChangeGroup }) {
  const { activeGroup, billLog, getSubActualMonth, getSubBudget } = useApp();

  const emptyMonths = MONTHS.filter((_, i) =>
    !BUDGET_STRUCTURE.some(cat => cat.subs.some(sub => getSubActualMonth(sub.key, i) > 0))
  ).length;

  let overCount = 0;
  if (activeGroup) {
    BUDGET_STRUCTURE.forEach(cat => cat.subs.forEach(sub => {
      const totalActual = MONTHS.reduce((s, _, mi) => s + getSubActualMonth(sub.key, mi), 0);
      const annualBudget = getSubBudget(activeGroup, cat, sub) * 12;
      if (totalActual > annualBudget) overCount++;
    }));
  }

  const badges = {
    track:    emptyMonths > 0 ? `${emptyMonths} empty` : '',
    analysis: overCount > 0 ? String(overCount) : '',
    receipts: billLog.length > 0 ? `${billLog.length} bill${billLog.length > 1 ? 's' : ''}` : '',
  };
  const badgeClass = { track: 'badge-amber', analysis: 'badge-red', receipts: 'badge-blue' };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">M</div>
        <div className="brand-text">
          <div className="brand-name">MindfulSpend</div>
          <div className="brand-tagline">Intentional Finance</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {badges[item.id] && (
              <span className={`tab-badge ${badgeClass[item.id]}`}>{badges[item.id]}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={onChangeGroup} style={{ width: '100%' }}>
          <span className="nav-icon">⇄</span>
          <span>Change Group</span>
        </button>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', padding: '4px 8px' }}>
          {activeGroup?.name}
        </div>
      </div>
    </aside>
  );
}

import '../styles/HubTopNav.css';

/**
 * HubTopNav — sticky top navigation bar for the Hub screen.
 * - Zero groups  → shows app name (you're on the landing/onboarding screen)
 * - Has groups   → shows "Household Groups" (you're managing your list)
 * Inside a group, AppView's Sidebar takes over — this component isn't rendered.
 */
export default function HubTopNav({ hasGroups, onNewGroup, onViewChange, onLogout }) {
  const label = hasGroups ? 'MindfulSpend' : 'HouseApps Fiscal';
  return (
    <header className="htn-root">
      <div className="htn-inner">
        <div className="htn-brand">
          <span className="htn-brand-icon" aria-hidden="true">
            {/* people / household icon */}
            {/* <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7.5" cy="6" r="2.5" fill="currentColor" />
              <path d="M2 15.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <circle cx="14" cy="5.5" r="2" fill="currentColor" opacity="0.6" />
              <path d="M16 14.5c0-2.5-1.8-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
            </svg> */}
            <div className="brand-icon">M</div>
          </span>
          <span className="htn-brand-name">{label}</span>
        </div>

        <div className="htn-actions">
          <button className="htn-btn-new" onClick={onNewGroup}>
            <span className="htn-plus">+</span>
            New Group
          </button>
          <button className="htn-btn-icon" onClick={onViewChange} title="Toggle view" aria-label="Toggle view">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="1" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          {onLogout && (
            <button className="htn-btn-icon" onClick={onLogout} title="Sign out" aria-label="Sign out">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 9h8M12 6l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 3H4a1 1 0 00-1 1v10a1 1 0 001 1h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

import '../styles/GroupCard.css';

export default function GroupCard({ group, onOpen, onEdit, onDelete }) {
  const memberCount = group.members?.length ?? 0;

  const netTotal = (group.members ?? []).reduce((s, m) => {
    const gross = parseFloat(m.salary) || 0;
    const ded   = parseFloat(m.familyDeduction) || 0;
    return s + Math.max(0, gross - ded);
  }, 0);

  return (
    <div className="gc-card">
      {/* Top: icon + active badge */}
      <div className="gc-top">
        <div className="gc-icon">🏠</div>
        <span className="gc-badge">ACTIVE</span>
      </div>

      {/* Name + member count */}
      <div className="gc-name">{group.name}</div>
      <div className="gc-members">{memberCount} Member{memberCount !== 1 ? 's' : ''}</div>

      <div className="gc-divider" />

      {/* Bottom: savings + actions */}
      <div className="gc-bottom">
        <div>
          <div className="gc-savings-label">TOTAL SAVINGS</div>
          <div className="gc-savings-val">
            ₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="gc-actions" onClick={e => e.stopPropagation()}>
          <button className="gc-open-btn" onClick={() => onOpen(group.id)}>Open</button>
          <div className="gc-context">
            <button className="gc-ctx-btn" onClick={() => onEdit(group)} title="Edit">✎</button>
            <button className="gc-ctx-btn gc-ctx-danger" onClick={() => onDelete(group)} title="Delete">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

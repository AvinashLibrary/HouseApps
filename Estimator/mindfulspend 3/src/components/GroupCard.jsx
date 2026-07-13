import '../styles/GroupCard.css';
import { GROUP_TYPES, getStatusInfo, formatAmount } from '../context/AppContext';

export default function GroupCard({ group, onOpen, onEdit, onDelete }) {
  const memberCount = group.members?.length ?? 0;
  const groupType = GROUP_TYPES.find(gt => gt.key === (group.type ?? 'household')) ?? GROUP_TYPES[0];
  const statusInfo = getStatusInfo(group.status);

  const netTotal = (group.members ?? []).reduce((s, m) => {
    const gross = parseFloat(m.salary) || 0;
    const ded   = parseFloat(m.familyDeduction) || 0;
    return s + Math.max(0, gross - ded);
  }, 0);

  return (
    <div className={`gc-card${group.status === 'archived' ? ' gc-archived' : ''}`}
      style={group.status === 'archived' ? { opacity: 0.6 } : undefined}>
      {/* Top: icon + status badge */}
      <div className="gc-top">
        <div className="gc-icon">{groupType.icon}</div>
        <span className="gc-badge" style={{ background: statusInfo.color }}>{statusInfo.label.toUpperCase()}</span>
      </div>

      {/* Name + type + member count */}
      <div className="gc-name">{group.name}</div>
      <div className="gc-members">
        <span className="gc-type-label">{groupType.label}</span>
        <span className="gc-dot">·</span>
        {memberCount} Member{memberCount !== 1 ? 's' : ''}
      </div>

      <div className="gc-divider" />

      {/* Bottom: savings + actions */}
      <div className="gc-bottom">
        <div>
          <div className="gc-savings-label">TOTAL SAVINGS</div>
          <div className="gc-savings-val">
            {formatAmount(netTotal, group.currency)}
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
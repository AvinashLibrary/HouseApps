import { useState } from 'react';
import { useApp } from '../context/AppContext';
import GroupEditor from './GroupEditor';

export default function HubView({ onOpenGroup }) {
  const { groups, deleteGroup, showToast } = useApp();
  // createGroup/updateGroupLocal are passed down to GroupEditor via onDone
  const [showEditor, setShowEditor] = useState(false);
  const [editGroup, setEditGroup] = useState(null);

  const handleNew = () => { setEditGroup(null); setShowEditor(true); };
  const handleEdit = (g) => { setEditGroup(g); setShowEditor(true); };
  const handleDone = (g) => { setShowEditor(false); setEditGroup(null); };
  const handleCancel = () => { setShowEditor(false); setEditGroup(null); };

  const handleDelete = (g) => {
    if (window.confirm(`Delete "${g.name}"? This cannot be undone.`)) {
      deleteGroup(g.id);
      showToast('Group deleted.');
    }
  };

  return (
    <div className="hub-wrap">
      <div className="hub-header">
        <div>
          <h2>Household Groups</h2>
          <p>Select a group to open the calculator, or create a new one.</p>
        </div>
        <button className="btn-primary" onClick={handleNew}>+ New Group</button>
      </div>

      {showEditor && (
        <GroupEditor editGroup={editGroup} onDone={handleDone} onCancel={handleCancel} />
      )}

      {groups.length === 0 && !showEditor && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏠</div>
          <p>No groups yet. Create your first household group to get started.</p>
        </div>
      )}

      <div className="group-grid">
        {groups.map(g => {
          const netTotal = (g.members ?? []).reduce((s, m) => {
            const gross = parseFloat(m.salary) || 0;
            const ded   = parseFloat(m.familyDeduction) || 0;
            return s + Math.max(0, gross - ded);
          }, 0);
          return (
            <div key={g.id} className="group-card" onClick={() => onOpenGroup(g.id)}>
              <div className="group-card-name">{g.name}</div>
              <div style={{ display: 'flex', gap: 4, margin: '8px 0' }}>
                {(g.members ?? []).map(m => (
                  <div key={m.id} title={m.name} style={{
                    width: 26, height: 26, borderRadius: '50%', background: m.color || '#818cf8',
                    color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {(m.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                ))}
              </div>
              <div className="group-card-meta">
                {g.members?.length ?? 0} member{g.members?.length !== 1 ? 's' : ''} ·{' '}
                Net ₹{netTotal.toLocaleString('en-IN')}/mo
              </div>
              <div className="group-card-actions" onClick={e => e.stopPropagation()}>
                <button className="btn-sm" onClick={() => handleEdit(g)}>✎ Edit</button>
                <button className="btn-sm btn-sm-danger" onClick={() => handleDelete(g)}>✕ Delete</button>
                <button className="btn-sm btn-primary" style={{ marginLeft: 'auto' }} onClick={() => onOpenGroup(g.id)}>Open →</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

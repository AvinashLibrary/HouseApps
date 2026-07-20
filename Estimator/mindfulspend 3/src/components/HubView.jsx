import { useState } from 'react';
import { useApp } from '../context/AppContext';
import GroupEditor from './GroupEditor';
import EmptyHubState from './EmptyState';
import GroupCard from './GroupCard';
import HubTopNav from './HubTopNav';

export default function HubView({ onOpenGroup }) {
  const { groups, deleteGroup, showToast } = useApp();
  const [showEditor, setShowEditor] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = groups.filter(g => g.status === 'archived').length;
  const visibleGroups = showArchived ? groups : groups.filter(g => g.status !== 'archived');

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

  const isEmpty = groups.length === 0 && !showEditor;
  const allHiddenByFilter = !isEmpty && visibleGroups.length === 0 && !showEditor;

  return (
    <>
      <HubTopNav hasGroups={groups.length > 0} onNewGroup={handleNew} />
      <div className="hub-wrap">
      {!isEmpty && (
        <div className="hub-header">
          <div>
            <h2>Household Groups</h2>
            <p>Select a group to open the calculator, or create a new one.</p>
          </div>
          {archivedCount > 0 && (
            <button className="btn-auto-all" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
            </button>
          )}
        </div>
      )}

      {showEditor && (
        <GroupEditor editGroup={editGroup} onDone={handleDone} onCancel={handleCancel} />
      )}

      {isEmpty && (
        <EmptyHubState onCreateGroup={handleNew} />
      )}

      {allHiddenByFilter && (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          All your groups are archived. <button className="btn-auto-all" onClick={() => setShowArchived(true)}>Show archived</button> to view them.
        </p>
      )}

{!showEditor && visibleGroups.length > 0 && (
      <div  className="group-grid">
        {visibleGroups.map(g => (
          <GroupCard
            key={g.id}
            group={g}
            onOpen={onOpenGroup}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        
      </div>
       )}
    </div>
    </>
  );
}
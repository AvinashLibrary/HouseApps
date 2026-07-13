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
        </div>
      )}

      {showEditor && (
        <GroupEditor editGroup={editGroup} onDone={handleDone} onCancel={handleCancel} />
      )}

      {isEmpty && (
        <EmptyHubState onCreateGroup={handleNew} />
      )}

{!showEditor && (
      <div  className="group-grid">
        {groups.map(g => (
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

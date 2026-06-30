import { useEffect } from 'react';
import { useApp } from './context/AppContext';
import HubView from './components/HubView';
import AppView from './components/AppView';
import Toast from './components/Toast';

export default function App() {
  const { activeGroupId, setActiveGroupId, loadGroups, loadGroupData } = useApp();

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleOpenGroup = async (id) => {
    setActiveGroupId(id);
    await loadGroupData(id);
  };

  return (
    <>
      {activeGroupId ? (
        <AppView onChangeGroup={() => setActiveGroupId(null)} />
      ) : (
        <HubView onOpenGroup={handleOpenGroup} />
      )}
      <Toast />
    </>
  );
}

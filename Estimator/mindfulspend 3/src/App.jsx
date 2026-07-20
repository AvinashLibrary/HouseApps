import { useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import HubView from './components/HubView';
import AppView from './components/AppView';
import AuthPage from './components/AuthPage';
import Toast from './components/Toast';

export default function App() {
  const { activeGroupId, setActiveGroupId, loadGroups, loadGroupData } = useApp();
  const { user, ready, logout } = useAuth();

  useEffect(() => {
    if (user) loadGroups();
  }, [user, loadGroups]);

  if (!ready) return null; // waiting for token check — avoid flash

  if (!user) return <AuthPage />;

  const handleOpenGroup = async (id) => {
    setActiveGroupId(id);
    await loadGroupData(id);
  };

  return (
    <>
      {activeGroupId ? (
        <AppView onChangeGroup={() => setActiveGroupId(null)} onLogout={logout} />
      ) : (
        <HubView onOpenGroup={handleOpenGroup} onLogout={logout} />
      )}
      <Toast />
    </>
  );
}

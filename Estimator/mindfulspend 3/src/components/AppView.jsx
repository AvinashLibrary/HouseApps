import { useState } from 'react';
import Sidebar from './Sidebar';
import DashboardTab from './DashboardTab';
import TrackTab from './TrackTab';
import BudgetTab from './BudgetTab';
import AnalysisTab from './AnalysisTab';
import ReceiptsTab from './ReceiptsTab';
import BillModal from './BillModal';

export default function AppView({ onChangeGroup }) {
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [modalOpen, setModalOpen]     = useState(false);
  const [modalMonthIdx, setModalMonthIdx] = useState(11);
  const [navTarget, setNavTarget]     = useState({ subKey: null, monthIdx: undefined, nonce: 0 });

  const openModal = (monthIdx = 11) => { setModalMonthIdx(monthIdx); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  // Used by Dashboard/Receipts/Analysis to jump into Track tab at a specific row/month
  const navigateToRow = (subKey, monthIdx) => {
    setNavTarget({ subKey, monthIdx, nonce: Date.now() });
    setActiveTab('track');
  };

  const clearNavTarget = () => setNavTarget(prev => ({ ...prev, subKey: null }));

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab onAddExpense={() => openModal()} onNavigateToRow={navigateToRow} />;
      case 'track':
        return (
          <TrackTab
            onAddExpense={() => openModal()}
            focusSubKey={navTarget.nonce ? navTarget.subKey : undefined}
            focusMonthIdx={navTarget.monthIdx}
            onFocusHandled={clearNavTarget}
          />
        );
      case 'budget':
        return <BudgetTab />;
      case 'analysis':
        return <AnalysisTab onNavigateToRow={navigateToRow} />;
      case 'receipts':
        return <ReceiptsTab onAddExpense={() => openModal()} onNavigateToRow={navigateToRow} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onChangeGroup={onChangeGroup} />
      <main className="app-main">
        {renderTab()}
      </main>
      <BillModal open={modalOpen} onClose={closeModal} defaultMonthIdx={modalMonthIdx} />
    </div>
  );
}

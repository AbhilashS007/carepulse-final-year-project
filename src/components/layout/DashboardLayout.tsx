import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Outlet, useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/patients': 'Patient Management',
  '/alerts': 'Alert Center',
  '/analytics': 'Analytics & Reports',
  '/ai-insights': 'AI Insights',
};

export default function DashboardLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'CarePulse';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-gradient-mesh">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

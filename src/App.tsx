import { DataProvider, useAuth } from './store';
import Login from './components/Login';
import MainLayout from './components/MainLayout';
import LockScreen from './components/LockScreen';
import { ToastContainer } from './components/Toast';

function AppContent() {
  const { user, isExpired } = useAuth();
  
  if (!user) return <Login />;
  if (isExpired) return <LockScreen />;
  
  return <MainLayout />;
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
      <ToastContainer />
    </DataProvider>
  );
}

import { DataProvider, useAuth } from './store';
import Login from './components/Login';
import MainLayout from './components/MainLayout';
import { ToastContainer } from './components/Toast';

function AppContent() {
  const { user } = useAuth();
  return user ? <MainLayout /> : <Login />;
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
      <ToastContainer />
    </DataProvider>
  );
}

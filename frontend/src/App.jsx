import DataProvider from './context/DataContext.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  return (
    <DataProvider>
      <Dashboard />
    </DataProvider>
  );
}

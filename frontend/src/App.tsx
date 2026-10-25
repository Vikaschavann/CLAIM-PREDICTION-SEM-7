import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';
import History from './pages/History';
import RiskProfiles from './pages/RiskProfiles';
import Explainability from './pages/Explainability';
import ModelPerformance from './pages/ModelPerformance';
import DataExplorer from './pages/DataExplorer';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-full min-h-screen bg-content-bg">
        <Sidebar />
        {/* Main content offset by sidebar width (w-52 = 208px) */}
        <main className="flex-1 ml-52 min-h-screen">
          <div className="max-w-[1200px] mx-auto p-6">
            <Routes>
              <Route path="/"               element={<Dashboard />} />
              <Route path="/predict"        element={<Predict />} />
              <Route path="/history"        element={<History />} />
              <Route path="/profiles"       element={<RiskProfiles />} />
              <Route path="/explainability" element={<Explainability />} />
              <Route path="/performance"    element={<ModelPerformance />} />
              <Route path="/explorer"       element={<DataExplorer />} />
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

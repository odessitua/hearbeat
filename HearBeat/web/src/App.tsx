import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { CheckInPage } from './pages/CheckInPage';
import { DashboardPage } from './pages/DashboardPage';
import { MlDemoPage } from './pages/MlDemoPage';

import './index.css';

function Nav() {
  const location = useLocation();
  return (
    <nav className="top-nav">
      <span className="nav-brand">HearBeat</span>
      <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
        Dashboard
      </Link>
      <Link to="/check-in" className={location.pathname === '/check-in' ? 'active' : ''}>
        Чек-ін
      </Link>
      <Link to="/ml-demo" className={location.pathname === '/ml-demo' ? 'active' : ''}>
        ML-тест
      </Link>
    </nav>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/check-in" element={<CheckInPage />} />
        <Route path="/ml-demo" element={<MlDemoPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

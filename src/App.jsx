import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/layout/AppShell';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Coach from './pages/Coach';
import History from './pages/History';

/* =============================================================================
 * App — providers + routing.
 * HashRouter is used so the app deploys to any static host with zero server
 * rewrite config (swap to BrowserRouter if you add SPA fallback rewrites).
 * ===========================================================================*/
export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <ScrollToTop />
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </ThemeProvider>
  );
}

import { HashRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import { Dashboard } from './Dashboard';
import { EditorApp } from './EditorApp';
import { ClientApp } from './ClientApp';

export function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor" element={<EditorApp />} />
          <Route path="/review" element={<ClientApp />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}

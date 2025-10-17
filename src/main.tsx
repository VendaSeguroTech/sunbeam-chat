import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from '@/components/theme-provider.tsx'
import { MaintenanceProvider } from './contexts/MaintenanceContext.tsx'

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <MaintenanceProvider>
      <App />
    </MaintenanceProvider>
  </ThemeProvider>
);

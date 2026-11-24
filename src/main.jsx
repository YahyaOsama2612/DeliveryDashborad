import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.jsx';

const colorSchemePreference = window.matchMedia('(prefers-color-scheme: dark)');
const applyColorScheme = ({ matches }) => {
  document.documentElement.classList.toggle('dark', matches);
  document.documentElement.style.colorScheme = matches ? 'dark' : 'light';
};

applyColorScheme(colorSchemePreference);
colorSchemePreference.addEventListener('change', applyColorScheme);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

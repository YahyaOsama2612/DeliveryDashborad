import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import router from './routes/router';
import AppErrorBoundary from './components/shared/AppErrorBoundary';
import './App.css';

function App() {
  return (
    <>
      <AppErrorBoundary>
        <RouterProvider router={router} />
      </AppErrorBoundary>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;

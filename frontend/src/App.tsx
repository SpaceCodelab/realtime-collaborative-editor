import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EditorPage } from './EditorPage';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  console.log('App component rendering');
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/doc/:docId" element={<EditorPage />} />
          <Route path="/" element={<Navigate to="/doc/new" replace />} />
          <Route path="*" element={<Navigate to="/doc/new" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;


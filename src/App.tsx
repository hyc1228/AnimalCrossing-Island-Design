import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import GalleryPage from './pages/GalleryPage';
import RecognizePage from './pages/RecognizePage';
import InspirationsPage from './pages/InspirationsPage';
import ImportHidPage from './pages/ImportHidPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/editor/:id" element={<EditorPage />} />
      <Route path="/gallery" element={<GalleryPage />} />
      <Route path="/recognize" element={<RecognizePage />} />
      <Route path="/inspirations" element={<InspirationsPage />} />
      <Route path="/import-hid" element={<ImportHidPage />} />
    </Routes>
  );
}

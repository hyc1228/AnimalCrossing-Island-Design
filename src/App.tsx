import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import GalleryPage from './pages/GalleryPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/editor/:id" element={<EditorPage />} />
      <Route path="/gallery" element={<GalleryPage />} />
    </Routes>
  );
}

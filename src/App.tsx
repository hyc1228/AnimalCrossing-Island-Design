import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';

// HomePage is the initial route and stays in the main bundle so the first
// paint is instant. Every other page is heavy (konva, three.js, recognition
// LLM clients, HID decoder) and gets lazy-loaded on demand.
const EditorPage = lazy(() => import('./pages/EditorPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const RecognizePage = lazy(() => import('./pages/RecognizePage'));
const GeneratePage = lazy(() => import('./pages/GeneratePage'));
const InspirationsPage = lazy(() => import('./pages/InspirationsPage'));
const ImportHidPage = lazy(() => import('./pages/ImportHidPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen grid place-items-center bg-cream-50">
      <div className="flex flex-col items-center gap-3 text-leaf-700">
        <div className="w-10 h-10 rounded-full border-4 border-mint-500/30 border-t-mint-500 animate-spin" />
        <div className="text-sm font-semibold">Loading…</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/recognize" element={<RecognizePage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/inspirations" element={<InspirationsPage />} />
        <Route path="/import-hid" element={<ImportHidPage />} />
      </Routes>
    </Suspense>
  );
}

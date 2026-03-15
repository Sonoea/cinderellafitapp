import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Measure from './pages/Measure';
// import Closet from './pages/Closet'; // Convert to lazy
import Shop from './pages/Shop';
import Legal from './pages/Legal';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Guide from './pages/Guide';
import Gallery from './pages/Gallery';
import UserProfile from './pages/UserProfile';
import MapGallery from './pages/MapGallery';

// Lazy load Closet to prevent circular dependency/initialization issues
const Closet = lazy(() => import('./pages/Closet'));

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <div className="container">
            <main className="p-4">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Home />} />
                <Route path="/measure" element={<Measure />} />
                <Route path="/closet" element={
                  <ErrorBoundary>
                    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                      <Closet />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/gallery" element={
                  <ErrorBoundary>
                    <Gallery />
                  </ErrorBoundary>
                } />
                <Route path="/map" element={
                  <ErrorBoundary>
                    <MapGallery />
                  </ErrorBoundary>
                } />
                <Route path="/gallery/:profileSlug" element={
                  <ErrorBoundary>
                    <UserProfile />
                  </ErrorBoundary>
                } />
                <Route path="/shop" element={<Shop />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<Guide />} />
              </Routes>
            </main>
            <BottomNav />
          </div>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;

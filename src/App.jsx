import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
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
import MyPlushies from './pages/MyPlushies';
import UserProfile from './pages/UserProfile';
import Lookbook from './pages/Lookbook';
import Notifications from './pages/Notifications';
// import MapGallery from './pages/MapGallery';

// Lazy load Closet to prevent circular dependency/initialization issues
const Closet = lazy(() => import('./pages/Closet'));

const LoadingFallback = () => {
  const { t } = useApp();
  return <div className="p-10 text-center">{t('loading')}</div>;
};

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
                <Route path="/plushies" element={
                  <ErrorBoundary>
                    <MyPlushies />
                  </ErrorBoundary>
                } />
                <Route path="/closet" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <Closet />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/gallery" element={
                  <ErrorBoundary>
                    <Gallery />
                  </ErrorBoundary>
                } />
                {/*
                <Route path="/map" element={
                  <ErrorBoundary>
                    <MapGallery />
                  </ErrorBoundary>
                } />
                */}

                <Route path="/gallery/:profileSlug" element={
                  <ErrorBoundary>
                    <UserProfile />
                  </ErrorBoundary>
                } />
                <Route path="/gallery/post/:postId" element={
                  <ErrorBoundary>
                    <Gallery />
                  </ErrorBoundary>
                } />
                <Route path="/shop" element={<Shop />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<Guide />} />
                <Route path="/lookbook/:patternId" element={
                  <ErrorBoundary>
                    <Lookbook />
                  </ErrorBoundary>
                } />
                <Route path="/notifications" element={
                  <ErrorBoundary>
                    <Notifications />
                  </ErrorBoundary>
                } />
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

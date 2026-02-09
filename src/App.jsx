import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Measure from './pages/Measure';
import Closet from './pages/Closet';
import Shop from './pages/Shop';
import Legal from './pages/Legal';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Guide from './pages/Guide';

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
                <Route path="/closet" element={<Closet />} />
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

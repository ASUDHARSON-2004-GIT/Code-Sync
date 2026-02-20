import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-background text-white">Loading...</div>;
    // Save where the user was trying to go so we can redirect back after login
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    return children;
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="min-h-screen bg-background text-foreground font-sans">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/room/:roomId"
                            element={
                                <ProtectedRoute>
                                    <EditorPage />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </div>
            </AuthProvider>
        </Router>
    )
}

export default App

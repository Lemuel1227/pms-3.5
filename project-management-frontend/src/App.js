import React from 'react';
import './App.css';
import LoginPage from './components/login/LoginPage';
import RegisterPage from './components/register/RegisterPage';
import Dashboard from './components/Dashboard/Dashboard'; // Updated Path
import ProjectTable from './components/Dashboard/ProjectsTable'; // New Import
import TaskTable from './components/Dashboard/TasksTable';     // New Import
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Define API Base URL (Replace with your actual backend URL)
export const API_BASE_URL = 'http://localhost:8000/api'; // Or your production URL

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            >
              {/* Nested Routes within Dashboard */}
              <Route index element={<Navigate to="projects" replace />} /> {/* Default to projects */}
              <Route path="projects" element={<ProjectTable />} />
              <Route path="tasks" element={<TaskTable />} />
              {/* Add more nested routes here as needed */}
            </Route>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} /> {/* Catch-all */}
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}


function PrivateRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    // You might want a better loading indicator
    return <div className="container mt-5 text-center">Loading Authentication...</div>;
  }

  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default App;
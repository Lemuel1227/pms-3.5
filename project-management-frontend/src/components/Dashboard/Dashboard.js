import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 

function Dashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
    };

    return (
        <div>
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
                <div className="container-fluid">
                    <Link className="navbar-brand" to="/dashboard">Klick Inc. PMS</Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#dashboardNavbar" aria-controls="dashboardNavbar" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="dashboardNavbar">
                        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                            <li className="nav-item">
                                <Link className="nav-link" to="projects">Projects</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="tasks">Tasks</Link>
                            </li>
                        </ul>
                        <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
                    </div>
                </div>
            </nav>

            <div className="container mt-4">
                <Outlet />
            </div>
        </div>
    );
}

export default Dashboard;
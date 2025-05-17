import React, { useState, useEffect, useCallback } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../App';
import { Navbar, Nav, NavDropdown, Button, Badge } from 'react-bootstrap';

function Dashboard() {
    const { token, logout } = useAuth();
    const [notifications, setNotifications] = useState({
        invitations: [],
        taskAssignments: [],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [invitationsResponse, tasksResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/invitations`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                }),
                fetch(`${API_BASE_URL}/task-notifications`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                }),
            ]);

            const invitationsData = await invitationsResponse.json();
            const tasksData = await tasksResponse.json();

            if (!invitationsResponse.ok) {
                throw new Error(invitationsData.message || `Invitations fetch failed: ${invitationsResponse.status}`);
            }
            if (!tasksResponse.ok) {
                throw new Error(tasksData.message || `Task notifications fetch failed: ${tasksResponse.status}`);
            }

            setNotifications({
                invitations: invitationsData,
                taskAssignments: tasksData,
            });
            console.log('Dashboard: Fetched notifications:', { invitations: invitationsData, taskAssignments: tasksData }); // Debug
        } catch (e) {
            console.error('Dashboard: Failed to fetch notifications:', e);
            setError(`Failed to load notifications: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 60000); // Refresh every minute
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    const handleAcceptInvitation = async (projectId, teamMemberId) => {
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/team/${teamMemberId}/accept`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            console.log('Dashboard: Accepted invitation:', { projectId, teamMemberId }); // Debug
            fetchNotifications();
        } catch (e) {
            console.error('Dashboard: Failed to accept invitation:', e);
            setError(`Failed to accept invitation: ${e.message}`);
        }
    };

    const handleAcknowledgeTask = async (taskId) => {
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/acknowledge`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            console.log('Dashboard: Acknowledged task:', taskId); // Debug
            fetchNotifications();
        } catch (e) {
            console.error('Dashboard: Failed to acknowledge task:', e);
            setError(`Failed to acknowledge task: ${e.message}`);
        }
    };

    const handleLogout = () => {
        logout();
    };

    const totalNotifications = notifications.invitations.length + notifications.taskAssignments.length;

    return (
        <div>
            <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
                <div className="container-fluid">
                    <Navbar.Brand as={Link} to="/dashboard">
                        Klick Inc. PMS
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="dashboardNavbar" />
                    <Navbar.Collapse id="dashboardNavbar">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to="projects">
                                Projects
                            </Nav.Link>
                            <Nav.Link as={Link} to="tasks">
                                Tasks
                            </Nav.Link>
                        </Nav>
                        <Nav>
                            <NavDropdown
                                title={
                                    <span>
                                        Notifications{' '}
                                        {totalNotifications > 0 && (
                                            <Badge bg="danger">{totalNotifications}</Badge>
                                        )}
                                    </span>
                                }
                                id="notifications-dropdown"
                            >
                                {loading && (
                                    <NavDropdown.Item disabled>Loading...</NavDropdown.Item>
                                )}
                                {error && (
                                    <NavDropdown.Item className="text-danger">
                                        {error}
                                    </NavDropdown.Item>
                                )}
                                {!loading && !error && totalNotifications === 0 && (
                                    <NavDropdown.Item>No pending notifications</NavDropdown.Item>
                                )}
                                {!loading && !error && notifications.invitations.length > 0 && (
                                    <>
                                        <NavDropdown.Header>Project Invitations</NavDropdown.Header>
                                        {notifications.invitations.map(invitation => (
                                            <NavDropdown.Item
                                                key={`invitation-${invitation.id}`}
                                                className="d-flex align-items-center"
                                            >
                                                <div className="flex-grow-1">
                                                    <strong>{invitation.project.name}</strong>
                                                    <br />
                                                    <small>
                                                        Invited by:{' '}
                                                        {invitation.invited_by_user?.name || 'Unknown'}
                                                    </small>
                                                </div>
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleAcceptInvitation(
                                                            invitation.project_id,
                                                            invitation.id
                                                        )
                                                    }
                                                >
                                                    Accept
                                                </Button>
                                            </NavDropdown.Item>
                                        ))}
                                    </>
                                )}
                                {!loading && !error && notifications.taskAssignments.length > 0 && (
                                    <>
                                        <NavDropdown.Header>Task Assignments</NavDropdown.Header>
                                        {notifications.taskAssignments.map(task => (
                                            <NavDropdown.Item
                                                key={`task-${task.id}`}
                                                className="d-flex align-items-center"
                                            >
                                                <div className="flex-grow-1">
                                                    <strong>{task.title}</strong>
                                                    <br />
                                                    <small>
                                                        Project: {task.project?.name || 'Unknown'}<br />
                                                        Assigned by: {task.owner?.name || 'Unknown'}
                                                    </small>
                                                </div>
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleAcknowledgeTask(task.id)}
                                                >
                                                    Acknowledge
                                                </Button>
                                            </NavDropdown.Item>
                                        ))}
                                    </>
                                )}
                            </NavDropdown>
                            <Button
                                variant="outline-light"
                                className="ms-2"
                                onClick={handleLogout}
                            >
                                Logout
                            </Button>
                        </Nav>
                    </Navbar.Collapse>
                </div>
            </Navbar>

            <div className="container mt-4">
                <Outlet />
            </div>
        </div>
    );
}

export default Dashboard;
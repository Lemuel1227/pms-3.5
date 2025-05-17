import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../App';
import { Modal, Button, Form, Nav, Tab, Alert } from 'react-bootstrap';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import TeamMembers from './TeamMembers';
import Budgets from './Budgets';

function ProjectTable() {
    const { token } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showTasksModal, setShowTasksModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);
    const [projectTasks, setProjectTasks] = useState([]);
    const [projectBudgets, setProjectBudgets] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksError, setTasksError] = useState(null);
    const [statusPreview, setStatusPreview] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'Not Started',
        budget: '',
    });

    const projectStatuses = ['Not Started', 'In Progress', 'On Hold', 'Completed'];

    const fetchUser = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });
            if (!response.ok) throw new Error('Failed to fetch user');
            const data = await response.json();
            setUser(data);
        } catch (e) {
            console.error('Failed to fetch user:', e);
        }
    }, [token]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/projects`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProjects(data);
        } catch (e) {
            console.error("Failed to fetch projects:", e);
            setError('Failed to load projects. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchProjectTasks = useCallback(async (projectId) => {
        setTasksLoading(true);
        setTasksError(null);
        try {
            const [tasksResponse, budgetsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                }),
                fetch(`${API_BASE_URL}/projects/${projectId}/budgets`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                }),
            ]);

            const tasksData = await tasksResponse.json();
            const budgetsData = await budgetsResponse.json();

            if (!tasksResponse.ok) {
                throw new Error(tasksData.message || `Tasks fetch failed: ${tasksResponse.status}`);
            }
            if (!budgetsResponse.ok) {
                throw new Error(budgetsData.message || `Budgets fetch failed: ${budgetsResponse.status}`);
            }

            setProjectTasks(tasksData);
            setProjectBudgets(budgetsData);
        } catch (e) {
            console.error("Failed to fetch project tasks or budgets:", e);
            setTasksError(`Failed to load tasks or budgets: ${e.message}`);
        } finally {
            setTasksLoading(false);
        }
    }, [token]);

    const handleBudgetAdded = useCallback((newBudget) => {
        setProjectBudgets(prev => {
            const updatedBudgets = [...prev, newBudget];
            return updatedBudgets;
        });
    }, []);

    useEffect(() => {
        fetchProjects();
        const intervalId = setInterval(() => {
            fetchProjects();
        }, 60000);
        return () => clearInterval(intervalId);
    }, [fetchProjects]);

    const handleShowCreateModal = () => {
        setIsEditing(false);
        setCurrentProject(null);
        setFormData({
            name: '',
            description: '',
            start_date: '',
            end_date: '',
            status: 'Not Started',
            budget: '',
        });
        setStatusPreview(null);
        setShowModal(true);
    };

    const handleShowEditModal = (project) => {
        setIsEditing(true);
        setCurrentProject(project);
        setFormData({
            name: project.name,
            description: project.description || '',
            start_date: project.start_date ? project.start_date.split('T')[0] : '',
            end_date: project.end_date ? project.end_date.split('T')[0] : '',
            status: project.status,
            budget: project.budget || '',
        });
        updateStatusPreview({
            start_date: project.start_date ? project.start_date.split('T')[0] : '',
            end_date: project.end_date ? project.end_date.split('T')[0] : '',
        });
        setShowModal(true);
    };

    const handleShowTasksModal = async (project) => {
        setCurrentProject(project);
        await fetchProjectTasks(project.id);
        setShowTasksModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentProject(null);
        setError(null);
        setStatusPreview(null);
    };

    const handleCloseTasksModal = () => {
        setShowTasksModal(false);
        setProjectTasks([]);
        setProjectBudgets([]);
        setCurrentProject(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'start_date' || name === 'end_date') {
            updateStatusPreview({
                ...formData,
                [name]: value,
            });
        }
    };

    const updateStatusPreview = (data) => {
        const dateData = data || formData;
        if (!dateData.start_date && !dateData.end_date) {
            setStatusPreview(null);
            return;
        }
        const now = new Date();
        const startDate = dateData.start_date ? new Date(dateData.start_date) : null;
        const endDate = dateData.end_date ? new Date(dateData.end_date) : null;
        let computedStatus = dateData.status;
        if (startDate && endDate) {
            if (now < startDate) {
                computedStatus = 'Not Started';
            } else if (now > endDate) {
                computedStatus = 'Completed';
            } else {
                computedStatus = 'In Progress';
            }
        } else if (startDate && !endDate) {
            if (now < startDate) {
                computedStatus = 'Not Started';
            } else {
                computedStatus = 'In Progress';
            }
        } else if (!startDate && endDate) {
            if (now > endDate) {
                computedStatus = 'Completed';
            } else {
                computedStatus = 'In Progress';
            }
        }
        setStatusPreview(computedStatus);
    };

    useEffect(() => {
        updateStatusPreview();
    }, [formData.start_date, formData.end_date]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        const url = isEditing
            ? `${API_BASE_URL}/projects/${currentProject.id}`
            : `${API_BASE_URL}/projects`;
        const method = isEditing ? 'PUT' : 'POST';
        if (!formData.name.trim()) {
            setError('Project name cannot be empty.');
            return;
        }
        if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
            setError('End date cannot be before start date.');
            return;
        }
        if (formData.budget && isNaN(parseFloat(formData.budget))) {
            setError('Budget must be a valid number.');
            return;
        }
        const payload = { ...formData };
        if (statusPreview) {
            payload.status = statusPreview;
        }
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            fetchProjects();
            handleCloseModal();
        } catch (e) {
            console.error('Failed to save project:', e);
            setError(`Failed to save project: ${e.message}`);
        }
    };

    const handleDelete = async (projectId) => {
        if (window.confirm('Are you sure you want to delete this project and all its tasks?')) {
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                });
                if (!response.ok && response.status !== 204) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                fetchProjects();
            } catch (e) {
                console.error('Failed to delete project:', e);
                setError('Failed to delete project. Please try again.');
            }
        }
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    const getRemainingBudget = () => {
        if (!currentProject || !currentProject.budget) return null;
        const totalUsed = projectBudgets.reduce((sum, budget) => sum + parseFloat(budget.amount), 0);
        return parseFloat(currentProject.budget) - totalUsed;
    };

    const ganttTasks = projectTasks.map(task => ({
        id: task.id.toString(),
        name: task.title,
        start: new Date(task.time_logs?.start_time || new Date()),
        end: new Date(task.time_logs?.end_time || new Date()),
        progress: 100,
        type: 'task',
        styles: { progressColor: getTaskStatusColor(task.status), progressSelectedColor: getTaskStatusColor(task.status) },
    }));

    const getProjectStatusDisplay = (project) => {
        if (project.computed_status && project.computed_status !== project.status) {
            return (
                <span className={`badge bg-${getStatusColor(project.computed_status)}`}>
                    {project.computed_status} <span title="Status automatically computed from timeline"></span>
                </span>
            );
        }
        return <span className={`badge bg-${getStatusColor(project.status)}`}>{project.status}</span>;
    };

    if (loading) return <div className="text-center">Loading Projects...</div>;
    if (error && !showModal) return <div className="alert alert-danger">{error}</div>;

    return (
        <div>
            <h2>Projects</h2>
            <Button variant="primary" onClick={handleShowCreateModal} className="mb-3">
                Create New Project
            </Button>

            {projects.length === 0 && !loading && <p>No projects found. Create one!</p>}

            {projects.length > 0 && (
                <table className="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Budget</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map(project => (
                            <tr key={project.id}>
                                <td>{project.name}</td>
                                <td>{project.description?.substring(0, 50)}{project.description?.length > 50 ? '...' : ''}</td>
                                <td>{getProjectStatusDisplay(project)}</td>
                                <td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</td>
                                <td>{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}</td>
                                <td>{formatCurrency(project.budget)}</td>
                                <td>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleShowTasksModal(project)}
                                        className="me-2"
                                    >
                                        View Details
                                    </Button>
                                    {project.created_by === user?.id && (
                                        <>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={() => handleShowEditModal(project)}
                                                className="me-2"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleDelete(project.id)}
                                            >
                                                Delete
                                            </Button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <Modal show={showModal} onHide={handleCloseModal} backdrop="static" keyboard={false}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Project' : 'Create New Project'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {error && <div className="alert alert-danger">{error}</div>}
                        <Form.Group className="mb-3" controlId="projectName">
                            <Form.Label>Project Name <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter project name"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="projectDescription">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                name="description"
                                rows={3}
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Enter project description (optional)"
                            />
                        </Form.Group>
                        <div className="card mb-3 border-info">
                            <div className="card-header bg-info bg-opacity-10">
                                <strong>Timeline</strong> - Affects Project Status
                            </div>
                            <div className="card-body">
                                <Form.Group className="mb-3" controlId="projectStartDate">
                                    <Form.Label>Start Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="projectEndDate">
                                    <Form.Label>End Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleInputChange}
                                        min={formData.start_date || undefined}
                                        required
                                    />
                                </Form.Group>
                                {statusPreview && (
                                    <Alert variant="info" className="mb-0">
                                        <small>
                                            Based on the timeline, this project will automatically be set to{' '}
                                            <span className={`badge bg-${getStatusColor(statusPreview)}`}>{statusPreview}</span> status
                                        </small>
                                    </Alert>
                                )}
                            </div>
                        </div>
                        <Form.Group className="mb-3" controlId="projectStatus">
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                                name="status"
                                value={statusPreview || formData.status}
                                onChange={handleInputChange}
                                disabled
                            >
                                {projectStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </Form.Select>
                            {statusPreview !== null && (
                                <Form.Text className="text-muted">
                                    Status is determined by the timeline. Clear dates to set manually.
                                </Form.Text>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="projectBudget">
                            <Form.Label>Budget (₱)</Form.Label>
                            <Form.Control
                                type="number"
                                name="budget"
                                value={formData.budget}
                                onChange={handleInputChange}
                                placeholder="Enter project budget (optional)"
                                min="0"
                                step="0.01"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            {isEditing ? 'Save Changes' : 'Create Project'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showTasksModal} onHide={handleCloseTasksModal} size="xl" backdrop="static" keyboard={false}>
                <Modal.Header closeButton>
                    <Modal.Title>Details for {currentProject?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {currentProject && currentProject.budget && (
                        <div className="card mb-4">
                            <div className="card-body">
                                <h5 className="card-title">Budget Summary</h5>
                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="mb-2">
                                            <strong>Total Budget:</strong> {formatCurrency(currentProject.budget)}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-2">
                                            <strong>Budget Used:</strong>{' '}
                                            {formatCurrency(projectBudgets.reduce((sum, budget) => sum + parseFloat(budget.amount), 0))}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-2">
                                            <strong>Remaining Budget:</strong>{' '}
                                            <span className={parseFloat(getRemainingBudget()) < 0 ? 'text-danger' : 'text-success'}>
                                                {formatCurrency(getRemainingBudget())}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {parseFloat(getRemainingBudget()) < 0 && (
                                    <div className="alert alert-warning mt-2">
                                        <i className="bi bi-exclamation-triangle"></i> Warning: This project is over budget.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <Tab.Container defaultActiveKey="list">
                        <Nav variant="tabs" className="mb-3">
                            <Nav.Item>
                                <Nav.Link eventKey="list">Tasks</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="gantt">Gantt Chart</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="team">Team Members</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="budgets">Budgets</Nav.Link>
                            </Nav.Item>
                        </Nav>
                        <Tab.Content>
                            <Tab.Pane eventKey="list">
                                {tasksLoading && <div className="text-center">Loading tasks...</div>}
                                {tasksError && <div className="alert alert-danger">{tasksError}</div>}
                                {!tasksLoading && !tasksError && projectTasks.length === 0 && (
                                    <div className="text-center">No tasks found for this project.</div>
                                )}
                                {!tasksLoading && !tasksError && projectTasks.length > 0 && (
                                    <table className="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Status</th>
                                                <th>Priority</th>
                                                <th>Assigned To</th>
                                                <th>Due Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {projectTasks.map(task => (
                                                <tr key={task.id}>
                                                    <td>{task.title}</td>
                                                    <td>
                                                        <span className={`badge bg-${getTaskStatusColor(task.status)}`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                    <td>{task.priority}</td>
                                                    <td>{task.assigned_user?.name || 'Unassigned'}</td>
                                                    <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </Tab.Pane>
                            <Tab.Pane eventKey="gantt">
                                {tasksLoading && <div className="text-center">Loading tasks...</div>}
                                {tasksError && <div className="alert alert-danger">{tasksError}</div>}
                                {!tasksLoading && !tasksError && projectTasks.length === 0 && (
                                    <div className="text-center">No tasks found for this project.</div>
                                )}
                                {!tasksLoading && !tasksError && projectTasks.length > 0 && (
                                    <div style={{ height: '500px' }}>
                                        <Gantt tasks={ganttTasks} viewMode={ViewMode.Day} />
                                    </div>
                                )}
                            </Tab.Pane>
                            <Tab.Pane eventKey="team">
                                {currentProject && <TeamMembers projectId={currentProject.id} token={token} />}
                            </Tab.Pane>
                            <Tab.Pane eventKey="budgets">
                                {currentProject && (
                                    <Budgets
                                        projectId={currentProject.id}
                                        token={token}
                                        projectBudget={currentProject.budget}
                                        isOwner={currentProject.created_by === user?.id}
                                        onBudgetAdded={handleBudgetAdded}
                                    />
                                )}
                            </Tab.Pane>
                        </Tab.Content>
                    </Tab.Container>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseTasksModal}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

const getStatusColor = (status) => {
    switch (status) {
        case 'Not Started':
            return 'secondary';
        case 'In Progress':
            return 'info';
        case 'On Hold':
            return 'warning';
        case 'Completed':
            return 'success';
        default:
            return 'dark';
    }
};

const getTaskStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'pending':
            return 'secondary';
        case 'in progress':
            return 'info';
        case 'completed':
            return 'success';
        default:
            return 'dark';
    }
};

export default ProjectTable;
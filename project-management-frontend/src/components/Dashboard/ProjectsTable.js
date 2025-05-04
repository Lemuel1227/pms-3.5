import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { API_BASE_URL } from '../../App';
import { Modal, Button, Form, Nav, Tab } from 'react-bootstrap'; 
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

function ProjectTable() {
    const { token } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [showTasksModal, setShowTasksModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);
    const [projectTasks, setProjectTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksError, setTasksError] = useState(null);
    const [totalBudgetUsed, setTotalBudgetUsed] = useState(0);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'Not Started',
        budget: '', 
    });

    const projectStatuses = ['Not Started', 'In Progress', 'On Hold', 'Completed'];

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
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
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
            setProjectTasks(data);
            
            // Calculate total budget used by tasks
            const budgetUsed = data.reduce((total, task) => {
                return total + (parseFloat(task.budget) || 0);
            }, 0);
            setTotalBudgetUsed(budgetUsed);
            
        } catch (e) {
            console.error("Failed to fetch project tasks:", e);
            setTasksError('Failed to load tasks. Please try again later.');
        } finally {
            setTasksLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchProjects();
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
    };

    const handleCloseTasksModal = () => {
        setShowTasksModal(false);
        setProjectTasks([]);
        setCurrentProject(null);
        setTotalBudgetUsed(0);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); 

        const url = isEditing
            ? `${API_BASE_URL}/projects/${currentProject.id}`
            : `${API_BASE_URL}/projects`;
        const method = isEditing ? 'PUT' : 'POST';

        if (!formData.name.trim()) {
            setError("Project name cannot be empty.");
            return;
        }
        if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
            setError("End date cannot be before start date.");
            return;
        }
        if (formData.budget && isNaN(parseFloat(formData.budget))) {
            setError("Budget must be a valid number.");
            return;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            fetchProjects();
            handleCloseModal();

        } catch (e) {
            console.error("Failed to save project:", e);
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
                console.error("Failed to delete project:", e);
                setError('Failed to delete project. Please try again.');
            }
        }
    };

    // Format currency for display
    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    // Calculate remaining budget
    const getRemainingBudget = () => {
        if (!currentProject || !currentProject.budget) return null;
        const projectBudget = parseFloat(currentProject.budget) || 0;
        return projectBudget - totalBudgetUsed;
    };

    // Convert tasks to Gantt chart format
    const ganttTasks = projectTasks.map(task => ({
        id: task.id.toString(),
        name: task.title,
        start: new Date(task.time_logs?.start_time || new Date()),
        end: new Date(task.time_logs?.end_time || new Date()),
        progress: 100,
        type: 'task',
        styles: { progressColor: getTaskStatusColor(task.status), progressSelectedColor: getTaskStatusColor(task.status) }
    }));

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
                                <td><span className={`badge bg-${getStatusColor(project.status)}`}>{project.status}</span></td>
                                <td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</td>
                                <td>{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}</td>
                                <td>{formatCurrency(project.budget)}</td>
                                <td>
                                    <Button variant="outline-primary" size="sm" onClick={() => handleShowTasksModal(project)} className="me-2">
                                        View Tasks
                                    </Button>
                                    <Button variant="outline-secondary" size="sm" onClick={() => handleShowEditModal(project)} className="me-2">
                                        Edit
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(project.id)}>
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Project Edit/Create Modal */}
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
                        <Form.Group className="mb-3" controlId="projectStatus">
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                            >
                                {projectStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </Form.Select>
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
                        <Form.Group className="mb-3" controlId="projectStartDate">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleInputChange}
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

            {/* Project Tasks Modal */}
            <Modal 
                show={showTasksModal} 
                onHide={handleCloseTasksModal} 
                size="xl" 
                backdrop="static" 
                keyboard={false}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Tasks for {currentProject?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Budget Summary Section */}
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
                                            <strong>Budget Used:</strong> {formatCurrency(totalBudgetUsed)}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-2">
                                            <strong>Remaining Budget:</strong> 
                                            <span className={parseFloat(getRemainingBudget()) < 0 ? "text-danger" : "text-success"}>
                                                {" "}{formatCurrency(getRemainingBudget())}
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
                                <Nav.Link eventKey="list">List View</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="gantt">Gantt Chart</Nav.Link>
                            </Nav.Item>
                        </Nav>
                        <Tab.Content>
                            <Tab.Pane eventKey="list">
                                {tasksLoading && <div className="text-center">Loading tasks...</div>}
                                {tasksError && <div className="alert alert-danger">{tasksError}</div>}
                                {!tasksLoading && !tasksError && projectTasks.length === 0 && 
                                    <div className="text-center">No tasks found for this project.</div>
                                }
                                {!tasksLoading && !tasksError && projectTasks.length > 0 && (
                                    <table className="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Status</th>
                                                <th>Priority</th>
                                                <th>Assigned To</th>
                                                <th>Due Date</th>
                                                <th>Budget</th>
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
                                                    <td>{task.assigned_to?.name || 'Unassigned'}</td>
                                                    <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</td>
                                                    <td>{formatCurrency(task.budget)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </Tab.Pane>
                            <Tab.Pane eventKey="gantt">
                                {tasksLoading && <div className="text-center">Loading tasks...</div>}
                                {tasksError && <div className="alert alert-danger">{tasksError}</div>}
                                {!tasksLoading && !tasksError && projectTasks.length === 0 && 
                                    <div className="text-center">No tasks found for this project.</div>
                                }
                                {!tasksLoading && !tasksError && projectTasks.length > 0 && (
                                    <div style={{ height: '500px' }}>
                                        <Gantt
                                            tasks={ganttTasks}
                                            viewMode={ViewMode.Day}
                                        />
                                    </div>
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
        case 'Not Started': return 'secondary';
        case 'In Progress': return 'primary';
        case 'On Hold': return 'warning';
        case 'Completed': return 'success';
        default: return 'dark';
    }
};

const getTaskStatusColor = (status) => {
    switch (status) {
        case 'Not Started': return 'secondary';
        case 'In Progress': return 'primary';
        case 'On Hold': return 'warning';
        case 'Completed': return 'success';
        default: return 'dark';
    }
};

export default ProjectTable;
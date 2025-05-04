import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { API_BASE_URL } from '../../App'; 
import { Modal, Button, Alert, Form, Badge } from 'react-bootstrap';

function TaskTable() {
    const { token } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [apiError, setApiError] = useState(null); // New state for API-specific errors

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [formData, setFormData] = useState({
        project_id: '',
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        budget: '',
        assigned_user_id: null,
        start_time: '',
        end_time: '',
    });

    const taskStatuses = ['pending', 'in progress', 'completed'];
    const taskPriorities = ['low', 'medium', 'high'];

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setApiError(null); // Clear API errors on new fetch
        try {
            const [tasksResponse, projectsResponse, usersResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/tasks`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                }),
                fetch(`${API_BASE_URL}/projects`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                }),
                fetch(`${API_BASE_URL}/users`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                })
            ]);

            if (!tasksResponse.ok) throw new Error(`Task fetch failed: ${tasksResponse.status}`);
            if (!projectsResponse.ok) throw new Error(`Project fetch failed: ${projectsResponse.status}`);
            if (!usersResponse.ok) throw new Error(`User fetch failed: ${usersResponse.status}`);

            const tasksData = await tasksResponse.json();
            const projectsData = await projectsResponse.json();
            const usersData = await usersResponse.json();

            setTasks(tasksData);
            setProjects(projectsData);
            setUsers(usersData);

        } catch (e) {
            console.error("Failed to fetch data:", e);
            setError(`Failed to load data: ${e.message}. Please check API endpoints and CORS configuration.`);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleShowCreateModal = () => {
        if (projects.length === 0) {
            setError("Please create a project before adding tasks.");
            return;
        }
        setIsEditing(false);
        setCurrentTask(null);
        setFormData({
            project_id: projects[0]?.id || '',
            title: '',
            description: '',
            status: 'pending',
            priority: 'medium',
            budget: '',
            assigned_user_id: '', 
            start_time: '',
            end_time: '',
        });
        setApiError(null); // Clear any API errors
        setError(null); // Clear any form errors
        setShowModal(true);
    };

    const handleShowEditModal = (task) => {
        setIsEditing(true);
        setCurrentTask(task);
        setApiError(null); // Clear any API errors
        setError(null); // Clear any form errors
        
        // Extract time log information if available
        let startTime = '';
        let endTime = '';
        
        if (task.time_logs) {
            startTime = task.time_logs.start_time ? task.time_logs.start_time.split('T')[0] : '';
            endTime = task.time_logs.end_time ? task.time_logs.end_time.split('T')[0] : '';
        }
        
        setFormData({
            project_id: task.project_id,
            title: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.priority,
            budget: task.budget,
            assigned_user_id: task.assigned_user_id || '',
            start_time: startTime,
            end_time: endTime,
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentTask(null);
        setError(null);
        setApiError(null); // Clear API errors when closing modal
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setApiError(null); // Clear any previous API errors
    
        const url = isEditing
            ? `${API_BASE_URL}/tasks/${currentTask.id}`
            : `${API_BASE_URL}/tasks`;
        const method = isEditing ? 'PUT' : 'POST';
    
        if (!formData.title.trim()) {
            setError("Task title cannot be empty.");
            return;
        }
        if (!formData.project_id) {
            setError("Please select a project.");
            return;
        }
        
        // Validate start and end times if both are provided
        if (formData.start_time && formData.end_time) {
            if (new Date(formData.start_time) > new Date(formData.end_time)) {
                setError("Start time cannot be after end time.");
                return;
            }
        }
    
        let payload = { ...formData };
        payload.assigned_user_id = formData.assigned_user_id === '' ? null : formData.assigned_user_id;
        
        // Include time log data if provided
        if (formData.start_time || formData.end_time) {
            payload.time_logs = {
                start_time: formData.start_time || null,
                end_time: formData.end_time || null,
                user_id: formData.assigned_user_id || null
            };
        }
        
        // Remove the direct time fields from the payload
        delete payload.start_time;
        delete payload.end_time;
    
        console.log("Payload to be sent:", JSON.stringify(payload, null, 2));
    
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });
    
            const data = await response.json();
            
            if (!response.ok) {
                // Handle standard Laravel validation errors
                if (data.errors) {
                    const messages = Object.values(data.errors).flat().join(' ');
                    throw new Error(messages);
                }
                
                // Handle custom API messages like budget exceeded error
                if (data.message) {
                    setApiError(data.message);
                    return; // Don't throw error, just display the message
                }
                
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            fetchData(); // Refresh list
            handleCloseModal();
    
        } catch (e) {
            console.error("Failed to save task:", e);
            setError(`Failed to save task: ${e.message}`);
        }
    };
    
    const handleDelete = async (taskId) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            setError(null);
            setApiError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                });
                
                // Check if there's a response body
                let data = null;
                if (response.headers.get('Content-Type')?.includes('application/json')) {
                    data = await response.json();
                }
                
                if (!response.ok && response.status !== 204) {
                    // If there's an error message from the server, display it
                    if (data && data.message) {
                        setApiError(data.message);
                        return;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                fetchData(); // Refresh list
            } catch (e) {
                console.error("Failed to delete task:", e);
                setError('Failed to delete task. Please try again.');
            }
        }
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    // Function to calculate time spent on task
    const getTimeSpent = (task) => {
        if (!task.time_logs || !task.time_logs?.hours_spent) return 'Not tracked';
        return task.time_logs?.hours_spent + ' hrs';
    };

    // --- Render Logic ---
    if (loading) return <div className="text-center">Loading Tasks, Projects, and Users...</div>;
    
    // Display API-specific errors at the top level if they exist and we're not in the modal
    if (apiError && !showModal) {
        return (
            <div>
                <Alert variant="warning" dismissible onClose={() => setApiError(null)}>
                    <Alert.Heading>Server Message</Alert.Heading>
                    <p>{apiError}</p>
                </Alert>
                {renderMainContent()}
            </div>
        );
    }
    
    if (error && !showModal && !(projects.length === 0 && error?.includes("create a project"))) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return renderMainContent();

    function renderMainContent() {
        return (
            <div>
                <h2>Tasks</h2>
                <Button
                    variant="primary"
                    onClick={handleShowCreateModal}
                    className="mb-3"
                    disabled={projects.length === 0}
                >
                    Create New Task
                </Button>
                {projects.length === 0 && <p className="text-warning">You need to create a project before you can add tasks.</p>}

                {tasks.length === 0 && !loading && projects.length > 0 && <p>No tasks found. Create one!</p>}

                {tasks.length > 0 && (
                    <table className="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Project</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Budget</th>
                                <th>Time Frame</th>
                                <th>Time Spent</th>
                                <th>Assignee</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => {
                                const timeLog = task.time_logs || {};
                                const startDate = timeLog.start_time ? new Date(timeLog.start_time).toLocaleDateString() : 'N/A';
                                const endDate = timeLog.end_time ? new Date(timeLog.end_time).toLocaleDateString() : 'N/A';
                                const timeFrame = startDate === 'N/A' && endDate === 'N/A' ? 'N/A' : `${startDate} - ${endDate}`;
                                
                                return (
                                    <tr key={task.id}>
                                        <td>{task.title}</td>
                                        <td>{task.project?.name || 'N/A'}</td>
                                        <td><Badge bg={getTaskStatusColor(task.status)}>{task.status}</Badge></td>
                                        <td><Badge bg={getTaskPriorityColor(task.priority)}>{task.priority}</Badge></td>
                                        <td>{formatCurrency(task.budget)}</td>
                                        <td>{timeFrame}</td>
                                        <td>{getTimeSpent(task)}</td>
                                        <td>{task.assigned_user?.name || 'Unassigned'}</td>
                                        <td>
                                            <Button variant="outline-secondary" size="sm" onClick={() => handleShowEditModal(task)} className="me-2">
                                                Edit
                                            </Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(task.id)}>
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                <Modal show={showModal} onHide={handleCloseModal} backdrop="static" keyboard={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Edit Task' : 'Create New Task'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit}>
                        <Modal.Body>
                            {/* Display form validation errors */}
                            {error && (
                                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}
                            
                            {/* Display API-specific errors */}
                            {apiError && (
                                <Alert variant="warning" dismissible onClose={() => setApiError(null)}>
                                    <Alert.Heading>Server Message</Alert.Heading>
                                    <p>{apiError}</p>
                                </Alert>
                            )}
                            
                            <Form.Group className="mb-3" controlId="taskProjectId">
                                <Form.Label>Project <span className="text-danger">*</span></Form.Label>
                                <Form.Select name="project_id" value={formData.project_id} onChange={handleInputChange} required>
                                    <option value="" disabled>Select a project</option>
                                    {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskTitle">
                                <Form.Label>Title <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="title" value={formData.title} onChange={handleInputChange} required placeholder="Enter task title" />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskDescription">
                                <Form.Label>Description</Form.Label>
                                <Form.Control as="textarea" name="description" rows={3} value={formData.description} onChange={handleInputChange} placeholder="Enter task description (optional)" />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskStatus">
                                <Form.Label>Status</Form.Label>
                                <Form.Select name="status" value={formData.status} onChange={handleInputChange}>
                                    {taskStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskPriority">
                                <Form.Label>Priority</Form.Label>
                                <Form.Select name="priority" value={formData.priority} onChange={handleInputChange}>
                                    {taskPriorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskBudget">
                                <Form.Label>Budget <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleInputChange}
                                    placeholder="Enter project budget (optional)"
                                    min="0"
                                    step="0.01" />
                                <Form.Text className="text-muted">
                                    Note: Task budget cannot exceed available project budget.
                                </Form.Text>
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskStartTime">
                                <Form.Label>Start Date</Form.Label>
                                <Form.Control 
                                    type="datetime-local" 
                                    name="start_time" 
                                    value={formData.start_time} 
                                    onChange={handleInputChange} 
                                    placeholder="Select start date and time"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskEndTime">
                                <Form.Label>End Date</Form.Label>
                                <Form.Control 
                                    type="datetime-local" 
                                    name="end_time" 
                                    value={formData.end_time} 
                                    onChange={handleInputChange} 
                                    placeholder="Select end date and time"
                                />
                                <Form.Text className="text-muted">
                                    Both start and end dates are used for time tracking.
                                </Form.Text>
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskAssignee">
                                <Form.Label>Assignee</Form.Label>
                                <Form.Select name="assigned_user_id" value={formData.assigned_user_id} onChange={handleInputChange}>
                                    <option value="">Unassigned</option>
                                    {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                            <Button variant="primary" type="submit">{isEditing ? 'Save Changes' : 'Create Task'}</Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </div>
        );
    }
}

const getTaskStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'pending': return 'secondary';
        case 'in progress': return 'info';
        case 'completed': return 'success';
        default: return 'light';
    }
};

const getTaskPriorityColor = (priority) => {
    switch (priority) {
        case 'low': return 'success';
        case 'medium': return 'warning';
        case 'high': return 'danger';
        default: return 'light';
    }
};

export default TaskTable;
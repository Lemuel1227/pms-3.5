import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../App';
import { Modal, Button, Alert, Form, Badge, Card } from 'react-bootstrap';
import TaskComments from './TaskComments';
import TaskFiles from './TaskFiles';

function TaskTable() {
    const { token } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [apiError, setApiError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [showFilesModal, setShowFilesModal] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [formData, setFormData] = useState({
        project_id: '',
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assigned_user_id: '',
        start_time: '',
        end_time: '',
    });

    const taskStatuses = ['pending', 'in progress', 'completed'];
    const taskPriorities = ['low', 'medium', 'high'];

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setApiError(null);
        try {
            const [tasksResponse, projectsResponse, usersResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/tasks`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                }),
                fetch(`${API_BASE_URL}/projects`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                }),
            ]);

            if (!tasksResponse.ok) throw new Error(`Task fetch failed: ${tasksResponse.status}`);
            if (!projectsResponse.ok) throw new Error(`Project fetch failed: ${projectsResponse.status}`);
            
            const tasksData = await tasksResponse.json();
            const projectsData = await projectsResponse.json();

            setTasks(tasksData);
            setProjects(projectsData);

        } catch (e) {
            console.error("Failed to fetch data:", e);
            setError(`Failed to load data: ${e.message}. Please check API endpoints and CORS configuration.`);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchTeamMembers = useCallback(async (projectId) => {
        if (!projectId) {
            setTeamMembers([]);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/team`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            });
            if (!response.ok) throw new Error(`Team members fetch failed: ${response.status}`);
            const teamMembersData = await response.json();
            setTeamMembers(
                teamMembersData.team_members.filter(member => member.status === 'accepted')
            );              
        } catch (e) {
            console.error("Failed to fetch team members:", e);
            setError(`Failed to load team members: ${e.message}`);
            setTeamMembers([]);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(() => {
            fetchData();
        }, 60000);
        return () => clearInterval(intervalId);
    }, [fetchData]);

    useEffect(() => {
        if (formData.project_id) {
            fetchTeamMembers(formData.project_id);
        } else {
            setTeamMembers([]);
        }
    }, [formData.project_id, fetchTeamMembers]);

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
            assigned_user_id: '',
            start_time: '',
            end_time: '',
        });
        setApiError(null);
        setError(null);
        setShowModal(true);
    };

    const handleShowEditModal = (task) => {
        setIsEditing(true);
        setCurrentTask(task);
        setApiError(null);
        setError(null);
        
        let startTime = '';
        let endTime = '';
        
        if (task.time_logs) {
            startTime = task.time_logs.start_time ? task.time_logs.start_time.split('.')[0] : '';
            endTime = task.time_logs.end_time ? task.time_logs.end_time.split('.')[0] : '';
        }
        
        if (startTime && !startTime.includes('T')) {
            startTime = startTime.replace(' ', 'T');
        }
        if (endTime && !endTime.includes('T')) {
            endTime = endTime.replace(' ', 'T');
        }
        
        setFormData({
            project_id: task.project_id,
            title: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.priority,
            assigned_user_id: task.assigned_user_id || '',
            start_time: startTime,
            end_time: endTime,
        });
        setShowModal(true);
    };

    const handleShowCommentsModal = (taskId) => {
        setCurrentTaskId(taskId);
        setShowCommentsModal(true);
    };

    const handleShowFilesModal = (taskId) => {
        setCurrentTaskId(taskId);
        setShowFilesModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentTask(null);
        setError(null);
        setApiError(null);
        setTeamMembers([]);
    };

    const handleCloseCommentsModal = () => {
        setShowCommentsModal(false);
        setCurrentTaskId(null);
    };

    const handleCloseFilesModal = () => {
        setShowFilesModal(false);
        setCurrentTaskId(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        if (name === 'project_id') {
            setFormData(prev => ({ ...prev, assigned_user_id: '' }));
        }
        
        if (name === 'start_time' || name === 'end_time') {
            updateStatusPreview();
        }
    };
    
    const [statusPreview, setStatusPreview] = useState(null);
    
    const updateStatusPreview = () => {
        if (!formData.start_time && !formData.end_time) {
            setStatusPreview(null);
            return;
        }
        
        const now = new Date();
        const startTime = formData.start_time ? new Date(formData.start_time) : null;
        const endTime = formData.end_time ? new Date(formData.end_time) : null;
        
        let computedStatus = formData.status;
        
        if (startTime && endTime) {
            if (now < startTime) {
                computedStatus = 'pending';
            } else if (now > endTime) {
                computedStatus = 'completed';
            } else {
                computedStatus = 'in progress';
            }
        } else if (startTime && !endTime) {
            if (now < startTime) {
                computedStatus = 'pending';
            } else {
                computedStatus = 'in progress';
            }
        } else if (!startTime && endTime) {
            if (now > endTime) {
                computedStatus = 'completed';
            } else {
                computedStatus = 'in progress';
            }
        }
        
        setStatusPreview(computedStatus);
    };
    
    useEffect(() => {
        updateStatusPreview();
    }, [formData.start_time, formData.end_time]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setApiError(null);
    
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
        
        if (formData.start_time && formData.end_time) {
            if (new Date(formData.start_time) > new Date(formData.end_time)) {
                setError("Start time cannot be after end time.");
                return;
            }
        }
    
        let payload = { ...formData };
        payload.assigned_user_id = formData.assigned_user_id === '' ? null : formData.assigned_user_id;
        
        if (formData.start_time || formData.end_time) {
            payload.time_logs = {
                start_time: formData.start_time || null,
                end_time: formData.end_time || null,
                user_id: formData.assigned_user_id || null
            };
            
            if (statusPreview) {
                payload.status = statusPreview;
            }
        }
        
        delete payload.start_time;
        delete payload.end_time;
    
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
                if (data.errors) {
                    const messages = Object.values(data.errors).flat().join(' ');
                    throw new Error(messages);
                }
                
                if (data.message) {
                    setApiError(data.message);
                    return;
                }
                
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            fetchData();
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
                
                let data = null;
                if (response.headers.get('Content-Type')?.includes('application/json')) {
                    data = await response.json();
                }
                
                if (!response.ok && response.status !== 204) {
                    if (data && data.message) {
                        setApiError(data.message);
                        return;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                fetchData();
            } catch (e) {
                console.error("Failed to delete task:", e);
                setError('Failed to delete task. Please try again.');
            }
        }
    };

    const getTimeSpent = (task) => {
        if (!task.time_logs || !task.time_logs?.hours_spent) return 'Not tracked';
        return task.time_logs?.hours_spent + ' hrs';
    };
    
    const getTaskStatus = (task) => {
        if (task.computed_status && task.computed_status !== task.status) {
            return (
                <>
                    <Badge bg={getTaskStatusColor(task.computed_status)}>
                        {task.computed_status} <span title="Status automatically computed from time logs"></span>
                    </Badge>
                </>
            );
        }
        
        if (task.time_logs) {
            const now = new Date();
            const startTime = task.time_logs.start_time ? new Date(task.time_logs.start_time) : null;
            const endTime = task.time_logs.end_time ? new Date(task.time_logs.end_time) : null;
            
            let computedStatus = task.status;
            let isComputed = false;
            
            if (startTime && endTime) {
                isComputed = true;
                if (now < startTime) {
                    computedStatus = 'pending';
                } else if (now > endTime) {
                    computedStatus = 'completed';
                } else {
                    computedStatus = 'in progress';
                }
            } else if (startTime && !endTime) {
                isComputed = true;
                if (now < startTime) {
                    computedStatus = 'pending';
                } else {
                    computedStatus = 'in progress';
                }
            } else if (!startTime && endTime) {
                isComputed = true;
                if (now > endTime) {
                    computedStatus = 'completed';
                } else {
                    computedStatus = 'in progress';
                }
            }
            
            if (isComputed && computedStatus !== task.status) {
                return (
                    <>
                        <Badge bg={getTaskStatusColor(computedStatus)}>
                            {computedStatus} <span title="Status automatically computed from time logs"></span>
                        </Badge>
                    </>
                );
            }
        }
        
        return <Badge bg={getTaskStatusColor(task.status)}>{task.status}</Badge>;
    };

    if (loading) return <div className="text-center">Loading Tasks, Projects, and Users...</div>;
    
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
                                        <td>{getTaskStatus(task)}</td>
                                        <td><Badge bg={getTaskPriorityColor(task.priority)}>{task.priority}</Badge></td>
                                        <td>{timeFrame}</td>
                                        <td>{getTimeSpent(task)}</td>
                                        <td>{task.assigned_user?.name || 'Unassigned'}</td>
                                        <td>
                                            <div className="d-flex">
                                                <>
                                                    <Button variant="outline-secondary" size="sm" onClick={() => handleShowEditModal(task)} className="me-1">
                                                        Edit
                                                    </Button>
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(task.id)} className="me-1">
                                                        Delete
                                                    </Button>
                                                    <Button variant="outline-info" size="sm" onClick={() => handleShowCommentsModal(task.id)} className="me-1">
                                                        Comments
                                                    </Button>
                                                    <Button variant="outline-primary" size="sm" onClick={() => handleShowFilesModal(task.id)}>
                                                        Files
                                                    </Button>
                                                </>
                                            </div>
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
                            {error && (
                                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}
                            
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
                            
                            <Card className="mb-3 border-info">
                                <Card.Header className="bg-info bg-opacity-10">
                                    <strong>Time Frame</strong> - Affects Task Status
                                </Card.Header>
                                <Card.Body>
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
                                    </Form.Group>
                                    
                                    {statusPreview && (
                                        <Alert variant="info" className="mb-0">
                                            <small>
                                                Based on the time frame, this task will automatically be set to <Badge bg={getTaskStatusColor(statusPreview)}>{statusPreview}</Badge> status
                                            </small>
                                        </Alert>
                                    )}
                                </Card.Body>
                            </Card>
                            
                            <Form.Group className="mb-3" controlId="taskStatus">
                                <Form.Label>Status</Form.Label>
                                <Form.Select 
                                    name="status" 
                                    value={statusPreview || formData.status} 
                                    onChange={handleInputChange}
                                    disabled
                                >
                                    {taskStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                                </Form.Select>
                                {statusPreview !== null && (
                                    <Form.Text className="text-muted">
                                        Status is determined by the time frame. Clear dates to set manually.
                                    </Form.Text>
                                )}
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskPriority">
                                <Form.Label>Priority</Form.Label>
                                <Form.Select name="priority" value={formData.priority} onChange={handleInputChange}>
                                    {taskPriorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="taskAssignee">
                                <Form.Label>Assignee</Form.Label>
                                <Form.Select name="assigned_user_id" value={formData.assigned_user_id} onChange={handleInputChange}>
                                    <option value="">Unassigned</option>
                                    {teamMembers.map(member => (
                                        <option key={member.user_id} value={member.user_id}>
                                            {member.user?.name || 'Unknown'}
                                        </option>
                                    ))}
                                    {isEditing && formData.assigned_user_id && !teamMembers.find(m => m.user_id === formData.assigned_user_id) && (
                                        <option value={formData.assigned_user_id}>
                                            {currentTask?.assigned_user?.name || 'Current Assignee'}
                                        </option>
                                    )}
                                </Form.Select>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                            <Button variant="primary" type="submit">{isEditing ? 'Save Changes' : 'Create Task'}</Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

                <Modal show={showCommentsModal} onHide={handleCloseCommentsModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Task Comments</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {currentTaskId && <TaskComments taskId={currentTaskId} />}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseCommentsModal}>Close</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showFilesModal} onHide={handleCloseFilesModal} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Task Files</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {currentTaskId && <TaskFiles taskId={currentTaskId} />}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseFilesModal}>Close</Button>
                    </Modal.Footer>
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
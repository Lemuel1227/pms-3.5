// src/components/Project/ProjectTable.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext'; // Adjust path as needed
import { API_BASE_URL } from '../../App'; // Import base URL
import { Modal, Button, Form } from 'react-bootstrap'; // Using react-bootstrap for modals

function ProjectTable() {
    const { token } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'Not Started', // Default status
    });

    const projectStatuses = ['Not Started', 'In Progress', 'On Hold', 'Completed'];

    // --- Fetch Projects ---
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

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // --- Modal Handling ---
    const handleShowCreateModal = () => {
        setIsEditing(false);
        setCurrentProject(null);
        setFormData({
            name: '',
            description: '',
            start_date: '',
            end_date: '',
            status: 'Not Started',
        });
        setShowModal(true);
    };

    const handleShowEditModal = (project) => {
        setIsEditing(true);
        setCurrentProject(project);
        setFormData({
            name: project.name,
            description: project.description || '',
            // Ensure dates are in YYYY-MM-DD format for the input type="date"
            start_date: project.start_date ? project.start_date.split('T')[0] : '',
            end_date: project.end_date ? project.end_date.split('T')[0] : '',
            status: project.status,
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentProject(null); // Clear current project on close
        setError(null); // Clear any form errors
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- CRUD Operations ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Clear previous errors

        const url = isEditing
            ? `${API_BASE_URL}/projects/${currentProject.id}`
            : `${API_BASE_URL}/projects`;
        const method = isEditing ? 'PUT' : 'POST';

        // Basic validation
        if (!formData.name.trim()) {
            setError("Project name cannot be empty.");
            return;
        }
        if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
            setError("End date cannot be before start date.");
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

            // const result = await response.json(); // result contains the created/updated project

            // Refresh project list and close modal
            fetchProjects();
            handleCloseModal();

        } catch (e) {
            console.error("Failed to save project:", e);
            setError(`Failed to save project: ${e.message}`);
            // Keep modal open if there's an error
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

                if (!response.ok && response.status !== 204) { // 204 No Content is OK for DELETE
                     throw new Error(`HTTP error! status: ${response.status}`);
                 }

                // Refresh project list
                fetchProjects();

            } catch (e) {
                console.error("Failed to delete project:", e);
                setError('Failed to delete project. Please try again.');
            }
        }
    };


    // --- Render Logic ---
    if (loading) return <div className="text-center">Loading Projects...</div>;
    // Display fetch error prominently if it's not a form error
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
                                <td>
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

            {/* Create/Edit Project Modal */}
            <Modal show={showModal} onHide={handleCloseModal} backdrop="static" keyboard={false}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Project' : 'Create New Project'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {error && <div className="alert alert-danger">{error}</div>} {/* Display form errors */}
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
                                min={formData.start_date || undefined} // Basic validation hint
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
        </div>
    );
}

// Helper function for status badge colors (optional)
const getStatusColor = (status) => {
    switch (status) {
        case 'Not Started': return 'secondary';
        case 'In Progress': return 'primary';
        case 'On Hold': return 'warning';
        case 'Completed': return 'success';
        default: return 'light';
    }
};

export default ProjectTable;
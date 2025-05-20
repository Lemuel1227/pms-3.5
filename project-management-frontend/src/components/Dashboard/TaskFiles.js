import React, { useState, useEffect } from 'react';
import { Button, ListGroup, Modal, Form, Alert } from 'react-bootstrap';
import { API_BASE_URL } from '../../App';
import { useAuth } from '../../context/AuthContext';

function TaskFiles({ taskId }) {
    const { token } = useAuth();
    const [files, setFiles] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchFiles = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/files`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch files');
            const data = await response.json();
            setFiles(data);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [taskId]);

    const handleFileSelect = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to upload file');
            
            await fetchFiles();
            setShowUploadModal(false);
            setSelectedFile(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete file');
            
            await fetchFiles();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDownload = async (fileId, filename) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/files/${fileId}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to download file');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>Task Files</h5>
                <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
                    Upload File
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <ListGroup>
                {files.map((file) => (
                    <ListGroup.Item key={file.id} className="d-flex justify-content-between align-items-center">
                        <span>{file.filename}</span>
                        <div>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleDownload(file.id, file.filename)}
                            >
                                Download
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(file.id)}
                            >
                                Delete
                            </Button>
                        </div>
                    </ListGroup.Item>
                ))}
                {files.length === 0 && (
                    <ListGroup.Item className="text-center text-muted">
                        No files attached to this task
                    </ListGroup.Item>
                )}
            </ListGroup>

            <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Upload File</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group>
                            <Form.Label>Select File</Form.Label>
                            <Form.Control
                                type="file"
                                onChange={handleFileSelect}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleUpload}
                        disabled={!selectedFile || loading}
                    >
                        {loading ? 'Uploading...' : 'Upload'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default TaskFiles; 
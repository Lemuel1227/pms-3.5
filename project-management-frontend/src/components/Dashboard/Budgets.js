import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Form, Alert, Table } from 'react-bootstrap';
import { API_BASE_URL } from '../../App';

function Budgets({ projectId, token, projectBudget, isOwner, onBudgetAdded }) {
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentBudget, setCurrentBudget] = useState(null);
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
    });
    const [refreshKey, setRefreshKey] = useState(0); 

    const fetchBudgets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/budgets`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setBudgets(data);
        } catch (e) {
            console.error('Budgets: Failed to fetch budgets:', e);
            setError(`Failed to load budgets: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [projectId, token]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const handleShowModal = (budget = null) => {
        setIsEditing(!!budget);
        setCurrentBudget(budget);
        setFormData({
            amount: budget ? budget.amount : '',
            description: budget ? budget.description || '' : '',
        });
        setError(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentBudget(null);
        setFormData({ amount: '', description: '' });
        setError(null);
        setRefreshKey(prev => prev + 1); 
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
            setError('Amount must be a positive number.');
            return;
        }

        const payload = {
            amount: parseFloat(formData.amount),
            description: formData.description || '',
        };

        const url = isEditing
            ? `${API_BASE_URL}/projects/${projectId}/budgets/${currentBudget.id}`
            : `${API_BASE_URL}/projects/${projectId}/budgets`;
        const method = isEditing ? 'PUT' : 'POST';

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

            const data = await response.json();
            await fetchBudgets();
            if (onBudgetAdded && !isEditing) {
                onBudgetAdded(data);
            }
            handleCloseModal();
        } catch (e) {
            console.error('Budgets: Failed to save budget:', e);
            setError(`Failed to save budget: ${e.message}`);
        }
    };

    const handleDelete = async (budgetId) => {
        if (window.confirm('Are you sure you want to delete this budget?')) {
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/projects/${projectId}/budgets/${budgetId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok && response.status !== 204) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                await fetchBudgets();
            } catch (e) {
                console.error('Budgets: Failed to delete budget:', e);
                setError(`Failed to delete budget: ${e.message}`);
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
        if (!projectBudget) return 0;
        const totalUsed = budgets.reduce((sum, budget) => sum + parseFloat(budget.amount || 0), 0);
        const remaining = parseFloat(projectBudget) - totalUsed;
        return remaining;
    };

    if (loading) return <div className="text-center">Loading budgets...</div>;
    if (error && !showModal) return <div className="alert alert-danger">{error}</div>;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>Budgets</h5>
                {isOwner && (
                    <Button variant="primary" size="sm" onClick={() => handleShowModal()}>
                        Add Budget
                    </Button>
                )}
            </div>
            {budgets.length === 0 && <p>No budgets found for this project.</p>}
            {budgets.length > 0 && (
                <Table striped hover>
                    <thead>
                        <tr>
                            <th>Amount</th>
                            <th>Description</th>
                            {isOwner && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {budgets.map(budget => (
                            <tr key={budget.id}>
                                <td>{formatCurrency(budget.amount)}</td>
                                <td>{budget.description || 'N/A'}</td>
                                {isOwner && (
                                    <td>
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={() => handleShowModal(budget)}
                                            className="me-2"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => handleDelete(budget.id)}
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
            {projectBudget && (
                <div className="mt-3">
                    <strong>Remaining Budget:</strong>
                    <span className={getRemainingBudget() < 0 ? 'text-danger' : 'text-success'}>
                        {' '}{formatCurrency(getRemainingBudget())}
                    </span>
                </div>
            )}

            <Modal show={showModal} onHide={handleCloseModal} backdrop="static" keyboard={false} key={refreshKey}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Budget' : 'Add Budget'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form.Group className="mb-3" controlId="budgetAmount">
                            <Form.Label>Amount (₱) <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                required
                                min="0.01"
                                step="0.01"
                                placeholder="Enter budget amount"
                            />
                            {projectBudget && (
                                <Form.Text className={getRemainingBudget() < 0 ? 'text-danger' : 'text-muted'}>
                                    Remaining Budget: {formatCurrency(getRemainingBudget() + (isEditing ? parseFloat(currentBudget?.amount || 0) : 0))}
                                </Form.Text>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="budgetDescription">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                name="description"
                                rows={3}
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Enter description (optional)"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="primary" type="submit">{isEditing ? 'Save Changes' : 'Add Budget'}</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

export default Budgets;
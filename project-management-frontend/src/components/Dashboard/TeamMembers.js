import React, { useState, useEffect } from 'react';
import { Alert, Form, Button } from 'react-bootstrap';
import { API_BASE_URL } from '../../App'; 

function TeamMembers({ projectId, token }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);


    // Fetch team members when component mounts or projectId changes
    useEffect(() => {
        fetchTeamMembers();
    }, [projectId]);

    const fetchTeamMembers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/team`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setTeamMembers(data.team_members);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load team members:', err);
            setError('Failed to load team members');
            setLoading(false);
        }
    };

    const inviteMember = async (e) => {
        e.preventDefault();
        try {
            setError(null);
            setSuccessMessage(null);
            
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/team/invite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    role: 'member',
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setTeamMembers([...teamMembers, data.team_member]);
            setSuccessMessage(data.message || 'Team member invited successfully');
            setEmail('');
        } catch (err) {
            console.error('Error inviting team member:', err);
            setError(err.message || 'An error occurred while inviting the team member');
        }
    };

    const removeMember = async (teamMemberId) => {
        if (!window.confirm('Are you sure you want to remove this team member?')) {
            return;
        }
        
        try {
            setError(null);
            setSuccessMessage(null);
            
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/team/${teamMemberId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
            
            if (!response.ok && response.status !== 204) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            setTeamMembers(teamMembers.filter(member => member.id !== teamMemberId));
            setSuccessMessage('Team member removed successfully');
        } catch (err) {
            console.error('Error removing team member:', err);
            setError(err.message || 'An error occurred while removing the team member');
        }
    };

    return (
        <div className="team-members-container">
            <h3>Team Members</h3>
            
            {error && <Alert variant="danger">{error}</Alert>}
            {successMessage && <Alert variant="success">{successMessage}</Alert>}
            
            {/* Invite Form */}
            <div className="invite-form mb-4">
                <h4>Invite a New Member</h4>
                <Form onSubmit={inviteMember}>
                    <Form.Group className="mb-3" controlId="teamMemberEmail">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter email address"
                        />
                    </Form.Group>
                    <Button type="submit" variant="primary">Send Invitation</Button>
                </Form>
            </div>
            
            {/* Team Members List */}
            <div className="team-members-list">
                <h4>Current Team Members</h4>
                {loading ? (
                    <div className="text-center">Loading team members...</div>
                ) : teamMembers.length === 0 ? (
                    <div className="text-center">No team members yet.</div>
                ) : (
                    <ul className="list-group">
                        {teamMembers.map(member => (
                            <li key={member.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>{member.user.name}</strong> ({member.user.email})
                                    <br />
                                    <span className={`badge bg-info me-2`}>{member.role}</span>
                                    <span className={`badge ${member.status === 'accepted' ? 'bg-success' : 'bg-warning'}`}>
                                        {member.status}
                                    </span>
                                </div>
                                {member.role !== 'project_creator' && (
                                    <Button
                                        onClick={() => removeMember(member.id)}
                                        variant="danger"
                                        size="sm"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default TeamMembers;
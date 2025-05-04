import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../App';
import { Button, Form, Card, ListGroup } from 'react-bootstrap';

function TaskComments({ taskId }) {
  const { token } = useAuth();
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComments = async () => {
    if (!taskId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }
      
      const data = await response.json();
      setComments(data);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to load comments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId, token]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit comment: ${response.status}`);
      }
      
      const newComment = await response.json();
      setComments(prev => [...prev, newComment]);
      setMessage('');
    } catch (err) {
      console.error("Error posting comment:", err);
      setError("Failed to post comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="mt-3">
      <h5>Comments</h5>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <Card>
        <ListGroup variant="flush">
          {loading && comments.length === 0 && (
            <ListGroup.Item className="text-center text-muted">Loading comments...</ListGroup.Item>
          )}
          
          {!loading && comments.length === 0 && (
            <ListGroup.Item className="text-center text-muted">No comments yet</ListGroup.Item>
          )}
          
          {comments.map(comment => (
            <ListGroup.Item key={comment.id}>
              <div className="d-flex justify-content-between align-items-center">
                <strong>{comment.user?.name || 'Anonymous'}</strong>
                <small className="text-muted">{formatDate(comment.created_at)}</small>
              </div>
              <p className="mb-0 mt-1">{comment.message}</p>
            </ListGroup.Item>
          ))}
        </ListGroup>
        
        <Card.Footer>
          <Form onSubmit={submitComment}>
            <div className="d-flex">
              <Form.Control
                type="text"
                placeholder="Write a comment..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
              />
              <Button 
                type="submit" 
                variant="primary" 
                className="ms-2" 
                disabled={loading || !message.trim()}
              >
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </Form>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default TaskComments;
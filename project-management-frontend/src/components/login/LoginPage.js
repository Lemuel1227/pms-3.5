import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
 
        login(data.access_token); 
        
      } else {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat();
          setError({
            type: 'validation',
            messages: errorMessages,
          });
        } else {
          setError({
            type: 'login',
            message: data.message || 'Login failed. Please check your credentials.',
          });
        }
      }
    } catch (err) {
      setError({
        type: 'network',
        message: 'Network error. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh', width: '100vw' }}>
      <div className="p-5 rounded shadow" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', border: '1px solid #dddfe2' }}>
        <h2 className="text-center mb-4">Login</h2>

        {error && (
          <Alert variant={error.type === 'network' ? 'danger' : error.type === 'validation' ? 'warning' : 'danger'}>
            {error.type === 'validation' ? (
              <ul className="mb-0 pl-3">
                {error.messages.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            ) : (
              error.message
            )}
          </Alert>
        )}

        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label className="d-block text-start">Email address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formBasicPassword">
            <Form.Label className="d-block text-start">Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100 mb-3" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>

          <div className="text-center">
            <p className="mb-0">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary">
                Register here
              </Link>
            </p>
          </div>
        </Form>
      </div>
    </Container>
  );
};

export default LoginPage;
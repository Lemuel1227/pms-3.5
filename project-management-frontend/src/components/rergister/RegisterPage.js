import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== passwordConfirmation) {
      setError({
        type: 'validation',
        messages: ['Passwords do not match.'],
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
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
            message: data.message || 'Registration failed. Please check your input.',
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
        <h2 className="text-center mb-4">Register</h2>

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

        <Form onSubmit={handleRegister}>
          <Form.Group className="mb-3" controlId="formBasicName">
            <Form.Label className="d-block text-start">Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

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
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formBasicPasswordConfirmation">
            <Form.Label className="d-block text-start">Confirm Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Confirm password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100 mb-3" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </Button>

          <div className="text-center">
            <p className="mb-0">
              Already have an account?{' '}
              <Link to="/login" className="text-primary">
                Login here
              </Link>
            </p>
          </div>
        </Form>
      </div>
    </Container>
  );
};

export default RegisterPage;
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Card, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import ProjectsTable from '../Dashboard/ProjectsTable';
import TasksTable from '../Dashboard/TasksTable';
import { useAuth } from '../../context/AuthContext'; 
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('projects');
  const { isLoggedIn, token, logout, loading: authLoading } = useAuth(); 
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn && !authLoading) {
      navigate('/login'); 
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const projectsResponse = await fetch('http://127.0.0.1:8000/api/projects', {
          headers: {
            'Authorization': `Bearer ${token}`,  // Corrected Template Literal Syntax
            'Content-Type': 'application/json',
          }
        });

        if (!projectsResponse.ok) {
          throw new Error(`HTTP error! status: ${projectsResponse.status}`);
        }
        const projectsData = await projectsResponse.json();
        setProjects(projectsData);

        const tasksResponse = await fetch('http://127.0.0.1:8000/api/tasks', {
          headers: {
            'Authorization': `Bearer ${token}`,  // Corrected Template Literal Syntax
            'Content-Type': 'application/json',
          }
        });

        if (!tasksResponse.ok) {
          throw new Error(`HTTP error! status: ${tasksResponse.status}`);
        }
        const tasksData = await tasksResponse.json();
        setTasks(tasksData);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isLoggedIn, token, authLoading, navigate]); 

  const handleNavClick = (view) => {
    setActiveView(view);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,  // Corrected Template Literal Syntax
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        logout(); 
      } else {
        const errorData = await response.json(); 
        console.error('Logout failed:', response.status, errorData); 

        let errorMessage = 'Logout failed. Please try again.'; 
        if (errorData && errorData.message) {
          errorMessage = errorData.message; 
        }
        setError(errorMessage); 
      }
    } catch (error) {
      console.error('Error during logout:', error);
      setError('An error occurred during logout.');
    }
  };

  let content;
  if (!isLoggedIn) {
    content = <div>Please log in to view the dashboard.</div>; 
  } else if (loading) {
    content = <div>Loading data...</div>;
  } else if (error) {
    content = <div>Error: {error}</div>;
  } else {
    content = (
      <Card>
        <Card.Header>{activeView === 'projects' ? 'Projects' : 'Tasks'}</Card.Header>
        <Card.Body>
          {activeView === 'projects' ? (
            <ProjectsTable projects={projects} />
          ) : (
            <TasksTable tasks={tasks} />
          )}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Container>
      <Row className="mb-3">
        <Col className="d-flex justify-content-between align-items-center">
          <h1>Dashboard</h1>
          <Button variant="outline-danger" onClick={handleLogout}>
            Logout
          </Button>
        </Col>
      </Row>

      <Nav variant="tabs" defaultActiveKey="projects" onSelect={handleNavClick}>
        <Nav.Item>
          <Nav.Link eventKey="projects">Projects</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="tasks">Tasks</Nav.Link>
        </Nav.Item>
      </Nav>

      <Row>
        <Col md={12}>{content}</Col>
      </Row>
    </Container>
  );
}

export default Dashboard;

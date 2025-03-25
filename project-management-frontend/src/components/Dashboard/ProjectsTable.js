import React from 'react';
import { Table, Button } from 'react-bootstrap';

function ProjectsTable({ projects }) {
    return (
        <Table striped bordered hover style={{ tableLayout: 'fixed' }}>
            <thead>
                <tr>
                    <th style={{ width: '50px' }}>ID</th>
                    <th style={{ width: '150px' }}>Name</th>
                    <th style={{ width: '400px' }}>Description</th>
                    <th style={{ width: '150px' }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {projects.map((project) => (
                    <tr key={project.id}>
                        <td>{project.id}</td>
                        <td>{project.name}</td>
                        <td style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>{project.description}</td>
                        <td style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "10px"
                        }}>
                            <Button variant="warning" size="sm">
                                Edit
                            </Button>
                            <Button variant="danger" size="sm">
                                Delete
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

export default ProjectsTable;
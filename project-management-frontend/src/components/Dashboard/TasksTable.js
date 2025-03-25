import React from 'react';
import { Table, Button } from 'react-bootstrap';

function TasksTable({ tasks }) {
    return (
        <Table striped bordered hover>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {tasks.map((task) => (
                    <tr key={task.id}>
                        <td>{task.id}</td>
                        <td>{task.task_name}</td>
                        <td>{task.status}</td>
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

export default TasksTable;
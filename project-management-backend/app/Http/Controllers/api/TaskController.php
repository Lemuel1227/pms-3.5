<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Task;

class TaskController extends Controller
{
    public function index()
    {
        return Task::with('project', 'assignedUser')->get();
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'task_name' => 'required|max:255',
            'status' => 'in:pending,in_progress,completed',
            'deadline' => 'nullable|date',
            'assigned_user_id' => 'nullable|exists:users,id'
        ]);

        return Task::create($validatedData);
    }

    public function show($id)
    {
        return Task::with('project', 'assignedUser')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $task = Task::findOrFail($id);

        $validatedData = $request->validate([
            'project_id' => 'sometimes|required|exists:projects,id',
            'task_name' => 'sometimes|required|max:255',
            'status' => 'sometimes|in:pending,in_progress,completed',
            'deadline' => 'nullable|date',
            'assigned_user_id' => 'nullable|exists:users,id'
        ]);

        $task->update($validatedData);
        return $task;
    }

    public function destroy($id)
    {
        $task = Task::findOrFail($id);
        $task->delete();
        return response()->json(null, 204);
    }

    public function projectTasks($project_id)
    {
        return Task::where('project_id', $project_id)->get();
    }

    public function tasksByStatus($status)
    {
        return Task::where('status', $status)->get();
    }
}

<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Models\Project;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::query();

        // Filter tasks by project if project_id is provided
        if ($request->has('project_id')) {
            $projectId = $request->query('project_id');
            
            // First check if project exists
            $project = Project::find($projectId);
            
            if (!$project) {
                return response()->json(['message' => 'Project not found'], 404); // 404 Not Found
            }
            
            // Then check if user has access to this project
            $userId = auth('sanctum')->id();
            $hasAccess = $project->created_by == $userId || $project->members->contains('id', $userId);
            
            if (!$hasAccess) {
                return response()->json(['message' => 'Access denied to this project'], 403); // 403 Forbidden
            }
            
            $query->where('project_id', $projectId);
        } else {
            // Filter by tasks assigned to the user or created by the user
            $userId = auth('sanctum')->id();
            $query->where(function($q) use ($userId) {
                $q->where('assigned_user_id', $userId)
                ->orWhere('created_by', $userId);
            });
        }

        // Eager load relationships
        $tasks = $query->with(['project', 'assignedUser', 'owner'])->latest()->get();

        return response()->json($tasks);
    }
    
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'project_id' => 'required|exists:projects,id', // Ensure project exists
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => [
                'nullable', // Allow default
                Rule::in(['pending', 'in progress', 'completed']), // Use migration values
            ],
            'priority' => [
                'nullable', // Allow default
                Rule::in(['low', 'medium', 'high']), // Use migration values
            ],
            'assigned_user_id' => 'nullable|exists:users,id', // Ensure assigned user exists if provided
            'due_date' => 'nullable|date',
        ]);

        // Add the authenticated user as the creator
        $validatedData['created_by'] = auth('sanctum')->id();
        // Set defaults if not provided
        $validatedData['status'] = $validatedData['status'] ?? 'pending';
        $validatedData['priority'] = $validatedData['priority'] ?? 'medium';

        // Optional: Check if the user creating the task has access to the project_id
        $project = Project::find($validatedData['project_id']);
        // if (!$project || auth('sanctum')->id() !== $project->created_by /* && !user is member etc. */ ) {
        //     return response()->json(['message' => 'Cannot add task to this project'], 403);
        // }

        $task = Task::create($validatedData);

        // Return the created task with relationships loaded
        return response()->json($task->load(['project', 'assignedUser', 'owner']), 201);
    }

    public function show(Task $task)
    {
         // Optional: Add authorization check - can the current user view this task?
         // Consider project membership, assignment, or creation status
         // $userId = auth('sanctum')->id();
         // if ($userId !== $task->created_by && $userId !== $task->assigned_user_id /* && !is project member */ ) {
         //     return response()->json(['message' => 'Forbidden'], 403);
         // }

        // Eager load relationships
        return response()->json($task->load(['project', 'assignedUser', 'owner']));
    }

    public function update(Request $request, Task $task)
    {
        // Optional: Add authorization check - can the current user update this task?
        // $userId = auth('sanctum')->id();
        // if ($userId !== $task->created_by && $userId !== $task->assigned_user_id /* && !is project admin/owner */ ) {
        //     return response()->json(['message' => 'Forbidden'], 403);
        // }

        $validatedData = $request->validate([
            // No project_id update usually needed, handle separately if required
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => [
                'sometimes',
                'required',
                Rule::in(['pending', 'in progress', 'completed']),
            ],
            'priority' => [
                'sometimes',
                'required',
                Rule::in(['low', 'medium', 'high']),
            ],
            'assigned_user_id' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
        ]);

        // Prevent changing the creator
        unset($validatedData['created_by']);
        // Prevent changing the project easily, handle moves explicitly if needed
        unset($validatedData['project_id']);

        $task->update($validatedData);

        // Return the updated task with relationships loaded
        return response()->json($task->load(['project', 'assignedUser', 'owner']));
    }

    public function destroy(Task $task)
    {
         // Optional: Add authorization check - can the current user delete this task?
         // $userId = auth('sanctum')->id();
         // if ($userId !== $task->created_by /* && !is project admin/owner */ ) {
         //     return response()->json(['message' => 'Forbidden'], 403);
         // }

        $task->delete();

        return response()->json(['message' => 'Task deleted successfully'], 200);
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

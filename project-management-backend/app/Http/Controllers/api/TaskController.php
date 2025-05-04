<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\TimeLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Models\Project;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::query();

        if ($request->has('project_id')) {
            $projectId = $request->query('project_id');
            
            $project = Project::find($projectId);
            
            if (!$project) {
                return response()->json(['message' => 'Project not found'], 404); 
            }
            
            $userId = auth('sanctum')->id();
            // Only check if user is the project owner
            $hasAccess = $project->created_by == $userId;
            
            if (!$hasAccess) {
                return response()->json(['message' => 'Access denied to this project'], 403);
            }
            
            $query->where('project_id', $projectId);
        } else {
            $userId = auth('sanctum')->id();
            $query->where(function($q) use ($userId) {
                $q->where('assigned_user_id', $userId)
                ->orWhere('created_by', $userId);
            });
        }

        $tasks = $query->with(['project', 'assignedUser', 'timeLogs' ,'owner'])->get();

        return response()->json($tasks);
    }
    
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => [
                Rule::in(['pending', 'in progress', 'completed']), 
            ],
            'priority' => [
                'nullable',
                Rule::in(['low', 'medium', 'high']), 
            ],
            'budget' => 'nullable|numeric|min:0',
            'assigned_user_id' => 'nullable|exists:users,id', 
            'due_date' => 'nullable|date',
            'time_logs' => 'nullable|array',
            'time_logs.start_time' => 'required_with:time_logs|date',
            'time_logs.end_time' => 'nullable|date|after_or_equal:time_logs.start_time',
            'time_logs.user_id' => 'nullable|exists:users,id',
        ]);

        $validatedData['created_by'] = auth('sanctum')->id();
        $validatedData['status'] = $validatedData['status'] ?? 'pending';
        $validatedData['priority'] = $validatedData['priority'] ?? 'medium';

        $project = Project::find($validatedData['project_id']);
        // Check if user is the project owner
        if (!$project || auth('sanctum')->id() !== $project->created_by) {
            return response()->json(['message' => 'Cannot add task to this project'], 403);
        }

        $totalAllocated = $project->tasks()->sum('budget');
        $newBudget = $request->input('budget') ?? 0;
    
        if (($totalAllocated + $newBudget) > $project->budget) {
            return response()->json(['message' => "This task\'s budget exceeds the remaining project budget."]);
        }

        // Start transaction to ensure both task and time log are saved or neither is
        DB::beginTransaction();
        try {
            // Extract time_logs data to handle separately
            $timeLogsData = isset($validatedData['time_logs']) ? $validatedData['time_logs'] : null;
            unset($validatedData['time_logs']);
            
            $task = Task::create($validatedData);
            
            // Create time log if provided
            if ($timeLogsData) {
                $timeLog = new TimeLog([
                    'task_id' => $task->id,
                    'user_id' => $timeLogsData['user_id'] ?? auth('sanctum')->id(),
                    'start_time' => $timeLogsData['start_time'],
                    'end_time' => $timeLogsData['end_time'] ?? null,
                    'description' => $timeLogsData['description'] ?? null,
                ]);
                
                $task->timeLogs()->save($timeLog);
            }
            
            DB::commit();
            
            // Load relationships including the newly created time log
            $task->load(['project', 'assignedUser', 'owner', 'timeLogs']);
            
            return response()->json($task, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create task with time log: ' . $e->getMessage()], 500);
        }
    }

    public function show(Task $task)
    {
        $user = request()->user();
        $project = $task->project; // Get the project associated with the task

        // Authorization: User must be owner of the project, or task creator/assignee
        if (
            $project->created_by !== $user->id &&
            $task->created_by !== $user->id &&
            $task->assigned_user_id !== $user->id
        ) {
            return response()->json(['message' => 'Access denied to view this task'], 403);
        }

        // Eager load relationships including detailed time logs with user info
        $task->load([
            'project:id,name',
            'assignedUser:id,name',
            'owner:id,name',
            'timeLogs' => function ($query) { 
                $query->with('user:id,name')->latest(); 
            }
        ]);

        return response()->json($task);
    }

    public function update(Request $request, Task $task)
    {
        $userId = auth('sanctum')->id();
        $project = $task->project;
        
        // Check if user is project owner, task creator or task assignee
        if ($userId !== $project->created_by && $userId !== $task->created_by && $userId !== $task->assigned_user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $otherTasksBudget = $project->tasks()->where('id', '!=', $task->id)->sum('budget');
        $newBudget = $request->input('budget') ?? 0;
    
        if (($otherTasksBudget + $newBudget) > $project->budget) {
            return response()->json(['message' => 'Updated budget exceeds the project\'s total budget.']);
        }    

        $validatedData = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'project_id' => 'sometimes|required|exists:projects,id',
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
            'budget' => 'nullable|numeric|min:0',
            'assigned_user_id' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'time_logs' => 'nullable|array',
            'time_logs.id' => 'nullable|exists:time_logs,id',
            'time_logs.start_time' => 'required_with:time_logs|date',
            'time_logs.end_time' => 'nullable|date|after_or_equal:time_logs.start_time',
            'time_logs.user_id' => 'nullable|exists:users,id',
        ]);

        unset($validatedData['created_by']);
        
        // Start transaction
        DB::beginTransaction();
        try {
            // Extract time_logs data to handle separately
            $timeLogsData = isset($validatedData['time_logs']) ? $validatedData['time_logs'] : null;
            unset($validatedData['time_logs']);
            
            $task->update($validatedData);
            
            // Handle time log update or creation
            if ($timeLogsData) {
                if (isset($timeLogsData['id'])) {
                    // Update existing time log
                    $timeLog = TimeLog::findOrFail($timeLogsData['id']);
                    
                    // Ensure the time log belongs to this task
                    if ($timeLog->task_id !== $task->id) {
                        return response()->json(['message' => 'This time log does not belong to the task'], 403);
                    }
                    
                    $timeLog->update([
                        'start_time' => $timeLogsData['start_time'],
                        'end_time' => $timeLogsData['end_time'] ?? null,
                        'user_id' => $timeLogsData['user_id'] ?? $timeLog->user_id,
                        'description' => $timeLogsData['description'] ?? $timeLog->description,
                    ]);
                } else {
                    // Create new time log for this task
                    // First, check if task already has a time log
                    $existingTimeLog = $task->timeLogs()->first();
                    
                    if ($existingTimeLog) {
                        // Update existing time log instead of creating a new one
                        $existingTimeLog->update([
                            'start_time' => $timeLogsData['start_time'],
                            'end_time' => $timeLogsData['end_time'] ?? null,
                            'user_id' => $timeLogsData['user_id'] ?? $userId,
                            'description' => $timeLogsData['description'] ?? null,
                        ]);
                    } else {
                        // Create new time log
                        $timeLog = new TimeLog([
                            'task_id' => $task->id,
                            'user_id' => $timeLogsData['user_id'] ?? $userId,
                            'start_time' => $timeLogsData['start_time'],
                            'end_time' => $timeLogsData['end_time'] ?? null,
                            'description' => $timeLogsData['description'] ?? null,
                        ]);
                        
                        $task->timeLogs()->save($timeLog);
                    }
                }
            }
            
            DB::commit();
            
            // Reload task with related data
            $task->load(['project', 'assignedUser', 'owner', 'timeLogs']);
            
            return response()->json($task);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update task with time log: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Task $task)
    {
        $userId = auth('sanctum')->id();
        $project = $task->project;
         
        // Only project owner or task creator can delete a task
        if ($userId !== $project->created_by && $userId !== $task->created_by) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $task->delete();

        return response()->json(['message' => 'Task deleted successfully'], 200);
    }

    public function indexTimeLogs(Task $task)
    {
        // Authorization logic
        $user = request()->user();
        $project = $task->project;
        
        if (
            $project->created_by !== $user->id &&
            $task->created_by !== $user->id && 
            $task->assigned_user_id !== $user->id
        ) {
            return response()->json(['message' => 'Access denied to view time logs for this task'], 403);
        }

        $timeLogs = $task->timeLogs()
                         ->with('user:id,name') // Load user info
                         ->get();

        return response()->json($timeLogs);
    }

    /**
     * Store a new time log for a specific task.
     * This method will replace any existing time log for the task.
     *
     * @param Request $request
     * @param Task $task
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeTimeLog(Request $request, Task $task)
    {
        // Authorization: User should be project owner, task assignee, or task creator to log time
        $user = $request->user();
        $project = $task->project;

        if (
            $project->created_by !== $user->id &&
            $task->assigned_user_id !== $user->id &&
            $task->created_by !== $user->id
        ) {
            return response()->json(['message' => 'Forbidden to log time for this task'], 403);
        }

        $validatedData = $request->validate([
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            'description' => 'nullable|string|max:1000',
            'user_id' => 'nullable|exists:users,id',
            // task_id will be from the route model binding ($task)
        ]);

        DB::beginTransaction();
        try {
            // Check if task already has a time log
            $existingTimeLog = $task->timeLogs()->first();
            
            if ($existingTimeLog) {
                // Update existing time log
                $existingTimeLog->update([
                    'user_id' => $validatedData['user_id'] ?? $user->id,
                    'start_time' => $validatedData['start_time'],
                    'end_time' => $validatedData['end_time'] ?? null,
                    'description' => $validatedData['description'] ?? null,
                ]);
                
                $timeLog = $existingTimeLog;
            } else {
                // Create a new time log
                $timeLog = $task->timeLogs()->create([
                    'user_id' => $validatedData['user_id'] ?? $user->id,
                    'start_time' => $validatedData['start_time'],
                    'end_time' => $validatedData['end_time'] ?? null,
                    'description' => $validatedData['description'] ?? null,
                ]);
            }
            
            DB::commit();
            
            // Load the user relationship for the response
            return response()->json($timeLog->load('user:id,name'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to save time log: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing time log or create a new one if none exists
     * 
     * @param Request $request
     * @param Task $task
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateTimeLog(Request $request, Task $task)
    {
        // Authorization: User should be project owner, task assignee, or task creator to update time log
        $user = $request->user();
        $project = $task->project;

        if (
            $project->created_by !== $user->id &&
            $task->assigned_user_id !== $user->id &&
            $task->created_by !== $user->id
        ) {
            return response()->json(['message' => 'Forbidden to update time log for this task'], 403);
        }

        $validatedData = $request->validate([
            'start_time' => 'sometimes|required|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            'description' => 'nullable|string|max:1000',
            'user_id' => 'nullable|exists:users,id',
        ]);

        DB::beginTransaction();
        try {
            // Find existing time log or create new one
            $timeLog = $task->timeLogs()->first();
            
            if ($timeLog) {
                // Update only the fields that are present in the request
                $updateData = [];
                
                if (isset($validatedData['start_time'])) {
                    $updateData['start_time'] = $validatedData['start_time'];
                }
                
                if (array_key_exists('end_time', $validatedData)) {
                    $updateData['end_time'] = $validatedData['end_time'];
                }
                
                if (isset($validatedData['description'])) {
                    $updateData['description'] = $validatedData['description'];
                }
                
                if (isset($validatedData['user_id'])) {
                    $updateData['user_id'] = $validatedData['user_id'];
                }
                
                $timeLog->update($updateData);
            } else {
                // Create new time log
                $timeLog = $task->timeLogs()->create([
                    'user_id' => $validatedData['user_id'] ?? $user->id,
                    'start_time' => $validatedData['start_time'],
                    'end_time' => $validatedData['end_time'] ?? null,
                    'description' => $validatedData['description'] ?? null,
                ]);
            }
            
            DB::commit();
            
            return response()->json($timeLog->load('user:id,name'));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update time log: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete the time log for a task
     * 
     * @param Task $task
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteTimeLog(Task $task)
    {
        $user = request()->user();
        $project = $task->project;
        
        if (
            $project->created_by !== $user->id &&
            $task->created_by !== $user->id && 
            $task->assigned_user_id !== $user->id
        ) {
            return response()->json(['message' => 'Access denied to delete time log for this task'], 403);
        }
        
        $timeLog = $task->timeLogs()->first();
        
        if (!$timeLog) {
            return response()->json(['message' => 'No time log found for this task'], 404);
        }
        
        $timeLog->delete();
        
        return response()->json(['message' => 'Time log deleted successfully'], 200);
    }

    public function projectTasks($project_id)
    {
        $project = Project::find($project_id);
        
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }
        
        // Check if the user is the project owner
        if (auth('sanctum')->id() !== $project->created_by) {
            return response()->json(['message' => 'Access denied to this project'], 403);
        }
        
        return response()->json(Task::where('project_id', $project_id)->with('timeLogs')->get());
    }

    public function tasksByStatus($status)
    {
        $userId = auth('sanctum')->id();
        
        // Only return tasks that the user has access to
        $tasks = Task::where('status', $status)
            ->where(function($query) use ($userId) {
                $query->where('created_by', $userId)
                    ->orWhere('assigned_user_id', $userId)
                    ->orWhereHas('project', function($q) use ($userId) {
                        $q->where('created_by', $userId);
                    });
            })
            ->get();
            
        return response()->json($tasks);
    }
}
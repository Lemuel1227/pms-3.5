<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\TimeLog;
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
            $hasAccess = $project->created_by == $userId || $project->teamMembers->contains('user_id', $userId);
            
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

        $tasks = $query->with(['project', 'assignedUser', 'timeLogs', 'owner'])->get();

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
        $validatedData['notify_assigned'] = isset($validatedData['assigned_user_id']) && $validatedData['assigned_user_id'] !== auth('sanctum')->id();

        $project = Project::find($validatedData['project_id']);
        if (!$project || auth('sanctum')->id() !== $project->created_by) {
            return response()->json(['message' => 'Cannot add task to this project'], 403);
        }

        DB::beginTransaction();
        try {
            $timeLogsData = isset($validatedData['time_logs']) ? $validatedData['time_logs'] : null;
            unset($validatedData['time_logs']);
            
            $task = Task::create($validatedData);
            
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
        $project = $task->project;

        if (
            $project->created_by !== $user->id &&
            $task->created_by !== $user->id &&
            $task->assigned_user_id !== $user->id
        ) {
            return response()->json(['message' => 'Access denied to view this task'], 403);
        }

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
        
        if ($userId !== $project->created_by && $userId !== $task->created_by && $userId !== $task->assigned_user_id) {
            return response()->json(['message' => 'Forbidden'], 403);
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
            'assigned_user_id' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'time_logs' => 'nullable|array',
            'time_logs.id' => 'nullable|exists:time_logs,id',
            'time_logs.start_time' => 'required_with:time_logs|date',
            'time_logs.end_time' => 'nullable|date|after_or_equal:time_logs.start_time',
            'time_logs.user_id' => 'nullable|exists:users,id',
        ]);

        unset($validatedData['created_by']);
        
        // Set notify_assigned if assigned_user_id changes to a new user
        if (isset($validatedData['assigned_user_id']) && $validatedData['assigned_user_id'] !== $task->assigned_user_id) {
            $validatedData['notify_assigned'] = $validatedData['assigned_user_id'] !== $userId;
        }

        DB::beginTransaction();
        try {
            $timeLogsData = isset($validatedData['time_logs']) ? $validatedData['time_logs'] : null;
            unset($validatedData['time_logs']);
            
            $task->update($validatedData);
            
            if ($timeLogsData) {
                if (isset($timeLogsData['id'])) {
                    $timeLog = TimeLog::findOrFail($timeLogsData['id']);
                    
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
                    $existingTimeLog = $task->timeLogs()->first();
                    
                    if ($existingTimeLog) {
                        $existingTimeLog->update([
                            'start_time' => $timeLogsData['start_time'],
                            'end_time' => $timeLogsData['end_time'] ?? null,
                            'user_id' => $timeLogsData['user_id'] ?? $userId,
                            'description' => $timeLogsData['description'] ?? null,
                        ]);
                    } else {
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
         
        if ($userId !== $project->created_by && $userId !== $task->created_by) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $task->delete();

        return response()->json(['message' => 'Task deleted successfully'], 200);
    }

    public function indexTimeLogs(Task $task)
    {
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
                         ->with('user:id,name')
                         ->get();

        return response()->json($timeLogs);
    }

    public function storeTimeLog(Request $request, Task $task)
    {
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
        ]);

        DB::beginTransaction();
        try {
            $existingTimeLog = $task->timeLogs()->first();
            
            if ($existingTimeLog) {
                $existingTimeLog->update([
                    'user_id' => $validatedData['user_id'] ?? $user->id,
                    'start_time' => $validatedData['start_time'],
                    'end_time' => $validatedData['end_time'] ?? null,
                    'description' => $validatedData['description'] ?? null,
                ]);
                
                $timeLog = $existingTimeLog;
            } else {
                $timeLog = $task->timeLogs()->create([
                    'user_id' => $validatedData['user_id'] ?? $user->id,
                    'start_time' => $validatedData['start_time'],
                    'end_time' => $validatedData['end_time'] ?? null,
                    'description' => $validatedData['description'] ?? null,
                ]);
            }
            
            DB::commit();
            
            return response()->json($timeLog->load('user:id,name'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to save time log: ' . $e->getMessage()], 500);
        }
    }

    public function updateTimeLog(Request $request, Task $task)
    {
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
            $timeLog = $task->timeLogs()->first();
            
            if ($timeLog) {
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
        
        $userId = auth('sanctum')->id();
        $hasAccess = $project->created_by == $userId || $project->teamMembers->contains('user_id', $userId);
        
        if (!$hasAccess) {
            return response()->json(['message' => 'Access denied to this project'], 403);
        }
        
        return response()->json(Task::where('project_id', $project_id)->with('timeLogs')->get());
    }

    public function tasksByStatus($status)
    {
        $userId = auth('sanctum')->id();
        
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

    public function notifyTaskAssignments(Request $request)
    {
        $userId = auth('sanctum')->id();
        
        $tasks = Task::where('assigned_user_id', $userId)
                     ->where('notify_assigned', true)
                     ->with(['project:id,name', 'owner:id,name'])
                     ->get();
        
        return response()->json($tasks);
    }

    public function acknowledgeTaskAssignment(Task $task)
    {
        $userId = auth('sanctum')->id();
        
        if ($task->assigned_user_id !== $userId) {
            return response()->json(['message' => 'You are not assigned to this task'], 403);
        }
        
        if (!$task->notify_assigned) {
            return response()->json(['message' => 'No notification to acknowledge'], 400);
        }
        
        $task->update(['notify_assigned' => false]);
        
        return response()->json(['message' => 'Task assignment acknowledged']);
    }
}
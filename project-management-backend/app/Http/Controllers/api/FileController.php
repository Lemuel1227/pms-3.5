<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB
        ]);

        $user = $request->user();
        $project = $task->project;

        // Check if user has access to the task
        if (
            $project->created_by !== $user->id &&
            $task->assigned_user_id !== $user->id &&
            $task->created_by !== $user->id
        ) {
            return response()->json(['message' => 'Forbidden to upload files for this task'], 403);
        }

        $uploadedFile = $request->file('file');
        $originalName = $uploadedFile->getClientOriginalName();
        $extension = $uploadedFile->getClientOriginalExtension();
        
        // Generate a unique filename
        $filename = Str::random(40) . '.' . $extension;
        
        // Store the file in the storage/app/public/task-files directory
        $path = $uploadedFile->storeAs('task-files', $filename, 'public');

        // Create file record in database
        $file = File::create([
            'task_id' => $task->id,
            'filename' => $originalName,
            'filepath' => $path,
        ]);

        return response()->json($file, 201);
    }

    public function index(Task $task)
    {
        $user = request()->user();
        $project = $task->project;

        // Check if user has access to the task
        if (
            $project->created_by !== $user->id &&
            $task->assigned_user_id !== $user->id &&
            $task->created_by !== $user->id
        ) {
            return response()->json(['message' => 'Access denied to view files for this task'], 403);
        }

        $files = $task->files;
        return response()->json($files);
    }

    public function destroy(Task $task, File $file)
    {
        $user = request()->user();
        $project = $task->project;

        // Check if user has access to the task
        if (
            $project->created_by !== $user->id &&
            $task->assigned_user_id !== $user->id &&
            $task->created_by !== $user->id
        ) {
            return response()->json(['message' => 'Forbidden to delete files for this task'], 403);
        }

        // Delete the file from storage
        Storage::disk('public')->delete($file->filepath);

        // Delete the file record
        $file->delete();

        return response()->json(['message' => 'File deleted successfully']);
    }

    public function download(Task $task, File $file)
    {
        $user = request()->user();
        $project = $task->project;

        // Check if user has access to the task
        if (
            $project->created_by !== $user->id &&
            $task->assigned_user_id !== $user->id &&
            $task->created_by !== $user->id
        ) {
            return response()->json(['message' => 'Access denied to download files for this task'], 403);
        }

        // Check if file exists in storage
        if (!Storage::disk('public')->exists($file->filepath)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return Storage::disk('public')->download($file->filepath, $file->filename);
    }
} 
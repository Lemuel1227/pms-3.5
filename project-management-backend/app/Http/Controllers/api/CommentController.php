<?php

namespace App\Http\Controllers\api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Task;

class CommentController extends Controller
{
    public function store(Request $request, Task $task) {
        $comment = $task->comments()->create([
            'user_id' => auth('sanctum')->id(),
            'message' => $request->message
        ]);
    
        // Optional: Broadcast new comment event
    
        return response()->json($comment);
    }
        
    public function index(Task $task) {
        return response()->json($task->comments()->with('user')->get());
    }
}

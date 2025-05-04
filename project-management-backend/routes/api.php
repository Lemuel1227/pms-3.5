<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\api\ProjectController;
use App\Http\Controllers\api\TaskController;
use App\Http\Controllers\api\AuthController;
use App\Http\Controllers\api\UserController;
use App\Http\Controllers\CommentController;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('projects', ProjectController::class);
    Route::get('projects/{project}/tasks', [TaskController::class, 'projectTasks']);
    Route::apiResource('tasks', TaskController::class);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('tasks/status/{status}', [TaskController::class, 'tasksByStatus']);
    Route::get('/users', [UserController::class, 'index']); 

    Route::get('/tasks/{task}/timelogs', [TaskController::class, 'indexTimeLogs']);
    Route::post('/tasks/{task}/timelogs', [TaskController::class, 'storeTimeLog']);

    Route::post('/tasks/{task}/comments', [CommentController::class, 'store']);
    Route::get('/tasks/{task}/comments', [CommentController::class, 'index']);

});

Route::apiResource('projects', ProjectController::class);

Route::apiResource('tasks', TaskController::class);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    
});
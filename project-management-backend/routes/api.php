<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\api\ProjectController;
use App\Http\Controllers\api\TaskController;
use App\Http\Controllers\api\AuthController;
use App\Http\Controllers\api\UserController;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('projects', ProjectController::class);
    Route::get('projects/{project}/tasks', [TaskController::class, 'projectTasks']);
    Route::apiResource('tasks', TaskController::class);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('tasks/status/{status}', [TaskController::class, 'tasksByStatus']);
    Route::get('/users', [UserController::class, 'index']); 
});

Route::apiResource('projects', ProjectController::class);

Route::apiResource('tasks', TaskController::class);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    
});
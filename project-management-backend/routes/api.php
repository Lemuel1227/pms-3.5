<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\api\ProjectController;
use App\Http\Controllers\api\TaskController;

Route::apiResource('projects', ProjectController::class);
Route::get('projects/{project}/tasks', [TaskController::class, 'projectTasks']);

Route::apiResource('tasks', TaskController::class);
Route::get('tasks/status/{status}', [TaskController::class, 'tasksByStatus']);
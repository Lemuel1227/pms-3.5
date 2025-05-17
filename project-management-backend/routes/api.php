<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\api\ProjectController;
use App\Http\Controllers\api\TaskController;
use App\Http\Controllers\api\AuthController;
use App\Http\Controllers\api\UserController;
use App\Http\Controllers\api\CommentController;
use App\Http\Controllers\api\TeamMemberController;
use App\Http\Controllers\api\BudgetController;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('projects', ProjectController::class);
    Route::get('projects/{project}/tasks', [TaskController::class, 'projectTasks']);
    Route::apiResource('tasks', TaskController::class);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('tasks/status/{status}', [TaskController::class, 'tasksByStatus']);

    Route::get('/users', [UserController::class, 'index']); 
    Route::get('/user', [UserController::class, 'show']);

    Route::get('/tasks/{task}/timelogs', [TaskController::class, 'indexTimeLogs']);
    Route::post('/tasks/{task}/timelogs', [TaskController::class, 'storeTimeLog']);

    Route::post('/tasks/{task}/comments', [CommentController::class, 'store']);
    Route::get('/tasks/{task}/comments', [CommentController::class, 'index']);

    Route::get('/task-notifications', [TaskController::class, 'notifyTaskAssignments']);
    Route::get('/tasks/{task}/acknowledge', [TaskController::class, 'acknowledgeTaskAssignment']);

    Route::get('/invitations', [TeamMemberController::class, 'invitations'])->name('invitations');

    Route::prefix('projects/{project}/team')->name('projects.team.')->middleware(['auth:sanctum'])->group(function () {
        Route::get('/', [TeamMemberController::class, 'index'])->name('index');
        Route::post('/invite', [TeamMemberController::class, 'store'])->name('store');
        Route::put('/{teamMember}', [TeamMemberController::class, 'update'])->name('update');
        Route::get('/{teamMember}/accept', [TeamMemberController::class, 'acceptInvitation'])->name('accept');
        Route::delete('/{teamMember}', [TeamMemberController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('projects/{project}')->group(function () {
        Route::get('budgets', [BudgetController::class, 'index']);
        Route::post('budgets', [BudgetController::class, 'store']);
        Route::put('budgets/{budget}', [BudgetController::class, 'update']);
        Route::delete('budgets/{budget}', [BudgetController::class, 'destroy']);
    });
});

Route::apiResource('projects', ProjectController::class);

Route::apiResource('tasks', TaskController::class);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    
});
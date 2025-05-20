<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    /**
     * Display a listing of budgets for a project.
     *
     * @param Project $project
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Project $project)
    {
        $userId = auth('sanctum')->id();

        $hasAccess = $project->created_by == $userId || $project->teamMembers->contains('user_id', $userId);

        if (!$hasAccess) {
            return response()->json(['message' => 'Access denied to this project'], 403);
        }

        $budgets = $project->budgets()->get();

        return response()->json($budgets);
    }

    /**
     * Store a new budget for a project.
     *
     * @param Request $request
     * @param Project $project
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request, Project $project)
    {
        $userId = auth('sanctum')->id();

        if ($project->created_by !== $userId) {
            return response()->json(['message' => 'Access denied to this project'], 403);
        }

        $validatedData = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:1000',
        ]);

        $currentTotal = $project->budgets()->sum('amount');
        $newTotal = $currentTotal + $validatedData['amount'];

        if (!$project->budget){
            return response()->json(['message' => 'No Budget allocated for the project'], 422);
        }
        
        if ($newTotal > $project->budget) {
            return response()->json(['message' => 'Budget amount exceeds the project\'s remaining budget'], 422);
        }

        DB::beginTransaction();
        try {
            $budget = $project->budgets()->create([
                'amount' => $validatedData['amount'],
                'description' => $validatedData['description'] ?? null,
            ]);

            DB::commit();
            return response()->json($budget, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create budget: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing budget.
     *
     * @param Request $request
     * @param Project $project
     * @param Budget $budget
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, Project $project, Budget $budget)
    {
        $userId = auth('sanctum')->id();

        if ($project->created_by !== $userId) {
            return response()->json(['message' => 'Access denied to this project'], 403);
        }

        if ($budget->project_id !== $project->id) {
            return response()->json(['message' => 'Budget does not belong to this project'], 403);
        }

        $validatedData = $request->validate([
            'amount' => 'sometimes|required|numeric|min:0.01',
            'description' => 'nullable|string|max:1000',
        ]);

        $currentTotal = $project->budgets()->where('id', '!=', $budget->id)->sum('amount');
        $newAmount = $validatedData['amount'] ?? $budget->amount;
        $newTotal = $currentTotal + $newAmount;

        if ($newTotal > $project->budget) {
            return response()->json(['message' => 'Updated budget amount exceeds the project\'s remaining budget'], 422);
        }

        DB::beginTransaction();
        try {
            $budget->update([
                'amount' => $validatedData['amount'] ?? $budget->amount,
                'description' => $validatedData['description'] ?? $budget->description,
            ]);

            DB::commit();
            return response()->json($budget);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update budget: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Remove a budget from a project.
     *
     * @param Project $project
     * @param Budget $budget
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Project $project, Budget $budget)
    {
        $userId = auth('sanctum')->id();

        if ($project->created_by !== $userId) {
            return response()->json(['message' => 'Access denied to this project'], 403);
        }

        if ($budget->project_id !== $project->id) {
            return response()->json(['message' => 'Budget does not belong to this project'], 403);
        }

        DB::beginTransaction();
        try {
            $budget->delete();
            DB::commit();
            return response()->json(['message' => 'Budget deleted successfully'], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to delete budget: ' . $e->getMessage()], 500);
        }
    }
}
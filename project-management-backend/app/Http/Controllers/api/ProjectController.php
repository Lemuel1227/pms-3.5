<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Project;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function index()
    {
        $userId = auth('sanctum')->id();
        
        $projects = Project::where('created_by', $userId)->with('owner')
            ->orWhereHas('teamMembers', function ($query) use ($userId) {
                $query->where('user_id', $userId)
                      ->where('status', 'accepted');
            })
            ->latest()
            ->get();

        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => [
                'nullable',
                Rule::in(['Not Started', 'In Progress', 'On Hold', 'Completed']),
            ],
            'budget' => 'nullable|numeric|min:0',
        ]);

        $validatedData['created_by'] = auth('sanctum')->id();
        $validatedData['status'] = $validatedData['status'] ?? 'Not Started';

        $project = Project::create($validatedData);

        return response()->json($project->load('owner'), 201);
    }

    public function show(Project $project)
    {
        $userId = auth('sanctum')->id();

        $isAcceptedMember = $project->teamMembers()
            ->where('user_id', $userId)
            ->where('status', 'accepted')
            ->exists();

        if ($userId !== $project->created_by && !$isAcceptedMember) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($project->load(['tasks', 'owner']));
    }

    public function update(Request $request, Project $project)
    {
        $userId = auth('sanctum')->id();

        $isAcceptedMember = $project->teamMembers()
            ->where('user_id', $userId)
            ->where('status', 'accepted')
            ->exists();

        if ($userId !== $project->created_by && !$isAcceptedMember) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => [
                'sometimes',
                'required',
                Rule::in(['Not Started', 'In Progress', 'On Hold', 'Completed']),
            ],
            'budget' => 'nullable|numeric|min:0',
        ]);

        $project->update($validatedData);

        return response()->json($project->load('owner'));
    }

    public function destroy(Project $project)
    {
        $userId = auth('sanctum')->id();

        $isAcceptedMember = $project->teamMembers()
            ->where('user_id', $userId)
            ->where('status', 'accepted')
            ->exists();

        if ($userId !== $project->created_by && !$isAcceptedMember) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $project->delete();

        return response()->json(null, 204);
    }
}
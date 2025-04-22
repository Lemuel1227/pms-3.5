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
        // In a real app, you might want to filter projects based on user roles/assignments
        // For now, let's get all projects or projects created by the user
        // $projects = Project::where('created_by', auth('sanctum')->id())->orWhereHas('members', function($q) { // Assuming a members relationship later
        //     $q->where('user_id', auth('sanctum')->id());
        // })->with('owner')->latest()->get();

        // Simple version: Get all projects created by the logged-in user
        $projects = Project::where('created_by', auth('sanctum')->id())->with('owner')->latest()->get();
        
        // Or simply get all projects if visibility isn't restricted yet
        // $projects = Project::with('owner')->latest()->get();

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
                Rule::in(['Not Started', 'In Progress', 'On Hold', 'Completed']), // Use migration values
            ],
        ]);

        // Add the authenticated user as the creator
        $validatedData['created_by'] = auth('sanctum')->id();
        // Set default status if not provided
        $validatedData['status'] = $validatedData['status'] ?? 'Not Started';


        $project = Project::create($validatedData);

        // Return the created project with owner info
        return response()->json($project->load('owner'), 201); // 201 Created status
    }

    public function show(Project $project)
    {
         // Optional: Add authorization check - can the current user view this project?
         // if (auth('sanctum')->id() !== $project->created_by /* && !user is member etc. */) {
         //    return response()->json(['message' => 'Forbidden'], 403);
         // }

        // Eager load tasks and owner relationships
        return response()->json($project->load(['tasks', 'owner']));
    }

    public function update(Request $request, Project $project)
    {
         // Optional: Add authorization check - can the current user update this project?
         // if (auth('sanctum')->id() !== $project->created_by) {
         //    return response()->json(['message' => 'Forbidden'], 403);
         // }

        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255', // 'sometimes' means validate only if present
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
             'status' => [
                'sometimes',
                'required',
                Rule::in(['Not Started', 'In Progress', 'On Hold', 'Completed']), // Use migration values
            ],
        ]);

        $project->update($validatedData);

        // Return the updated project with owner info
        return response()->json($project->load('owner'));
    }

    public function destroy(Project $project)
    {
         // Optional: Add authorization check - can the current user delete this project?
         // if (auth('sanctum')->id() !== $project->created_by) {
         //    return response()->json(['message' => 'Forbidden'], 403);
         // }

        $project->delete(); // This will also cascade delete tasks due to migration constraint

        return response()->json(null, 204); // 204 No Content status
    }
}

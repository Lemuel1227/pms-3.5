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
      
        // $projects = Project::where('created_by', auth('sanctum')->id())->orWhereHas('members', function($q) { // Assuming a members relationship later
        //     $q->where('user_id', auth('sanctum')->id());
        // })->with('owner')->latest()->get();

        $projects = Project::where('created_by', auth('sanctum')->id())->with('owner')->latest()->get();

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
        ]);

        $validatedData['created_by'] = auth('sanctum')->id();

        $validatedData['status'] = $validatedData['status'] ?? 'Not Started';

        $project = Project::create($validatedData);

        return response()->json($project->load('owner'), 201); 
    }

    public function show(Project $project)
    {
         // if (auth('sanctum')->id() !== $project->created_by /* && !user is member etc. */) {
         //    return response()->json(['message' => 'Forbidden'], 403);
         // }

        return response()->json($project->load(['tasks', 'owner']));
    }

    public function update(Request $request, Project $project)
    {
         // if (auth('sanctum')->id() !== $project->created_by) {
         //    return response()->json(['message' => 'Forbidden'], 403);
         // }

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
        ]);

        $project->update($validatedData);

        return response()->json($project->load('owner'));
    }

    public function destroy(Project $project)
    {
         // if (auth('sanctum')->id() !== $project->created_by) {
         //    return response()->json(['message' => 'Forbidden'], 403);
         // }

        $project->delete(); 

        return response()->json(null, 204); 
    }
}

<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Project;

class ProjectController extends Controller
{
    public function index()
    {
        return Project::with('user')->get();
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|max:255',
            'description' => 'nullable',
            'user_id' => 'required|exists:users,id'
        ]);

        return Project::create($validatedData);
    }

    public function show($id)
    {
        return Project::with('tasks', 'user')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $project = Project::findOrFail($id);

        $validatedData = $request->validate([
            'name' => 'sometimes|required|max:255',
            'description' => 'nullable',
            'user_id' => 'sometimes|required|exists:users,id'
        ]);

        $project->update($validatedData);
        return $project;
    }

    public function destroy($id)
    {
        $project = Project::findOrFail($id);
        $project->delete();
        return response()->json(null, 204);
    }
}

<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;

class TeamMemberController extends Controller
{
    public function invitations()
    {
        $userId = auth('sanctum')->id();
        $invitations = TeamMember::where('user_id', $userId)
            ->where('status', 'pending')
            ->with(['project', 'invited_by_user'])
            ->get();

        return response()->json($invitations);
    }

    public function index($projectId)
    {
        $project = Project::findOrFail($projectId);
        
        if (!Gate::allows('view', $project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $teamMembers = $project->teamMembers()->with('user:id,name,email')->get();
        
        return response()->json([
            'team_members' => $teamMembers,
            'project' => [
                'id' => $project->id,
                'name' => $project->name
            ]
        ]);
    }

    public function store(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        if (!Gate::allows('view', $project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'role' => ['required', Rule::in(['member'])],
        ]);
        
        $user = User::where('email', $validated['email'])->first();
        
        if (!auth('sanctum')->id()) {
            return response()->json(['message' => 'Invalid inviter'], 403);
        }
        
        $invited_by = auth('sanctum')->id();

        $existingMember = TeamMember::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->first();
            
        if ($existingMember) {
            return response()->json([
                'message' => 'User is already a member of this project.'
            ], 422);
        }
        
        $teamMember = TeamMember::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'role' => $validated['role'],
            'status' => 'pending',
            'invited_by' => $invited_by,
        ]);
        
        return response()->json([
            'message' => 'Team member invitation sent successfully.',
            'team_member' => $teamMember->load('user:id,name,email')
        ], 201);
    }

    public function update(Request $request, $projectId, $teamMemberId)
    {
        $project = Project::findOrFail($projectId);
        
        if (!Gate::allows('view', $project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $teamMember = TeamMember::where('project_id', $project->id)
            ->where('id', $teamMemberId)
            ->firstOrFail();
        
        $validated = $request->validate([
            'role' => ['sometimes', 'required', Rule::in(['member'])],
            'status' => ['sometimes', 'required', Rule::in(['pending', 'accepted'])],
        ]);
        
        $teamMember->update($validated);
        
        return response()->json([
            'message' => 'Team member updated successfully.',
            'team_member' => $teamMember->fresh()->load('user:id,name,email')
        ]);
    }

    public function acceptInvitation($projectId, $teamMemberId)
    {
        $project = Project::findOrFail($projectId);
        
        try {
            $teamMember = TeamMember::where('project_id', $project->id)
                ->where('id', $teamMemberId)
                ->where('user_id', Auth::id())
                ->where('status', 'pending')
                ->firstOrFail();
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Invitation not found or already accepted.'
            ], 404);
        }
        
        $teamMember->update(['status' => 'accepted']);
        
        return response()->json([
            'message' => 'You have successfully joined the project team.',
            'team_member' => $teamMember->fresh()->load('user:id,name,email')
        ]);
    }

    public function destroy($projectId, $teamMemberId)
    {
        $project = Project::findOrFail($projectId);
        $teamMember = TeamMember::where('project_id', $project->id)
            ->where('id', $teamMemberId)
            ->firstOrFail();
        
        if ($project->created_by != Auth::id() && $teamMember->user_id != Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        if ($teamMember->role === 'project_creator') {
            return response()->json([
                'message' => 'The project creator cannot be removed from the project.'
            ], 422);
        }
        
        $teamMember->delete();
        
        return response()->json([
            'message' => 'Team member removed successfully.'
        ]);
    }
}
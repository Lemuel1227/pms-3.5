<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeamMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'project_id',
        'role',
        'status',
        'invited_by',
    ];

    protected $with = ['user'];

    /**
     * Get the user associated with the team member.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the project this team member is part of.
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function invited_by_user()
{
    return $this->belongsTo(User::class, 'invited_by');
}
}

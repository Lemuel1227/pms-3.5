<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',   
        'title',
        'description',
        'status',       
        'priority',    
        'assigned_user_id',  
        'created_by', 
        'time_log',
        'budget'
    ];

    protected $casts = [
        'budget' => 'decimal:2',
    ];

    public function save(array $options = [])
    {
        $project = $this->project;

        if ($project) {
            $existingTaskBudgets = $project->tasks()->where('id', '!=', $this->id)->sum('budget');
            $newTotal = $existingTaskBudgets + ($this->budget ?? 0);

            if ($newTotal > $project->budget) {
                throw new \Exception('Task budget exceeds project budget.');
            }
        }

        return parent::save($options);
    }

    
    public function owner()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function timeLogs()
    {
        return $this->hasOne(TimeLog::class);
    }
}

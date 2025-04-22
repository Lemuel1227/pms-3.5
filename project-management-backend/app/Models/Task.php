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
        'due_date',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];
    
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

    
}

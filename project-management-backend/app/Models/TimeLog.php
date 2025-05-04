<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Task;

class TimeLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'task_id',
        'start_time',
        'end_time',
        'description',
    ];

    protected $casts = [
        'start_time' => 'datetime', 
        'end_time' => 'datetime',  
    ];

    protected $appends = [
        'hours_spent' 
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function project()
    {
        return $this->task->project();
    }

    public function getHoursSpentAttribute(): ?float
    {
        if ($this->start_time && $this->end_time) {
            // Use Carbon's diffInSeconds for precise calculation, then convert to hours
            return round($this->start_time->diffInSeconds($this->end_time) / 3600, 2);
        }
        return null; // Or 0.0 if preferred when duration can't be calculated
    }
}
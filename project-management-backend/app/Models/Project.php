<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 
        'description', 
        'start_date',
        'end_date',
        'status',
        'created_by',
        'budget',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'budget' => 'decimal:2',
    ];

    protected $appends = ['computed_status'];

    public function owner()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function timeLog()
    {
        return $this->hasManyThrough(TimeLog::class, Task::class);
    }

    public function budgets()
    {
        return $this->hasMany(Budget::class);
    }

    public function teamMembers()
    {
        return $this->hasMany(TeamMember::class);
    }    

    public function remainingBudget()
    {
        return $this->budget - $this->budgets()->sum('amount');
    }

    /**
     * Get the computed status based on the current date and project timeline.
     * 
     * @return string
     */
    public function getComputedStatusAttribute()
    {
        $now = Carbon::now();
        $startDate = $this->start_date ? Carbon::parse($this->start_date) : null;
        $endDate = $this->end_date ? Carbon::parse($this->end_date) : null;
        
        // If no dates are set, return the manual status
        if (!$startDate && !$endDate) {
            return $this->status;
        }
        
        // Determine status based on date
        if ($startDate && $endDate) {
            if ($now < $startDate) {
                return 'Not Started';
            } elseif ($now > $endDate) {
                return 'Completed';
            } else {
                return 'In Progress';
            }
        } elseif ($startDate && !$endDate) {
            if ($now < $startDate) {
                return 'Not Started';
            } else {
                return 'In Progress';
            }
        } elseif (!$startDate && $endDate) {
            if ($now > $endDate) {
                return 'Completed';
            } else {
                return 'In Progress';
            }
        }
        
        return $this->status;
    }
}
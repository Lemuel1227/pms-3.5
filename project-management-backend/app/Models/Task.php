<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

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
        'notify_assigned',
        'created_by',
        'time_log',
    ];
    
    /**
     * Update the task status based on time logs
     */
    public function updateStatusBasedOnTimeLogs()
    {
        // Only update if time logs exist
        if ($this->timeLogs) {
            $now = Carbon::now();
            $startTime = $this->timeLogs->start_time ? Carbon::parse($this->timeLogs->start_time) : null;
            $endTime = $this->timeLogs->end_time ? Carbon::parse($this->timeLogs->end_time) : null;
            
            // If both start and end time exist
            if ($startTime && $endTime) {
                if ($now->lt($startTime)) {
                    $this->status = 'pending';
                } elseif ($now->gt($endTime)) {
                    $this->status = 'completed';
                } else {
                    $this->status = 'in progress';
                }
            }
            // If only start time exists
            elseif ($startTime && !$endTime) {
                if ($now->lt($startTime)) {
                    $this->status = 'pending';
                } else {
                    $this->status = 'in progress';
                }
            }
            // If only end time exists
            elseif (!$startTime && $endTime) {
                if ($now->gt($endTime)) {
                    $this->status = 'completed';
                } else {
                    $this->status = 'in progress';
                }
            }
        }
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

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }
    
    /**
     * Get the computed status based on time logs
     */
    public function getComputedStatusAttribute()
    {
        if (!$this->timeLogs || (!$this->timeLogs->start_time && !$this->timeLogs->end_time)) {
            return $this->status;
        }
        
        $now = Carbon::now();
        $startTime = $this->timeLogs->start_time ? Carbon::parse($this->timeLogs->start_time) : null;
        $endTime = $this->timeLogs->end_time ? Carbon::parse($this->timeLogs->end_time) : null;
        
        if ($startTime && $endTime) {
            if ($now->lt($startTime)) {
                return 'pending';
            } elseif ($now->gt($endTime)) {
                return 'completed';
            } else {
                return 'in progress';
            }
        } elseif ($startTime && !$endTime) {
            if ($now->lt($startTime)) {
                return 'pending';
            } else {
                return 'in progress';
            }
        } elseif (!$startTime && $endTime) {
            if ($now->gt($endTime)) {
                return 'completed';
            } else {
                return 'in progress';
            }
        }
        
        return $this->status;
    }

    public function files()
    {
        return $this->hasMany(File::class);
    }
}
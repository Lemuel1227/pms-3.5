<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Project;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'amount',
        'description',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];
    
    /**
     * Get the project that owns the budget.
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

}

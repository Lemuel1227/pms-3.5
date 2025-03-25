<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    protected $model = Task::class;

    public function definition()
    {
        return [
            'project_id' => Project::factory(),
            'task_name' => $this->faker->sentence(4),
            'status' => $this->faker->randomElement(['pending', 'in_progress', 'completed']),
            'deadline' => $this->faker->dateTimeBetween('now', '+3 months'),
            'assigned_user_id' => User::factory(),
        ];
    }
}

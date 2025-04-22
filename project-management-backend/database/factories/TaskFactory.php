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

    public function definition(): array
    {
        return [
            'title' => ucfirst(fake()->words(3, true)), // e.g., "Implement user authentication"
            'description' => fake()->paragraph(1),
            'status' => fake()->randomElement(['pending', 'in progress', 'completed']), // Use values from migration
            'priority' => fake()->randomElement(['low', 'medium', 'high']),         // Use values from migration
            'due_date' => fake()->optional(0.7)->dateTimeBetween('now', '+3 months')?->format('Y-m-d'), // 70% chance of having a due date
            // Foreign keys ('project_id', 'created_by', 'assigned_user_id') will be set in the Seeder
            // 'project_id' => Project::factory(), // Avoid creating new projects/users here for seeding efficiency
            // 'created_by' => User::factory(),
            // 'assigned_user_id' => fake()->optional(0.8)->randomElement(User::pluck('id')->toArray()) // Assign randomly 80% of the time (ensure users exist first)
        ];
    }
}

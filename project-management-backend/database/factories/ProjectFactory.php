<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    protected $model = Project::class;

    public function definition(): array
    {
        $startDate = fake()->dateTimeBetween('-1 month', '+1 month');
        $endDate = fake()->dateTimeBetween($startDate, '+6 months'); // Ensure end date is after start date

        return [
            'name' => fake()->company() . ' ' . fake()->bs(), // e.g., "Kling Inc strategize synergistic niches"
            'description' => fake()->paragraph(2),
            'start_date' => $startDate->format('Y-m-d'), // Format as date string
            'end_date' => $endDate->format('Y-m-d'),     // Format as date string
            'status' => fake()->randomElement(['Not Started', 'In Progress', 'On Hold', 'Completed']), // Use values from migration
            'created_by' => User::inRandomOrder()->first()?->id ?? User::factory(),// 'created_by' will be set in the Seeder using relationships
            // 'created_by' => User::factory(), // Or create a new user for each project (less efficient for seeding)
            // 'created_by' => User::inRandomOrder()->first()->id, // Or assign randomly (can fail if no users exist yet)
        ];
    }
}

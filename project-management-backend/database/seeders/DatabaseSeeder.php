<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // --- Create a Specific User for Testing ---
        $testUser = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('password'), // Ensure you hash the password
        ]);

        // --- Create Additional Random Users ---
        $otherUsers = User::factory(10)->create();
        // Combine the test user with other users for easier random assignment later
        $allUsers = $otherUsers->push($testUser); // Or use $allUsers = User::all(); if you prefer


        // --- Create Projects and Assign to Users ---
        // Create some projects specifically for the test user
        Project::factory(3)
            ->for($testUser, 'owner') // Use the 'owner' relationship defined in Project model
            ->create();

        // Create some projects for other random users
        $otherUsers->each(function ($user) {
            Project::factory(rand(1, 4)) // Each user gets 1 to 4 projects
                ->for($user, 'owner') // Assign the current user as the owner/creator
                ->create();
        });


        // --- Create Tasks for Projects ---
        // Get all projects created above
        $projects = Project::all();

        foreach ($projects as $project) {
            // For each project, create a random number of tasks (e.g., 5 to 15)
            Task::factory(rand(5, 15))->create([
                'project_id' => $project->id,
                // Set the task creator ('created_by') - often the project owner, but could be others
                'created_by' => $project->created_by, // Assign project owner as task creator
                // Assign the task ('assigned_user_id') randomly to any existing user, or leave null
                'assigned_user_id' => fake()->optional(0.8)->randomElement($allUsers->pluck('id')->toArray()), // 80% chance to assign
            ]);
        }

        // --- Alternative using nested relationships (more concise but sometimes less control) ---
        /*
        User::factory(5) // Create 5 users
            ->has(Project::factory()->count(3) // Each user has 3 projects
                ->has(Task::factory()->count(rand(5,10)) // Each project has 5-10 tasks
                    ->state(function (array $attributes, Project $project) use ($allUsers) {
                        // Use state to access parent project and all users
                        return [
                            'created_by' => $project->created_by, // Task creator is project owner
                            'assigned_user_id' => fake()->optional(0.8)->randomElement($allUsers->pluck('id')->toArray()), // Assign randomly
                        ];
                    })
                )
            )
            ->create();
        */

        // You can call other specific seeders here if you create them
        // $this->call([
        //     AnotherSeeder::class,
        // ]);
    }
}

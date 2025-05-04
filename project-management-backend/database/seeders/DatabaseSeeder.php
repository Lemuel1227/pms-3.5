<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\TimeLog;
use App\Models\User;
use Carbon\Carbon;
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
        $testUserProjects = Project::factory(3)
            ->for($testUser, 'owner') // Use the 'owner' relationship defined in Project model
            ->create();

        // Create some projects for other random users
        $otherProjects = collect();
        $otherUsers->each(function ($user) use (&$otherProjects) {
            $projects = Project::factory(rand(1, 4)) // Each user gets 1 to 4 projects
                ->for($user, 'owner') // Assign the current user as the owner/creator
                ->create();
            $otherProjects = $otherProjects->concat($projects);
        });

        // Combine all projects
        $allProjects = $testUserProjects->concat($otherProjects);

        // --- Create Tasks for Projects ---
        foreach ($allProjects as $project) {
            // For each project, create a random number of tasks
            $tasks = Task::factory(rand(5, 15))->create([
                'project_id' => $project->id,
                'created_by' => $project->created_by, // Assign project owner as task creator
                // Randomly assign tasks to users (with 80% probability of assignment)
                'assigned_user_id' => fake()->optional(0.8)->randomElement($allUsers->pluck('id')->toArray()),
            ]);

            // --- Create Time Logs for Tasks ---
            foreach ($tasks as $task) {
                // Determine if task has an assigned user
                $userId = $task->assigned_user_id;

                // If task is assigned, create time logs (not all tasks will have time logs)
                if ($userId && fake()->boolean(70)) { // 70% of assigned tasks have time logs
                    // Create between 1-5 time log entries for this task
                    $numLogs = rand(1, 5);
                    
                    for ($i = 0; $i < $numLogs; $i++) {
                        // Create realistic time log entries within the last month
                        $startDate = Carbon::now()->subDays(rand(0, 30))->setTime(rand(8, 17), rand(0, 59));
                        
                        // Log between 15 minutes to 4 hours of work
                        $duration = rand(15, 240); // minutes
                        $endDate = (clone $startDate)->addMinutes($duration);
                        
                        TimeLog::create([
                            'user_id' => $userId,
                            'task_id' => $task->id,
                            'start_time' => $startDate,
                            'end_time' => $endDate,
                            'description' => fake()->optional(0.7)->sentence(), // 70% chance to have a description
                        ]);
                    }
                }
            }
        }

        // Ensure test user has some active time logs for testing ongoing work
        $testUserTasks = Task::where('assigned_user_id', $testUser->id)->take(3)->get();
        
        foreach ($testUserTasks as $task) {
            // Create an active time log (with no end time) for test user
            if (fake()->boolean(30)) { // Only 30% chance to have active logs
                TimeLog::create([
                    'user_id' => $testUser->id,
                    'task_id' => $task->id,
                    'start_time' => Carbon::now()->subHours(rand(1, 4))->subMinutes(rand(1, 59)),
                    'end_time' => null, // Represents currently active work
                    'description' => 'Currently working on ' . fake()->sentence(3),
                ]);
            }
        }

        // --- Create additional time logs with various patterns for better testing ---
        // 1. Create some logs spanning multiple days for long-term tasks
        $longTermTasks = Task::inRandomOrder()->take(5)->get();
        foreach ($longTermTasks as $task) {
            if ($task->assigned_user_id) {
                // Create logs spanning over multiple days for reporting testing
                for ($day = 1; $day <= rand(3, 7); $day++) {
                    $logDate = Carbon::now()->subDays($day);
                    
                    TimeLog::create([
                        'user_id' => $task->assigned_user_id,
                        'task_id' => $task->id,
                        'start_time' => $logDate->copy()->setTime(9, 0),
                        'end_time' => $logDate->copy()->setTime(rand(10, 17), rand(0, 59)),
                        'description' => "Day $day of development: " . fake()->sentence(),
                    ]);
                }
            }
        }

        // 2. Create overlapping logs for testing time reporting accuracy
        if ($testUserTasks->count() >= 2) {
            $task1 = $testUserTasks[0];
            $task2 = $testUserTasks[1];
            
            // Create slightly overlapping time logs for the test user
            $yesterday = Carbon::yesterday();
            
            TimeLog::create([
                'user_id' => $testUser->id,
                'task_id' => $task1->id,
                'start_time' => $yesterday->copy()->setTime(10, 0),
                'end_time' => $yesterday->copy()->setTime(12, 30),
                'description' => 'Morning work session',
            ]);
            
            TimeLog::create([
                'user_id' => $testUser->id,
                'task_id' => $task2->id,
                'start_time' => $yesterday->copy()->setTime(12, 0), // Note the 30min overlap
                'end_time' => $yesterday->copy()->setTime(14, 30),
                'description' => 'Afternoon work session with some overlap',
            ]);
        }

        // You can call other specific seeders here if you create them
        // $this->call([
        //     AnotherSeeder::class,
        // ]);
    }
}
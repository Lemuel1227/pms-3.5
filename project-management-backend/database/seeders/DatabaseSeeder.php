<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = User::factory()->count(5)->create();

        $projects = Project::factory()->count(10)->make()->each(function ($project) use ($users) {
            $project->user_id = $users->random()->id;
            $project->save();
        });

        Task::factory()->count(30)->make()->each(function ($task) use ($projects, $users) {
            $task->project_id = $projects->random()->id;
            $task->assigned_user_id = $users->random()->id;
            $task->save();
        });

    }
}

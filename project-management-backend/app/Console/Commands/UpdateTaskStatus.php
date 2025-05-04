<?php

namespace App\Console\Commands;

use App\Models\Task;
use Illuminate\Console\Command;

class UpdateTaskStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tasks:update-status';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update task statuses based on their time logs';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting task status update...');

        $count = 0;
        $tasks = Task::with('timeLogs')->get();

        foreach ($tasks as $task) {
            $oldStatus = $task->status;
            $task->updateStatusBasedOnTimeLogs();
            
            if ($oldStatus !== $task->status) {
                $task->save(['skipStatusCheck' => true]); // Skip the updateStatusBasedOnTimeLogs in save method
                $count++;
                $this->info("Updated task #{$task->id} from '{$oldStatus}' to '{$task->status}'");
            }
        }

        $this->info("Task status update completed. Updated {$count} tasks.");
        
        return Command::SUCCESS;
    }
}
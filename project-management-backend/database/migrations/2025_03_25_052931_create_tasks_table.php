<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained('projects') 
                ->onDelete('cascade'); 

            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'in progress', 'completed'])->default('pending');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');

            $table->foreignId('assigned_user_id')
                ->nullable() 
                ->constrained('users') 
                ->onDelete('set null'); 

            $table->foreignId('created_by')
                ->constrained('users') 
                ->onDelete('cascade'); 

            $table->date('due_date')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('priority');
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add unique constraint on (class_session_id, user_id) to prevent duplicate
     * attendance records for the same student in the same session.
     * This ensures idempotency for the MarkAbsentStudents scheduled command.
     */
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->unique(['class_session_id', 'user_id'], 'attendances_session_user_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique('attendances_session_user_unique');
        });
    }
};

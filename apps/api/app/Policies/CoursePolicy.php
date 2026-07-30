<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\User;

class CoursePolicy
{
    /**
     * Determine whether the user can view the course details and sessions.
     * Allowed if KORMAT owner OR approved student in the course.
     */
    public function view(User $user, Course $course): bool
    {
        if ($course->kormat_id === $user->id) {
            return true;
        }

        return $course->students()
            ->where('user_id', $user->id)
            ->wherePivot('status', 'approved')
            ->exists();
    }

    /**
     * Determine whether the user can update or archive the course.
     * Allowed only for the KORMAT owner.
     */
    public function update(User $user, Course $course): bool
    {
        return $course->kormat_id === $user->id;
    }

    /**
     * Determine whether the user can delete the course.
     * Allowed ONLY for the KORMAT owner AND if the course has 0 class sessions.
     */
    public function delete(User $user, Course $course): bool
    {
        if ($course->kormat_id !== $user->id) {
            return false;
        }

        return $course->classSessions()->count() === 0;
    }
}

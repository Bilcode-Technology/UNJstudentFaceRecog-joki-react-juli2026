<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'kormat_id',
        'name',
        'code',
        'join_code',
        'is_archived',
    ];

    protected $casts = [
        'is_archived' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Course $course) {
            if (empty($course->join_code)) {
                $course->join_code = static::generateUniqueJoinCode();
            }
        });
    }

    public static function generateUniqueJoinCode(): string
    {
        $attempts = 0;
        $maxAttempts = 5;

        do {
            $code = strtoupper(Str::random(6));
            $exists = static::where('join_code', $code)->exists();
            $attempts++;
        } while ($exists && $attempts < $maxAttempts);

        if ($exists) {
            throw new \RuntimeException('Gagal membuat join_code yang unik setelah beberapa kali percobaan.');
        }

        return $code;
    }

    public function kormat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'kormat_id');
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_student')
            ->using(CourseStudent::class)
            ->withPivot('status', 'joined_at')
            ->withTimestamps();
    }

    public function classSessions(): HasMany
    {
        return $this->hasMany(ClassSession::class);
    }
}

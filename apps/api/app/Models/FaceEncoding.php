<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaceEncoding extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'encoding',
    ];

    protected $casts = [
        'encoding' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Exceptions;

use Exception;

class GeofenceException extends Exception
{
    protected string $errorCode;

    public function __construct(string $message = "Anda berada di luar radius lokasi kelas.", string $errorCode = "out_of_radius", int $code = 422)
    {
        parent::__construct($message, $code);
        $this->errorCode = $errorCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }
}

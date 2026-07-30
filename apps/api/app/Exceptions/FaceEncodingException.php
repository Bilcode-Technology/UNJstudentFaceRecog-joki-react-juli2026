<?php

namespace App\Exceptions;

use Exception;

class FaceEncodingException extends Exception
{
    protected string $errorCode;

    public function __construct(string $message = "Gagal memproses encoding wajah", string $errorCode = "encoding_failed", int $code = 422)
    {
        parent::__construct($message, $code);
        $this->errorCode = $errorCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }
}

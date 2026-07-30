<?php

namespace App\Services;

use App\Exceptions\FaceEncodingException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FaceRecognitionService
{
    protected string $url;
    protected string $internalKey;

    public function __construct()
    {
        $this->url = rtrim(config('services.face_service.url', 'http://127.0.0.1:8001'), '/');
        $this->internalKey = config('services.face_service.internal_key', 'secret_internal_key_change_me_in_production');
    }

    /**
     * Sends base64 image to Python face microservice and retrieves 128-d encoding array.
     *
     * @throws FaceEncodingException
     */
    public function encode(string $base64Image): array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])->timeout(15)->post("{$this->url}/encode", [
                'image' => $base64Image,
            ]);

            if ($response->failed()) {
                Log::error("Face service HTTP error", ['status' => $response->status(), 'body' => $response->body()]);
                throw new FaceEncodingException("Layanan verifikasi wajah mengalami gangguan", "service_error", 503);
            }

            $result = $response->json();

            if (empty($result['success'])) {
                $errorType = $result['error'] ?? 'unknown_error';
                
                $message = match ($errorType) {
                    'no_face_detected' => 'Wajah tidak terdeteksi, silakan foto ulang.',
                    'multiple_faces_detected' => 'Terdeteksi lebih dari satu wajah, pastikan hanya ada satu wajah di dalam foto.',
                    'invalid_image' => 'Format gambar tidak valid, silakan coba unggah atau ambil foto kembali.',
                    default => 'Gagal memproses encoding wajah.',
                };

                throw new FaceEncodingException($message, $errorType, 422);
            }

            return $result['encoding'] ?? [];
        } catch (FaceEncodingException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error("FaceRecognitionService exception: " . $e->getMessage());
            throw new FaceEncodingException("Gagal terhubung ke layanan verifikasi wajah", "service_unavailable", 503);
        }
    }

    /**
     * Performs 1:1 face verification comparing candidate image against registered known_encoding.
     * Returns array result: ['success' => bool, 'match' => bool, 'distance' => float]
     *
     * @throws FaceEncodingException
     */
    public function verify(string $base64Image, array $knownEncoding): array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])->timeout(15)->post("{$this->url}/verify", [
                'image' => $base64Image,
                'known_encoding' => $knownEncoding,
            ]);

            if ($response->failed()) {
                Log::error("Face service verification HTTP error", ['status' => $response->status(), 'body' => $response->body()]);
                throw new FaceEncodingException("Presensi gagal, silakan coba lagi.", "service_error", 422);
            }

            return $response->json() ?? [];
        } catch (FaceEncodingException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error("FaceRecognitionService verify exception: " . $e->getMessage());
            throw new FaceEncodingException("Presensi gagal, silakan coba lagi.", "service_unavailable", 422);
        }
    }
}

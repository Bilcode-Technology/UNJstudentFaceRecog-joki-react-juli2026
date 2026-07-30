<?php

namespace App\Http\Controllers;

use App\Exceptions\FaceEncodingException;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Handles Mahasiswa registration with face enrollment.
     */
    public function register(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users,email',
                'password' => 'required|string|min:8|confirmed',
                'nim' => 'required|string|max:50|unique:users,nim',
                'angkatan' => 'required|string|max:10',
                'face_image' => 'required|string',
            ], [
                'email.unique' => 'Email sudah terdaftar.',
                'email.required' => 'Email wajib diisi.',
                'email.email' => 'Format email tidak valid.',
                'nim.unique' => 'NIM sudah terdaftar.',
                'nim.required' => 'NIM wajib diisi.',
                'password.min' => 'Password minimal 8 karakter.',
                'password.confirmed' => 'Konfirmasi password tidak cocok.',
                'face_image.required' => 'Foto wajah wajib disertakan.',
            ]);

            $user = $this->authService->register($validated);

            return $this->successResponse($user, 'Registrasi berhasil! Silakan login.', 201);
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (FaceEncodingException $e) {
            return $this->errorResponse($e->getMessage(), $e->getCode(), [
                'face_image' => [$e->getMessage()],
                'error_code' => $e->getErrorCode(),
            ]);
        } catch (\Throwable $e) {
            return $this->errorResponse('Terjadi kesalahan pada server: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Handles user login and API token generation.
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $credentials = $request->validate([
                'email' => 'required|string|email',
                'password' => 'required|string',
            ]);

            $result = $this->authService->login($credentials);

            return $this->successResponse($result, 'Login berhasil');
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (AuthenticationException $e) {
            return $this->errorResponse($e->getMessage(), 401);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Terjadi kesalahan pada server: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Handles user logout (revokes current access token).
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $this->authService->logout($request->user());
            return $this->successResponse(null, 'Logout berhasil');
        } catch (\Throwable $e) {
            return $this->errorResponse('Terjadi kesalahan saat logout', 500);
        }
    }

    /**
     * Returns currently authenticated user profile with roles.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');
        return $this->successResponse($user, 'Profil pengguna berhasil diambil');
    }
}

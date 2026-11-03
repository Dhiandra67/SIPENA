<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'rememberMe' => ['sometimes', 'boolean'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Email atau kata sandi tidak valid. Silakan coba lagi.',
            ], 401);
        }

        $plainTextToken = Str::random(80);
        $now = now();

        DB::table('api_tokens')->insert([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $plainTextToken),
            'expires_at' => $now->copy()->addDays(($credentials['rememberMe'] ?? false) ? 30 : 1),
            'created_at' => $now,
            'last_used_at' => $now,
        ]);

        return response()->json([
            'accessToken' => $plainTextToken,
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        DB::table('api_tokens')
            ->where('token_hash', hash('sha256', $request->bearerToken()))
            ->delete();

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    /**
     * @return array{id: string, name: string, email: string, role: string}
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}

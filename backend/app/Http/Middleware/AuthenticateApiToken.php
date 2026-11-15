<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainTextToken = $request->bearerToken();

        if (! $plainTextToken) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $token = DB::table('api_tokens')
            ->where('token_hash', hash('sha256', $plainTextToken))
            ->where('expires_at', '>', now())
            ->first();

        if (! $token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user = User::find($token->user_id);

        if (! $user || ! ($user->is_active ?? true)) {
            DB::table('api_tokens')->where('id', $token->id)->delete();

            return response()->json([
                'message' => 'Sesi berakhir atau akun telah dinonaktifkan.',
            ], 401);
        }

        DB::table('api_tokens')
            ->where('id', $token->id)
            ->update(['last_used_at' => now()]);

        $request->setUserResolver(fn (): User => $user);

        return $next($request);
    }
}

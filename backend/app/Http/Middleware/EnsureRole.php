<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Ensure the authenticated user has one of the allowed roles.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $userRole = strtolower((string) $user->role);
        $normalizedUserRole = in_array($userRole, ['guru', 'teacher', 'role_guru'], true)
            ? 'teacher'
            : (in_array($userRole, ['admin', 'role_admin'], true) ? 'admin' : $userRole);

        $allowed = array_map(function (string $role): string {
            $r = strtolower(trim($role));

            return in_array($r, ['guru', 'teacher', 'role_guru'], true)
                ? 'teacher'
                : (in_array($r, ['admin', 'role_admin'], true) ? 'admin' : $r);
        }, $roles);

        if (! in_array($normalizedUserRole, $allowed, true)) {
            return response()->json([
                'message' => 'Anda tidak memiliki hak akses untuk tindakan ini.',
            ], 403);
        }

        return $next($request);
    }
}

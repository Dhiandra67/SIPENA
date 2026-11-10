<?php

namespace App\Http\Controllers;

use App\Models\Guru;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $guru = Guru::where('user_id', $user->id)->first();

        return response()->json([
            'message' => 'Profil berhasil dimuat.',
            'data' => [
                'id' => (string) $user->id,
                'name' => $guru?->nama_lengkap ?? $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'nip' => $guru?->nip,
                'no_telepon' => $guru?->no_telepon,
                'alamat' => $guru?->alamat,
                'status' => ($user->is_active ?? true) ? 'Aktif' : 'Tidak aktif',
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $name = trim((string) ($request->input('name') ?? $request->input('nama_lengkap') ?? ''));
        $email = strtolower(trim((string) ($request->input('email') ?? '')));
        $newPassword = (string) ($request->input('newPassword') ?? $request->input('password') ?? '');
        $confirmation = (string) ($request->input('confirmation') ?? $request->input('password_confirmation') ?? $newPassword);

        if ($name === '' || $email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['message' => 'Nama lengkap dan email valid wajib diisi.'], 422);
        }

        $emailExists = User::whereRaw('LOWER(email) = ?', [$email])
            ->where('id', '!=', $user->id)
            ->exists();
        if ($emailExists) {
            return response()->json(['message' => 'Email tersebut sudah digunakan oleh akun lain.'], 422);
        }

        if ($newPassword !== '') {
            if (strlen($newPassword) < 8) {
                return response()->json(['message' => 'Kata sandi baru minimal 8 karakter.'], 422);
            }
            if ($newPassword !== $confirmation) {
                return response()->json(['message' => 'Konfirmasi kata sandi tidak cocok.'], 422);
            }
        }

        DB::transaction(function () use ($user, $name, $email, $newPassword, $request): void {
            $updates = [
                'name' => $name,
                'email' => $email,
            ];
            if ($newPassword !== '') {
                $updates['password'] = $newPassword;
            }
            $user->update($updates);

            if ($newPassword !== '') {
                $currentToken = (string) $request->bearerToken();
                $tokenQuery = DB::table('api_tokens')->where('user_id', $user->id);
                if ($currentToken !== '') {
                    $tokenQuery->where('token_hash', '!=', hash('sha256', $currentToken));
                }
                $tokenQuery->delete();
            }

            $guru = Guru::where('user_id', $user->id)->first();
            if ($guru) {
                $guruUpdates = ['nama_lengkap' => $name];
                if ($request->has('no_telepon')) {
                    $guruUpdates['no_telepon'] = $request->input('no_telepon');
                }
                if ($request->has('alamat')) {
                    $guruUpdates['alamat'] = $request->input('alamat');
                }
                $guru->update($guruUpdates);
            }
        });

        $response = $this->show($request)->getData(true);
        $response['message'] = 'Profil akun berhasil diperbarui.';

        return response()->json($response);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Guru;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GuruController extends Controller
{
    public function index(): JsonResponse
    {
        $items = Guru::with('user')
            ->orderBy('nama_lengkap')
            ->get()
            ->map(fn (Guru $g) => $this->formatGuru($g));

        return response()->json(['data' => $items]);
    }

    public function show(int $id): JsonResponse
    {
        $guru = Guru::with(['user', 'pengajaran.mataPelajaran', 'pengajaran.kelas', 'kelasPerwalian'])
            ->findOrFail($id);

        return response()->json(['data' => $this->formatGuru($guru)]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validateGuru($request);

        $guru = DB::transaction(function () use ($payload): Guru {
            $user = User::create([
                'name' => $payload['nama_lengkap'],
                'email' => $payload['email'],
                'password' => $payload['password'],
                'role' => 'teacher',
                'is_active' => $payload['is_active'],
            ]);

            return Guru::create([
                'user_id' => $user->id,
                'nip' => $payload['nip'],
                'nama_lengkap' => $payload['nama_lengkap'],
                'jenis_kelamin' => $payload['jenis_kelamin'],
                'no_telepon' => $payload['no_telepon'],
                'alamat' => $payload['alamat'],
            ]);
        });

        $guru->load('user');

        return response()->json([
            'message' => "Data guru berhasil ditambahkan. Akun login ({$payload['email']}) aktif dengan kata sandi awal: {$payload['password']}",
            'data' => $this->formatGuru($guru),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $guru = Guru::with('user')->findOrFail($id);
        $payload = $this->validateGuru($request, $guru);

        DB::transaction(function () use ($guru, $payload): void {
            if ($guru->user) {
                $userUpdates = [
                    'name' => $payload['nama_lengkap'],
                    'email' => $payload['email'],
                    'is_active' => $payload['is_active'],
                ];
                if ($payload['password_provided']) {
                    $userUpdates['password'] = $payload['password'];
                }
                $guru->user->update($userUpdates);

                if ($payload['password_provided'] || ! $payload['is_active']) {
                    DB::table('api_tokens')->where('user_id', $guru->user->id)->delete();
                }
            }

            $guru->update([
                'nip' => $payload['nip'],
                'nama_lengkap' => $payload['nama_lengkap'],
                'jenis_kelamin' => $payload['jenis_kelamin'],
                'no_telepon' => $payload['no_telepon'],
                'alamat' => $payload['alamat'],
            ]);
        });

        $message = $payload['password_provided']
            ? "Data guru dan kata sandi akun ({$payload['email']}) berhasil diperbarui."
            : 'Data guru berhasil diperbarui.';

        return response()->json([
            'message' => $message,
            'data' => $this->formatGuru($guru->fresh('user')),
        ]);
    }

    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $guru = Guru::with('user')->findOrFail($id);
        $newPassword = trim((string) ($request->input('password') ?? ''));
        if ($newPassword === '') {
            $newPassword = 'guru12345';
        }

        if (strlen($newPassword) < 8) {
            return response()->json([
                'message' => 'Kata sandi baru minimal 8 karakter.',
            ], 422);
        }

        DB::transaction(function () use ($guru, $newPassword): void {
            if ($guru->user) {
                $guru->user->update([
                    'password' => $newPassword,
                ]);
                DB::table('api_tokens')->where('user_id', $guru->user->id)->delete();
            }
        });

        $email = $guru->user?->email ?? '-';

        return response()->json([
            'message' => "Kata sandi akun {$guru->nama_lengkap} ({$email}) berhasil direset menjadi: {$newPassword}",
            'defaultPassword' => $newPassword,
            'data' => $this->formatGuru($guru->fresh('user')),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $guru = Guru::with('user')->withCount(['kelasPerwalian', 'pengajaran'])->findOrFail($id);

        if ($guru->kelas_perwalian_count > 0 || $guru->pengajaran_count > 0) {
            return response()->json([
                'message' => 'Data masih digunakan oleh data akademik lain. Hapus atau pindahkan relasinya terlebih dahulu.',
            ], 422);
        }

        DB::transaction(function () use ($guru): void {
            $user = $guru->user;
            $guru->delete();
            $user?->delete();
        });

        return response()->json(['message' => 'Data guru berhasil dihapus.']);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatGuru(Guru $g): array
    {
        $isActive = $g->user ? (bool) $g->user->is_active : true;

        return [
            'id' => (string) $g->id,
            'user_id' => $g->user_id ? (string) $g->user_id : null,
            'nip' => (string) ($g->nip ?? ''),
            'name' => $g->nama_lengkap,
            'nama_lengkap' => $g->nama_lengkap,
            'gender' => $g->jenis_kelamin,
            'jenis_kelamin' => $g->jenis_kelamin,
            'email' => $g->user?->email ?? '',
            'no_telepon' => (string) ($g->no_telepon ?? ''),
            'alamat' => (string) ($g->alamat ?? ''),
            'is_active' => $isActive,
            'status' => $isActive ? 'Aktif' : 'Tidak aktif',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validateGuru(Request $request, ?Guru $existingGuru = null): array
    {
        $nip = trim((string) ($request->input('nip') ?? ''));
        $nama = trim((string) ($request->input('nama_lengkap') ?? $request->input('name') ?? ''));
        $gender = strtoupper(trim((string) ($request->input('jenis_kelamin') ?? $request->input('gender') ?? 'L')));
        $email = strtolower(trim((string) ($request->input('email') ?? '')));
        $telepon = trim((string) ($request->input('no_telepon') ?? ''));
        $alamat = trim((string) ($request->input('alamat') ?? ''));

        if ($nip === '' || $nama === '' || $email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            abort(response()->json(['message' => 'NIP, nama lengkap, dan email valid wajib diisi.'], 422));
        }

        if (! in_array($gender, ['L', 'P'], true)) {
            abort(response()->json(['message' => 'Jenis kelamin harus L atau P.'], 422));
        }

        $nipExists = Guru::where('nip', $nip)
            ->when($existingGuru !== null, fn ($q) => $q->where('id', '!=', $existingGuru->id))
            ->exists();

        $emailExists = User::whereRaw('LOWER(email) = ?', [$email])
            ->when($existingGuru?->user_id !== null, fn ($q) => $q->where('id', '!=', $existingGuru->user_id))
            ->exists();

        if ($nipExists || $emailExists) {
            abort(response()->json(['message' => 'NIP atau email guru sudah terdaftar.'], 422));
        }

        $statusInput = $request->input('status');
        $isActive = $request->has('is_active')
            ? (bool) $request->boolean('is_active')
            : (! is_string($statusInput) || ! in_array(strtolower(trim($statusInput)), ['tidak aktif', 'nonaktif'], true));

        $rawPassword = trim((string) ($request->input('password') ?? ''));
        $passwordProvided = $rawPassword !== '';
        if ($passwordProvided && strlen($rawPassword) < 8) {
            abort(response()->json(['message' => 'Kata sandi akun guru minimal 8 karakter.'], 422));
        }
        $password = $passwordProvided ? $rawPassword : 'guru12345';

        return [
            'nip' => $nip,
            'nama_lengkap' => $nama,
            'jenis_kelamin' => $gender,
            'email' => $email,
            'no_telepon' => $telepon !== '' ? $telepon : null,
            'alamat' => $alamat !== '' ? $alamat : null,
            'is_active' => $isActive,
            'password' => $password,
            'password_provided' => $passwordProvided,
        ];
    }
}

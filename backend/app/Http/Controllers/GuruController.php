<?php

namespace App\Http\Controllers;

use App\Models\Guru;
use App\Models\PeriodeAkademik;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GuruController extends Controller
{
    public function index(): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $query = Guru::with('user')->orderBy('nama_lengkap');

        if ($periodeAktif) {
            $query->whereHas('periodeAkademik', fn ($q) => $q->where('periode_akademik.id', $periodeAktif->id));
        }

        $items = $query->get()->map(fn (Guru $g) => $this->formatGuru($g, $periodeAktif?->nama_periode));

        return response()->json(['data' => $items]);
    }

    public function show(int $id): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $guru = Guru::with(['user', 'pengajaran.mataPelajaran', 'pengajaran.kelas', 'kelasPerwalian'])
            ->findOrFail($id);

        return response()->json(['data' => $this->formatGuru($guru, $periodeAktif?->nama_periode)]);
    }

    public function store(Request $request): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $payload = $this->validateGuru($request, null, $periodeAktif?->id);
        $temporaryPassword = 'guru12345';

        $guru = DB::transaction(function () use ($payload, $temporaryPassword, $periodeAktif): Guru {
            $existingGuru = Guru::with('user')
                ->where('nip', $payload['nip'])
                ->orWhereHas('user', fn ($q) => $q->whereRaw('LOWER(email) = ?', [$payload['email']]))
                ->first();

            if ($existingGuru) {
                if ($existingGuru->user) {
                    $existingGuru->user->update([
                        'name' => $payload['nama_lengkap'],
                        'email' => $payload['email'],
                        'is_active' => $payload['is_active'],
                    ]);
                } else {
                    $user = User::create([
                        'name' => $payload['nama_lengkap'],
                        'email' => $payload['email'],
                        'password' => $temporaryPassword,
                        'role' => 'teacher',
                        'is_active' => $payload['is_active'],
                    ]);
                    $existingGuru->user_id = $user->id;
                }

                $existingGuru->update([
                    'user_id' => $existingGuru->user_id,
                    'nip' => $payload['nip'],
                    'nama_lengkap' => $payload['nama_lengkap'],
                    'jenis_kelamin' => $payload['jenis_kelamin'],
                    'no_telepon' => $payload['no_telepon'],
                    'alamat' => $payload['alamat'],
                ]);

                if ($periodeAktif) {
                    $existingGuru->periodeAkademik()->syncWithoutDetaching([$periodeAktif->id]);
                }

                return $existingGuru;
            }

            $user = User::create([
                'name' => $payload['nama_lengkap'],
                'email' => $payload['email'],
                'password' => $temporaryPassword,
                'role' => 'teacher',
                'is_active' => $payload['is_active'],
            ]);

            $created = Guru::create([
                'user_id' => $user->id,
                'nip' => $payload['nip'],
                'nama_lengkap' => $payload['nama_lengkap'],
                'jenis_kelamin' => $payload['jenis_kelamin'],
                'no_telepon' => $payload['no_telepon'],
                'alamat' => $payload['alamat'],
            ]);

            if ($periodeAktif) {
                $created->periodeAkademik()->syncWithoutDetaching([$periodeAktif->id]);
            }

            return $created;
        });

        $guru->load('user');

        return response()->json([
            'message' => "Data guru berhasil ditambahkan. Sistem telah membuat kata sandi sementara untuk akun ({$payload['email']}): {$temporaryPassword}",
            'temporaryPassword' => $temporaryPassword,
            'data' => $this->formatGuru($guru, $periodeAktif?->nama_periode),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $guru = Guru::with('user')->findOrFail($id);
        $payload = $this->validateGuru($request, $guru, $periodeAktif?->id);

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
            'data' => $this->formatGuru($guru->fresh('user'), $periodeAktif?->nama_periode),
        ]);
    }

    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
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
            'data' => $this->formatGuru($guru->fresh('user'), $periodeAktif?->nama_periode),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $guru = Guru::with('user')->withCount(['kelasPerwalian', 'pengajaran'])->findOrFail($id);

        $inUseInActivePeriod = $periodeAktif
            ? ($guru->kelasPerwalian()->where('periode_id', $periodeAktif->id)->exists()
                || $guru->pengajaran()->where('periode_id', $periodeAktif->id)->exists())
            : ($guru->kelas_perwalian_count > 0 || $guru->pengajaran_count > 0);

        if ($inUseInActivePeriod) {
            return response()->json([
                'message' => 'Data masih digunakan oleh data akademik lain. Hapus atau pindahkan relasinya terlebih dahulu.',
            ], 422);
        }

        DB::transaction(function () use ($guru, $periodeAktif): void {
            if ($periodeAktif) {
                $guru->periodeAkademik()->detach($periodeAktif->id);
            }

            $stillReferenced = $guru->periodeAkademik()->exists()
                || $guru->kelasPerwalian()->exists()
                || $guru->pengajaran()->exists();

            if (! $stillReferenced) {
                $user = $guru->user;
                $guru->delete();
                $user?->delete();
            }
        });

        return response()->json(['message' => 'Data guru berhasil dihapus.']);
    }

    public function import(Request $request): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        if (! $periodeAktif) {
            return response()->json(['message' => 'Periode akademik aktif belum tersedia.'], 422);
        }

        $rows = $request->input('teachers');
        if (! is_array($rows) || $rows === []) {
            return response()->json(['message' => 'Data guru untuk diimpor tidak ditemukan.'], 422);
        }

        $activeGuruByNip = Guru::whereHas('periodeAkademik', fn ($q) => $q->where('periode_akademik.id', $periodeAktif->id))
            ->pluck('id', 'nip')
            ->all();
        $activeGuruByEmail = User::whereHas('guru.periodeAkademik', fn ($q) => $q->where('periode_akademik.id', $periodeAktif->id))
            ->get()
            ->mapWithKeys(fn (User $u) => [strtolower($u->email) => $u->id])
            ->all();

        $seenNip = [];
        $seenEmail = [];
        $errors = [];
        $validatedRows = [];

        foreach ($rows as $index => $row) {
            $rowNumber = (int) ($row['row_number'] ?? ($index + 2));
            $nip = trim((string) ($row['nip'] ?? ''));
            $nama = trim((string) ($row['nama_lengkap'] ?? $row['name'] ?? ''));
            $gender = strtoupper(trim((string) ($row['jenis_kelamin'] ?? $row['gender'] ?? 'L')));
            $email = strtolower(trim((string) ($row['email'] ?? '')));
            $statusInput = (string) ($row['status'] ?? 'Aktif');
            $isActive = ! in_array(strtolower(trim($statusInput)), ['tidak aktif', 'nonaktif'], true);

            if ($nip === '' || $nama === '' || $email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = "Baris {$rowNumber}: NIP, nama lengkap, dan email valid wajib diisi.";

                continue;
            }

            if (! in_array($gender, ['L', 'P'], true)) {
                $errors[] = "Baris {$rowNumber}: jenis kelamin harus L atau P.";

                continue;
            }

            if (isset($activeGuruByNip[$nip]) || isset($seenNip[$nip])) {
                $errors[] = "Baris {$rowNumber}: NIP {$nip} sudah terdaftar atau duplikat.";

                continue;
            }

            if (isset($activeGuruByEmail[$email]) || isset($seenEmail[$email])) {
                $errors[] = "Baris {$rowNumber}: email {$email} sudah terdaftar atau duplikat.";

                continue;
            }

            $seenNip[$nip] = true;
            $seenEmail[$email] = true;
            $validatedRows[] = [
                'nip' => $nip,
                'nama_lengkap' => $nama,
                'jenis_kelamin' => $gender,
                'email' => $email,
                'is_active' => $isActive,
            ];
        }

        if ($errors !== []) {
            return response()->json([
                'message' => 'Impor dibatalkan; tidak ada data yang disimpan. '.implode(' ', array_slice($errors, 0, 3)),
                'errors' => $errors,
            ], 422);
        }

        $createdTeachers = DB::transaction(function () use ($validatedRows, $periodeAktif): array {
            $result = [];
            foreach ($validatedRows as $item) {
                $existingGuru = Guru::with('user')
                    ->where('nip', $item['nip'])
                    ->orWhereHas('user', fn ($q) => $q->whereRaw('LOWER(email) = ?', [$item['email']]))
                    ->first();

                if ($existingGuru) {
                    if ($existingGuru->user) {
                        $existingGuru->user->update([
                            'name' => $item['nama_lengkap'],
                            'email' => $item['email'],
                            'is_active' => $item['is_active'],
                        ]);
                    } else {
                        $user = User::create([
                            'name' => $item['nama_lengkap'],
                            'email' => $item['email'],
                            'password' => 'guru12345',
                            'role' => 'teacher',
                            'is_active' => $item['is_active'],
                        ]);
                        $existingGuru->user_id = $user->id;
                    }

                    $existingGuru->update([
                        'user_id' => $existingGuru->user_id,
                        'nip' => $item['nip'],
                        'nama_lengkap' => $item['nama_lengkap'],
                        'jenis_kelamin' => $item['jenis_kelamin'],
                    ]);
                    $existingGuru->periodeAkademik()->syncWithoutDetaching([$periodeAktif->id]);
                    $result[] = $existingGuru->fresh('user');

                    continue;
                }

                $user = User::create([
                    'name' => $item['nama_lengkap'],
                    'email' => $item['email'],
                    'password' => 'guru12345',
                    'role' => 'teacher',
                    'is_active' => $item['is_active'],
                ]);

                $guru = Guru::create([
                    'user_id' => $user->id,
                    'nip' => $item['nip'],
                    'nama_lengkap' => $item['nama_lengkap'],
                    'jenis_kelamin' => $item['jenis_kelamin'],
                ]);

                $guru->periodeAkademik()->syncWithoutDetaching([$periodeAktif->id]);
                $guru->setRelation('user', $user);
                $result[] = $guru;
            }

            return $result;
        });

        $formatted = collect($createdTeachers)->map(
            fn (Guru $g) => $this->formatGuru($g, $periodeAktif->nama_periode)
        );

        return response()->json([
            'message' => count($createdTeachers).' data guru berhasil diimpor.',
            'data' => $formatted,
        ], 201);
    }

    public function export(): JsonResponse
    {
        return $this->index();
    }

    /**
     * @return array<string, mixed>
     */
    public function formatGuru(Guru $g, ?string $periodName = null): array
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
            'period' => $periodName ?? ($this->getActivePeriode()?->nama_periode ?? ''),
            'is_active' => $isActive,
            'status' => $isActive ? 'Aktif' : 'Tidak aktif',
        ];
    }

    private function getActivePeriode(): ?PeriodeAkademik
    {
        return PeriodeAkademik::where('is_active', true)->first()
            ?? PeriodeAkademik::orderByDesc('id')->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateGuru(Request $request, ?Guru $existingGuru = null, ?int $periodeId = null): array
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

        $nipByGuru = Guru::where('nip', $nip)
            ->when($existingGuru !== null, fn ($q) => $q->where('id', '!=', $existingGuru->id))
            ->first();

        $userByEmail = User::whereRaw('LOWER(email) = ?', [$email])
            ->when($existingGuru?->user_id !== null, fn ($q) => $q->where('id', '!=', $existingGuru->user_id))
            ->first();

        if ($existingGuru !== null) {
            if ($nipByGuru !== null || $userByEmail !== null) {
                abort(response()->json(['message' => 'NIP atau email guru sudah terdaftar.'], 422));
            }
        } else {
            $nipInActivePeriod = $nipByGuru !== null && (
                $periodeId === null
                || $nipByGuru->periodeAkademik()->where('periode_akademik.id', $periodeId)->exists()
            );
            $emailInActivePeriod = $userByEmail !== null && (
                $periodeId === null
                || Guru::where('user_id', $userByEmail->id)
                    ->whereHas('periodeAkademik', fn ($q) => $q->where('periode_akademik.id', $periodeId))
                    ->exists()
            );
            $conflictDifferentRecords = $nipByGuru !== null
                && $userByEmail !== null
                && $nipByGuru->user_id !== $userByEmail->id;

            if ($nipInActivePeriod || $emailInActivePeriod || $conflictDifferentRecords) {
                abort(response()->json(['message' => 'NIP atau email guru sudah terdaftar.'], 422));
            }
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

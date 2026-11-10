<?php

namespace Database\Seeders;

use App\Models\AnggotaKelas;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\KomponenNilai;
use App\Models\MataPelajaran;
use App\Models\NilaiAkhirMapel;
use App\Models\NilaiDetail;
use App\Models\Pengajaran;
use App\Models\PeriodeAkademik;
use App\Models\RentangNilai;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Database\Seeder;

class AcademicGradingSeeder extends Seeder
{
    /**
     * Seed data awal akademik dan penilaian SMP Karya Utama.
     */
    public function run(): void
    {
        // 1. Periode Akademik
        $periodeAktif = PeriodeAkademik::updateOrCreate(
            ['tahun_ajaran' => '2026/2027', 'semester' => 'GANJIL'],
            [
                'nama_periode' => '2026/2027 · Ganjil',
                'tanggal_mulai' => '2026-07-13',
                'tanggal_selesai' => '2026-12-19',
                'is_active' => true,
            ]
        );

        PeriodeAkademik::updateOrCreate(
            ['tahun_ajaran' => '2025/2026', 'semester' => 'GENAP'],
            [
                'nama_periode' => '2025/2026 · Genap',
                'tanggal_mulai' => '2026-01-05',
                'tanggal_selesai' => '2026-06-20',
                'is_active' => false,
            ]
        );

        // 2. Rentang Nilai (Predikat) pada Periode Aktif
        $daftarPredikat = [
            ['predikat' => 'A', 'batas_bawah' => 85.00, 'batas_atas' => 100.00, 'keterangan' => 'Sangat Baik'],
            ['predikat' => 'B', 'batas_bawah' => 70.00, 'batas_atas' => 84.99, 'keterangan' => 'Baik'],
            ['predikat' => 'C', 'batas_bawah' => 55.00, 'batas_atas' => 69.99, 'keterangan' => 'Cukup'],
            ['predikat' => 'D', 'batas_bawah' => 0.00, 'batas_atas' => 54.99, 'keterangan' => 'Perlu Bimbingan'],
        ];

        $rentangNilaiCollection = collect();
        foreach ($daftarPredikat as $item) {
            $rentang = RentangNilai::updateOrCreate(
                ['periode_id' => $periodeAktif->id, 'predikat' => $item['predikat']],
                [
                    'batas_bawah' => $item['batas_bawah'],
                    'batas_atas' => $item['batas_atas'],
                    'keterangan' => $item['keterangan'],
                ]
            );
            $rentangNilaiCollection->push($rentang);
        }

        // 3. Mata Pelajaran
        $daftarMapel = [
            ['kode_mapel' => 'MAT', 'nama_mapel' => 'Matematika', 'kelompok' => 'Umum', 'kkm_default' => 75.00],
            ['kode_mapel' => 'BIN', 'nama_mapel' => 'Bahasa Indonesia', 'kelompok' => 'Umum', 'kkm_default' => 75.00],
            ['kode_mapel' => 'IPA', 'nama_mapel' => 'Ilmu Pengetahuan Alam', 'kelompok' => 'Umum', 'kkm_default' => 75.00],
            ['kode_mapel' => 'IPS', 'nama_mapel' => 'Ilmu Pengetahuan Sosial', 'kelompok' => 'Umum', 'kkm_default' => 75.00],
            ['kode_mapel' => 'SBD', 'nama_mapel' => 'Seni Budaya', 'kelompok' => 'Muatan Lokal', 'kkm_default' => 70.00],
        ];

        $mapelByKode = [];
        foreach ($daftarMapel as $item) {
            $mapelByKode[$item['kode_mapel']] = MataPelajaran::updateOrCreate(
                ['kode_mapel' => $item['kode_mapel']],
                [
                    'nama_mapel' => $item['nama_mapel'],
                    'kelompok' => $item['kelompok'],
                    'kkm_default' => $item['kkm_default'],
                    'is_active' => true,
                ]
            );
        }

        // 4. Akun Guru & Profil Guru
        $guruDemoUser = User::where('email', 'guru@example.com')->first();

        $userDedi = User::updateOrCreate(
            ['email' => 'dedi@sekolah.sch.id'],
            [
                'name' => 'Dedi Saputra, S.Pd.',
                'role' => 'teacher',
                'password' => 'guru12345',
                'is_active' => true,
            ]
        );

        $userRatna = User::updateOrCreate(
            ['email' => 'ratna@sekolah.sch.id'],
            [
                'name' => 'Ratna Dewi, S.Pd.',
                'role' => 'teacher',
                'password' => 'guru12345',
                'is_active' => true,
            ]
        );

        $guruSari = Guru::updateOrCreate(
            ['nip' => '198501012010011001'],
            [
                'user_id' => $guruDemoUser?->id,
                'nama_lengkap' => 'Sari Wulandari, S.Pd.',
                'jenis_kelamin' => 'P',
                'no_telepon' => '081234567801',
                'alamat' => 'Desa Karang Sari, Jati Agung, Lampung Selatan',
            ]
        );

        $guruDedi = Guru::updateOrCreate(
            ['nip' => '198702152012021002'],
            [
                'user_id' => $userDedi->id,
                'nama_lengkap' => 'Dedi Saputra, S.Pd.',
                'jenis_kelamin' => 'L',
                'no_telepon' => '081234567802',
                'alamat' => 'Desa Karang Sari, Jati Agung, Lampung Selatan',
            ]
        );

        $guruRatna = Guru::updateOrCreate(
            ['nip' => '199003102015031003'],
            [
                'user_id' => $userRatna->id,
                'nama_lengkap' => 'Ratna Dewi, S.Pd.',
                'jenis_kelamin' => 'P',
                'no_telepon' => '081234567803',
                'alamat' => 'Desa Karang Sari, Jati Agung, Lampung Selatan',
            ]
        );

        // 5. Kelas
        $daftarKelas = [
            ['kode_kelas' => 'VII-A', 'nama_kelas' => 'VII-A', 'tingkat' => 'VII', 'wali_kelas_id' => $guruSari->id],
            ['kode_kelas' => 'VII-B', 'nama_kelas' => 'VII-B', 'tingkat' => 'VII', 'wali_kelas_id' => $guruDedi->id],
            ['kode_kelas' => 'VIII-A', 'nama_kelas' => 'VIII-A', 'tingkat' => 'VIII', 'wali_kelas_id' => $guruRatna->id],
            ['kode_kelas' => 'VIII-B', 'nama_kelas' => 'VIII-B', 'tingkat' => 'VIII', 'wali_kelas_id' => $guruSari->id],
        ];

        $kelasByKode = [];
        foreach ($daftarKelas as $item) {
            $kelasByKode[$item['kode_kelas']] = Kelas::updateOrCreate(
                ['periode_id' => $periodeAktif->id, 'kode_kelas' => $item['kode_kelas']],
                [
                    'nama_kelas' => $item['nama_kelas'],
                    'tingkat' => $item['tingkat'],
                    'wali_kelas_id' => $item['wali_kelas_id'],
                ]
            );
        }

        // 6. Siswa & Anggota Kelas
        $daftarSiswa = [
            ['nis' => '2026001', 'nisn' => '0123456701', 'nama_lengkap' => 'Andi Pratama', 'jenis_kelamin' => 'L', 'kelas' => 'VII-A'],
            ['nis' => '2026002', 'nisn' => '0123456702', 'nama_lengkap' => 'Budi Santoso', 'jenis_kelamin' => 'L', 'kelas' => 'VII-A'],
            ['nis' => '2026007', 'nisn' => '0123456707', 'nama_lengkap' => 'Galih Ramadhan', 'jenis_kelamin' => 'L', 'kelas' => 'VII-A'],
            ['nis' => '2026009', 'nisn' => '0123456709', 'nama_lengkap' => 'Intan Permata', 'jenis_kelamin' => 'P', 'kelas' => 'VII-A'],
            ['nis' => '2026010', 'nisn' => '0123456710', 'nama_lengkap' => 'Joko Saputra', 'jenis_kelamin' => 'L', 'kelas' => 'VII-A'],
            ['nis' => '2026003', 'nisn' => '0123456703', 'nama_lengkap' => 'Citra Lestari', 'jenis_kelamin' => 'P', 'kelas' => 'VII-B'],
            ['nis' => '2026005', 'nisn' => '0123456705', 'nama_lengkap' => 'Eka Saputra', 'jenis_kelamin' => 'L', 'kelas' => 'VII-B'],
            ['nis' => '2026011', 'nisn' => '0123456711', 'nama_lengkap' => 'Laras Wati', 'jenis_kelamin' => 'P', 'kelas' => 'VII-B'],
            ['nis' => '2026012', 'nisn' => '0123456712', 'nama_lengkap' => 'Miko Ardiansyah', 'jenis_kelamin' => 'L', 'kelas' => 'VII-B'],
            ['nis' => '2026004', 'nisn' => '0123456704', 'nama_lengkap' => 'Dina Putri', 'jenis_kelamin' => 'P', 'kelas' => 'VIII-A'],
            ['nis' => '2026006', 'nisn' => '0123456706', 'nama_lengkap' => 'Fitri Handayani', 'jenis_kelamin' => 'P', 'kelas' => 'VIII-A'],
            ['nis' => '2026013', 'nisn' => '0123456713', 'nama_lengkap' => 'Nadia Putri', 'jenis_kelamin' => 'P', 'kelas' => 'VIII-A'],
            ['nis' => '2026014', 'nisn' => '0123456714', 'nama_lengkap' => 'Rafi Firmansyah', 'jenis_kelamin' => 'L', 'kelas' => 'VIII-A'],
            ['nis' => '2026008', 'nisn' => '0123456708', 'nama_lengkap' => 'Hana Permata', 'jenis_kelamin' => 'P', 'kelas' => 'VIII-B'],
        ];

        $anggotaByNis = [];
        foreach ($daftarSiswa as $item) {
            $siswa = Siswa::updateOrCreate(
                ['nis' => $item['nis']],
                [
                    'nisn' => $item['nisn'],
                    'nama_lengkap' => $item['nama_lengkap'],
                    'jenis_kelamin' => $item['jenis_kelamin'],
                    'status' => 'AKTIF',
                ]
            );

            $kelas = $kelasByKode[$item['kelas']];
            $anggotaByNis[$item['nis']] = AnggotaKelas::updateOrCreate([
                'kelas_id' => $kelas->id,
                'siswa_id' => $siswa->id,
            ]);
        }

        // 7. Plotting Pengajaran
        $daftarPengajaran = [
            ['kelas' => 'VII-A', 'mapel' => 'MAT', 'guru' => $guruSari, 'kkm' => 75.00],
            ['kelas' => 'VII-B', 'mapel' => 'MAT', 'guru' => $guruSari, 'kkm' => 75.00],
            ['kelas' => 'VIII-A', 'mapel' => 'MAT', 'guru' => $guruSari, 'kkm' => 75.00],
            ['kelas' => 'VII-B', 'mapel' => 'BIN', 'guru' => $guruDedi, 'kkm' => 75.00],
            ['kelas' => 'VIII-A', 'mapel' => 'IPA', 'guru' => $guruRatna, 'kkm' => 75.00],
        ];

        $pengajaranMap = [];
        foreach ($daftarPengajaran as $item) {
            $key = $item['mapel'].'-'.$item['kelas'];
            $pengajaranMap[$key] = Pengajaran::updateOrCreate(
                [
                    'periode_id' => $periodeAktif->id,
                    'kelas_id' => $kelasByKode[$item['kelas']]->id,
                    'mapel_id' => $mapelByKode[$item['mapel']]->id,
                ],
                [
                    'guru_id' => $item['guru']->id,
                    'kkm' => $item['kkm'],
                    'is_locked' => false,
                ]
            );
        }

        // 8. Komponen Nilai (Total Bobot = 100%)
        $templateKomponen = [
            ['kode' => 'daily', 'nama_komponen' => 'Tugas Harian', 'bobot_persen' => 20.00, 'urutan' => 1],
            ['kode' => 'quiz', 'nama_komponen' => 'Ulangan Harian', 'bobot_persen' => 25.00, 'urutan' => 2],
            ['kode' => 'midterm', 'nama_komponen' => 'STS', 'bobot_persen' => 25.00, 'urutan' => 3],
            ['kode' => 'final', 'nama_komponen' => 'UAS', 'bobot_persen' => 30.00, 'urutan' => 4],
        ];

        $komponenByPengajaran = [];
        foreach ($pengajaranMap as $key => $pengajaran) {
            foreach ($templateKomponen as $komp) {
                $komponenByPengajaran[$key][$komp['kode']] = KomponenNilai::updateOrCreate(
                    [
                        'pengajaran_id' => $pengajaran->id,
                        'nama_komponen' => $komp['nama_komponen'],
                    ],
                    [
                        'bobot_persen' => $komp['bobot_persen'],
                        'urutan' => $komp['urutan'],
                    ]
                );
            }
        }

        // 9. Nilai Detail & Kalkulasi Nilai Akhir Mapel (Matematika VII-A, VII-B, VIII-A)
        $nilaiAwalMatematika = [
            'MAT-VII-A' => [
                '2026001' => ['daily' => 88, 'quiz' => 84, 'midterm' => 86, 'final' => 90],
                '2026002' => ['daily' => 78, 'quiz' => 82, 'midterm' => 76, 'final' => 80],
                '2026007' => ['daily' => 92, 'quiz' => 90, 'midterm' => 88, 'final' => 94],
                '2026009' => ['daily' => 70, 'quiz' => 74, 'midterm' => 72, 'final' => null],
                '2026010' => ['daily' => 80, 'quiz' => 78, 'midterm' => null, 'final' => null],
            ],
            'MAT-VII-B' => [
                '2026003' => ['daily' => 86, 'quiz' => 82, 'midterm' => 84, 'final' => 80],
                '2026005' => ['daily' => 72, 'quiz' => 76, 'midterm' => 74, 'final' => 78],
                '2026011' => ['daily' => 90, 'quiz' => 88, 'midterm' => 92, 'final' => 90],
                '2026012' => ['daily' => 68, 'quiz' => 72, 'midterm' => null, 'final' => null],
            ],
            'MAT-VIII-A' => [
                '2026004' => ['daily' => 82, 'quiz' => 86, 'midterm' => 84, 'final' => 88],
                '2026006' => ['daily' => 94, 'quiz' => 92, 'midterm' => 96, 'final' => 94],
                '2026013' => ['daily' => 76, 'quiz' => 80, 'midterm' => 78, 'final' => null],
                '2026014' => ['daily' => 88, 'quiz' => 84, 'midterm' => 86, 'final' => 82],
            ],
        ];

        $now = now();
        foreach ($nilaiAwalMatematika as $pengajaranKey => $siswaScores) {
            $pengajaran = $pengajaranMap[$pengajaranKey];
            $komponenMap = $komponenByPengajaran[$pengajaranKey];

            foreach ($siswaScores as $nis => $scores) {
                $anggota = $anggotaByNis[$nis];
                $semuaKomponenLengkap = true;
                $nilaiAkhir = 0.0;

                foreach ($scores as $kodeKomponen => $skor) {
                    $komponen = $komponenMap[$kodeKomponen];

                    if ($skor !== null) {
                        NilaiDetail::updateOrCreate(
                            [
                                'komponen_id' => $komponen->id,
                                'anggota_kelas_id' => $anggota->id,
                            ],
                            [
                                'nilai_angka' => $skor,
                                'updated_by' => $guruDemoUser?->id,
                            ]
                        );

                        $nilaiAkhir += $skor * ((float) $komponen->bobot_persen / 100.0);
                    } else {
                        $semuaKomponenLengkap = false;
                    }
                }

                if ($semuaKomponenLengkap) {
                    $nilaiAkhirBulat = round($nilaiAkhir, 2);
                    $rentang = $rentangNilaiCollection->first(
                        fn (RentangNilai $r) => $nilaiAkhirBulat >= (float) $r->batas_bawah
                            && $nilaiAkhirBulat <= (float) $r->batas_atas
                    );

                    NilaiAkhirMapel::updateOrCreate(
                        [
                            'pengajaran_id' => $pengajaran->id,
                            'anggota_kelas_id' => $anggota->id,
                        ],
                        [
                            'nilai_akhir' => $nilaiAkhirBulat,
                            'predikat' => $rentang?->predikat ?? 'D',
                            'keterangan_predikat' => $rentang?->keterangan ?? 'Perlu Bimbingan',
                            'is_tuntas' => $nilaiAkhirBulat >= (float) $pengajaran->kkm,
                            'calculated_at' => $now,
                        ]
                    );
                }
            }
        }
    }
}

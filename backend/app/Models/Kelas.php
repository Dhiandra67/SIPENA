<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'periode_id',
    'wali_kelas_id',
    'kode_kelas',
    'nama_kelas',
    'tingkat',
])]
class Kelas extends Model
{
    protected $table = 'kelas';

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodeAkademik::class, 'periode_id');
    }

    public function waliKelas(): BelongsTo
    {
        return $this->belongsTo(Guru::class, 'wali_kelas_id');
    }

    public function anggotaKelas(): HasMany
    {
        return $this->hasMany(AnggotaKelas::class, 'kelas_id');
    }

    public function siswa(): BelongsToMany
    {
        return $this->belongsToMany(Siswa::class, 'anggota_kelas', 'kelas_id', 'siswa_id')
            ->withTimestamps();
    }

    public function pengajaran(): HasMany
    {
        return $this->hasMany(Pengajaran::class, 'kelas_id');
    }
}

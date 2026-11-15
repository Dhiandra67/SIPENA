<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'kelas_id',
    'siswa_id',
])]
class AnggotaKelas extends Model
{
    protected $table = 'anggota_kelas';

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(Kelas::class, 'kelas_id');
    }

    public function siswa(): BelongsTo
    {
        return $this->belongsTo(Siswa::class, 'siswa_id');
    }

    public function nilaiDetail(): HasMany
    {
        return $this->hasMany(NilaiDetail::class, 'anggota_kelas_id');
    }

    public function nilaiAkhirMapel(): HasMany
    {
        return $this->hasMany(NilaiAkhirMapel::class, 'anggota_kelas_id');
    }
}

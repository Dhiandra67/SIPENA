<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'periode_id',
    'kelas_id',
    'mapel_id',
    'guru_id',
    'kkm',
    'is_locked',
])]
class Pengajaran extends Model
{
    protected $table = 'pengajaran';

    protected function casts(): array
    {
        return [
            'kkm' => 'decimal:2',
            'is_locked' => 'boolean',
        ];
    }

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodeAkademik::class, 'periode_id');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(Kelas::class, 'kelas_id');
    }

    public function mataPelajaran(): BelongsTo
    {
        return $this->belongsTo(MataPelajaran::class, 'mapel_id');
    }

    public function guru(): BelongsTo
    {
        return $this->belongsTo(Guru::class, 'guru_id');
    }

    public function komponenNilai(): HasMany
    {
        return $this->hasMany(KomponenNilai::class, 'pengajaran_id')->orderBy('urutan');
    }

    public function nilaiAkhirMapel(): HasMany
    {
        return $this->hasMany(NilaiAkhirMapel::class, 'pengajaran_id');
    }
}

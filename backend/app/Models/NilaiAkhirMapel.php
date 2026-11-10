<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'pengajaran_id',
    'anggota_kelas_id',
    'nilai_akhir',
    'predikat',
    'keterangan_predikat',
    'is_tuntas',
    'calculated_at',
])]
class NilaiAkhirMapel extends Model
{
    protected $table = 'nilai_akhir_mapel';

    protected function casts(): array
    {
        return [
            'nilai_akhir' => 'decimal:2',
            'is_tuntas' => 'boolean',
            'calculated_at' => 'datetime',
        ];
    }

    public function pengajaran(): BelongsTo
    {
        return $this->belongsTo(Pengajaran::class, 'pengajaran_id');
    }

    public function anggotaKelas(): BelongsTo
    {
        return $this->belongsTo(AnggotaKelas::class, 'anggota_kelas_id');
    }
}

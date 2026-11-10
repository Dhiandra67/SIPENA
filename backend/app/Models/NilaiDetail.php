<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'komponen_id',
    'anggota_kelas_id',
    'nilai_angka',
    'catatan',
    'updated_by',
])]
class NilaiDetail extends Model
{
    protected $table = 'nilai_detail';

    protected function casts(): array
    {
        return [
            'nilai_angka' => 'decimal:2',
        ];
    }

    public function komponen(): BelongsTo
    {
        return $this->belongsTo(KomponenNilai::class, 'komponen_id');
    }

    public function anggotaKelas(): BelongsTo
    {
        return $this->belongsTo(AnggotaKelas::class, 'anggota_kelas_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

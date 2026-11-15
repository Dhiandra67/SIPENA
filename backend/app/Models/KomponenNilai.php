<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'pengajaran_id',
    'nama_komponen',
    'bobot_persen',
    'urutan',
])]
class KomponenNilai extends Model
{
    protected $table = 'komponen_nilai';

    protected function casts(): array
    {
        return [
            'bobot_persen' => 'decimal:2',
            'urutan' => 'integer',
        ];
    }

    public function pengajaran(): BelongsTo
    {
        return $this->belongsTo(Pengajaran::class, 'pengajaran_id');
    }

    public function nilaiDetail(): HasMany
    {
        return $this->hasMany(NilaiDetail::class, 'komponen_id');
    }
}

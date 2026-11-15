<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'kode_mapel',
    'nama_mapel',
    'kelompok',
    'kkm_default',
    'is_active',
])]
class MataPelajaran extends Model
{
    protected $table = 'mata_pelajaran';

    protected function casts(): array
    {
        return [
            'kkm_default' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function pengajaran(): HasMany
    {
        return $this->hasMany(Pengajaran::class, 'mapel_id');
    }
}

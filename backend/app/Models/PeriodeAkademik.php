<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tahun_ajaran',
    'semester',
    'nama_periode',
    'tanggal_mulai',
    'tanggal_selesai',
    'is_active',
])]
class PeriodeAkademik extends Model
{
    protected $table = 'periode_akademik';

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function rentangNilai(): HasMany
    {
        return $this->hasMany(RentangNilai::class, 'periode_id');
    }

    public function kelas(): HasMany
    {
        return $this->hasMany(Kelas::class, 'periode_id');
    }

    public function pengajaran(): HasMany
    {
        return $this->hasMany(Pengajaran::class, 'periode_id');
    }
}

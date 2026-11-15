<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'nis',
    'nisn',
    'nama_lengkap',
    'jenis_kelamin',
    'tanggal_lahir',
    'email',
    'no_telepon',
    'status',
])]
class Siswa extends Model
{
    protected $table = 'siswa';

    protected function casts(): array
    {
        return [
            'tanggal_lahir' => 'date',
        ];
    }

    public function anggotaKelas(): HasMany
    {
        return $this->hasMany(AnggotaKelas::class, 'siswa_id');
    }

    public function kelas(): BelongsToMany
    {
        return $this->belongsToMany(Kelas::class, 'anggota_kelas', 'siswa_id', 'kelas_id')
            ->withTimestamps();
    }
}

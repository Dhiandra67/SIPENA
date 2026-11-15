<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'nip',
    'nama_lengkap',
    'jenis_kelamin',
    'no_telepon',
    'alamat',
    'foto_url',
])]
class Guru extends Model
{
    protected $table = 'guru';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function kelasPerwalian(): HasMany
    {
        return $this->hasMany(Kelas::class, 'wali_kelas_id');
    }

    public function pengajaran(): HasMany
    {
        return $this->hasMany(Pengajaran::class, 'guru_id');
    }
}

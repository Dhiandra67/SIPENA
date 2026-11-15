<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'periode_id',
    'predikat',
    'batas_bawah',
    'batas_atas',
    'keterangan',
])]
class RentangNilai extends Model
{
    protected $table = 'rentang_nilai';

    protected function casts(): array
    {
        return [
            'batas_bawah' => 'decimal:2',
            'batas_atas' => 'decimal:2',
        ];
    }

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodeAkademik::class, 'periode_id');
    }
}

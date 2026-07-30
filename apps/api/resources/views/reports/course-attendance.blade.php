<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Presensi - {{ $course['code'] }}</title>
    <style>
        @page {
            margin: 15mm 15mm 15mm 15mm;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10px;
            color: #1e293b;
            line-height: 1.4;
        }
        .header {
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .header h1 {
            font-size: 18px;
            margin: 0 0 4px 0;
            color: #0f172a;
        }
        .header p {
            font-size: 10px;
            margin: 0;
            color: #64748b;
        }
        .meta-grid {
            width: 100%;
            margin-bottom: 12px;
        }
        .meta-grid td {
            padding: 2px 0;
            vertical-align: top;
        }
        .meta-label {
            font-weight: bold;
            color: #475569;
            width: 120px;
        }
        table.matrix {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }
        table.matrix th, table.matrix td {
            border: 1px solid #cbd5e1;
            padding: 5px 4px;
            text-align: center;
            font-size: 9px;
        }
        table.matrix th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: bold;
        }
        table.matrix td.student-info {
            text-align: left;
        }
        .status-hadir {
            color: #166534;
            font-weight: bold;
        }
        .status-izin {
            color: #92400e;
            font-weight: bold;
        }
        .status-sakit {
            color: #9a3412;
            font-weight: bold;
        }
        .status-alfa {
            color: #991b1b;
            font-weight: bold;
        }
        .status-empty {
            color: #94a3b8;
        }
        .legend {
            margin-top: 12px;
            font-size: 8px;
            color: #64748b;
        }
        .legend span {
            margin-right: 12px;
        }
        .footer {
            margin-top: 20px;
            text-align: right;
            font-size: 8px;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>LAPORAN REKAPITULASI PRESENSI MAHASISWA</h1>
        <p>Sistem Presensi Mahasiswa Berbasis Face Recognition</p>
    </div>

    <table class="meta-grid">
        <tr>
            <td class="meta-label">Mata Kuliah:</td>
            <td><strong>{{ $course['name'] }}</strong> ({{ $course['code'] }})</td>
            <td class="meta-label">Total Sesi Pertemuan:</td>
            <td><strong>{{ count($sessions) }} Sesi</strong></td>
        </tr>
        <tr>
            <td class="meta-label">Koordinator Matkul:</td>
            <td>{{ $course['kormat_name'] }} ({{ $course['kormat_email'] }})</td>
            <td class="meta-label">Tanggal Cetak:</td>
            <td>{{ $course['generated_at'] }} WIB</td>
        </tr>
    </table>

    <table class="matrix">
        <thead>
            <tr>
                <th style="width: 25px;">No</th>
                <th style="width: 75px;">NIM</th>
                <th class="student-info" style="width: 140px;">Nama Mahasiswa</th>
                @foreach($sessions as $idx => $sess)
                    <th>S{{ $idx + 1 }}<br><span style="font-weight: normal; font-size: 7px;">{{ date('d/m', strtotime($sess['meeting_date'])) }}</span></th>
                @endforeach
                <th style="width: 25px;">H</th>
                <th style="width: 25px;">I</th>
                <th style="width: 25px;">S</th>
                <th style="width: 25px;">A</th>
                <th style="width: 35px;">% H</th>
            </tr>
        </thead>
        <tbody>
            @forelse($students as $index => $student)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $student['nim'] ?? '-' }}</td>
                    <td class="student-info"><strong>{{ $student['name'] }}</strong></td>
                    @foreach($sessions as $sess)
                        @php
                            $att = $student['sessions'][$sess['id']] ?? null;
                            $status = $att['status'] ?? 'belum_presensi';
                        @endphp
                        <td>
                            @if($status === 'hadir')
                                <span class="status-hadir">H</span>
                                @if(!empty($att['late_minutes']))
                                    <br><span style="font-size: 7px; color: #b45309;">+{{ $att['late_minutes'] }}m</span>
                                @endif
                            @elseif($status === 'izin')
                                <span class="status-izin">I</span>
                            @elseif($status === 'sakit')
                                <span class="status-sakit">S</span>
                            @elseif($status === 'alfa')
                                <span class="status-alfa">A</span>
                            @else
                                <span class="status-empty">-</span>
                            @endif
                        </td>
                    @endforeach
                    <td>{{ $student['stats']['hadir'] }}</td>
                    <td>{{ $student['stats']['izin'] }}</td>
                    <td>{{ $student['stats']['sakit'] }}</td>
                    <td>{{ $student['stats']['alfa'] }}</td>
                    <td><strong>{{ $student['stats']['attendance_percentage'] }}%</strong></td>
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($sessions) + 9 }}" style="text-align: center; color: #64748b; padding: 12px;">
                        Belum ada mahasiswa terdaftar di kelas ini.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="legend">
        <strong>Keterangan Status:</strong>
        <span class="status-hadir">H = Hadir</span>
        <span class="status-izin">I = Izin</span>
        <span class="status-sakit">S = Sakit</span>
        <span class="status-alfa">A = Alfa</span>
        <span class="status-empty">- = Belum Presensi</span>
        <span style="color: #b45309;">+m = Terlambat (menit)</span>
    </div>

    <div class="footer">
        Dokumen ini secara otomatis di-generate oleh Sistem Presensi Mahasiswa pada {{ $course['generated_at'] }}.
    </div>
</body>
</html>

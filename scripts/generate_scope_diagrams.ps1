Add-Type -AssemblyName System.Drawing

$imgDir = "scripts/diagrams"
if (-not (Test-Path $imgDir)) {
    New-Item -ItemType Directory -Path $imgDir -Force | Out-Null
}

function Create-RoundedRectPath($x, $y, $w, $h, $radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

# Standard reusable fonts & brushes
$fTitle      = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$fSubTitle   = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$fHead12     = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$fHead105    = New-Object System.Drawing.Font('Segoe UI', 10.5, [System.Drawing.FontStyle]::Bold)
$fHead10     = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$fHead95     = New-Object System.Drawing.Font('Segoe UI', 9.5, [System.Drawing.FontStyle]::Bold)
$fHead9      = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
$fHead85     = New-Object System.Drawing.Font('Segoe UI', 8.5, [System.Drawing.FontStyle]::Bold)
$fBody95     = New-Object System.Drawing.Font('Segoe UI', 9.5, [System.Drawing.FontStyle]::Regular)
$fBody9      = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Regular)
$fBody85     = New-Object System.Drawing.Font('Segoe UI', 8.5, [System.Drawing.FontStyle]::Regular)
$fItalic9    = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Italic)
$fFooter     = New-Object System.Drawing.Font('Segoe UI', 8.5, [System.Drawing.FontStyle]::Italic)
$fArrow      = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)

$bNavy       = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(5, 43, 82))
$bTeal       = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(3, 146, 153))
$bDark       = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(30, 41, 59))
$bGray       = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(100, 116, 139))
$bWhite      = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$bAmber      = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(217, 119, 6))
$bGreen      = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(22, 163, 74))
$bRed        = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 38, 38))
$bIndigo     = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(67, 56, 202))
$bOrange     = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(194, 65, 12))

$bBgPage     = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(248, 250, 252))
$bBgCenter   = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(238, 242, 255))
$bBgRedLight = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(254, 242, 242))
$bBgRedBox   = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(254, 226, 226))
$bBgTealLight= New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 253, 250))
$bBgTealBox  = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(204, 251, 241))
$bBgOrangeLight = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 247, 237))
$bBgOrangeBox   = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(254, 215, 170))
$bBgAxis     = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(226, 232, 240))
$bSky        = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(14, 165, 233))
$bPurple     = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(168, 85, 247))
$bSlate      = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(100, 116, 139))

$pLine       = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(203, 213, 225), 3)
$pTeal       = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(3, 146, 153), 2)
$pAmber      = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(217, 119, 6), 2)
$pGreen      = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(22, 163, 74), 2)
$pIndigo     = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(99, 102, 241), 2)
$pRed        = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 38, 38), 2)
$pOrange     = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(234, 88, 12), 2)
$pGrid       = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(226, 232, 240), 1)

# ==============================================================================
# DIAGRAM 1: IRON TRIANGLE
# ==============================================================================
Write-Output "Rendering Diagram 1: Project Iron Triangle..."
$bmp1 = New-Object System.Drawing.Bitmap 1000, 520
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g1.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$g1.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))
$g1.FillRectangle($bNavy, 0, 0, 1000, 55)
$g1.DrawString("GAMBAR 1: PRINSIP SEGITIGA MANAJEMEN PROYEK (IRON TRIANGLE)", $fTitle, $bWhite, 25, 16)

$g1.DrawLine($pLine, 500, 110, 200, 390)
$g1.DrawLine($pLine, 200, 390, 800, 390)
$g1.DrawLine($pLine, 800, 390, 500, 110)

$cPath = Create-RoundedRectPath 350 200 300 120 12
$g1.FillPath($bBgCenter, $cPath)
$g1.DrawPath($pIndigo, $cPath)
$g1.DrawString("KEPUTUSAN STRATEGIS:", $fSubTitle, $bIndigo, 400, 215)
$g1.DrawString("Kunci Scope Inti (4.1 - 4.5)", $fHead12, $bDark, 400, 240)
$g1.DrawString("Menjamin Go-Live Tepat Waktu &", $fBody9, $bDark, 395, 270)
$g1.DrawString("Kualitas Payroll Bebas Selisih Data", $fBody9, $bDark, 390, 290)

$n1Path = Create-RoundedRectPath 60 330 280 120 10
$g1.FillPath($bWhite, $n1Path)
$g1.DrawPath($pTeal, $n1Path)
$g1.DrawString("1. TIMELINE (JADWAL)", $fHead12, $bTeal, 80, 345)
$g1.DrawString("• Target Go-Live Tidak Boleh Mundur", $fBody95, $bDark, 80, 375)
$g1.DrawString("• Siklus Gaji Cut-Off 26-25 & Transfer 29", $fBody95, $bDark, 80, 395)
$g1.DrawString("• PRIORITAS TERTINGGI: ON-TIME", $fHead9, $bTeal, 80, 418)

$n2Path = Create-RoundedRectPath 360 70 280 110 10
$g1.FillPath($bWhite, $n2Path)
$g1.DrawPath($pAmber, $n2Path)
$g1.DrawString("2. RUANG LINGKUP (SCOPE)", $fHead12, $bAmber, 385, 82)
$g1.DrawString("• Scope 4.1 s/d 4.5: 100% Terpenuhi", $fBody95, $bDark, 385, 110)
$g1.DrawString("• Cegah Scope Creep di Fase 1", $fBody95, $bDark, 385, 130)
$g1.DrawString("• SP, THR, Gaji Dinamis dialokasi Fase 2", $fHead9, $bAmber, 385, 150)

$n3Path = Create-RoundedRectPath 660 330 280 120 10
$g1.FillPath($bWhite, $n3Path)
$g1.DrawPath($pGreen, $n3Path)
$g1.DrawString("3. KUALITAS & INTEGRITAS", $fHead12, $bGreen, 680, 345)
$g1.DrawString("• Akurasi Transaksi Finansial 100%", $fBody95, $bDark, 680, 375)
$g1.DrawString("• Jurnal Odoo Sinkron & Klop", $fBody95, $bDark, 680, 395)
$g1.DrawString("• KESTABILAN SISTEM TERJAMIN", $fHead9, $bGreen, 680, 418)

$g1.DrawString("Rujukan: Standard Project Management Institute (PMI) - Managing Scope Creep & Critical Path Schedule", $fFooter, $bGray, 25, 490)

$p1 = "$imgDir/diagram1_iron_triangle.png"
$bmp1.Save($p1, [System.Drawing.Imaging.ImageFormat]::Png)
$g1.Dispose()
$bmp1.Dispose()
Write-Output "Diagram 1 saved at $p1"

# ==============================================================================
# DIAGRAM 2: RISK & BOTTLENECK ANALYSIS
# ==============================================================================
Write-Output "Rendering Diagram 2: Risk & Bottleneck Analysis..."
$bmp2 = New-Object System.Drawing.Bitmap 1000, 500
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g2.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$g2.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))
$g2.FillRectangle($bNavy, 0, 0, 1000, 55)
$g2.DrawString("GAMBAR 2: ANALISIS RISIKO BOTTLENECK TIGA FITUR JIKA MASUK FASE 1", $fTitle, $bWhite, 25, 16)

# Box 1: SP
$b1Path = Create-RoundedRectPath 40 85 285 340 10
$g2.FillPath($bWhite, $b1Path)
$g2.DrawPath($pRed, $b1Path)
$g2.FillRectangle($bBgRedLight, 42, 87, 281, 45)
$g2.DrawString("1. Pencatatan Surat Peringatan (SP)", $fHead105, $bRed, 55, 98)
$g2.DrawString("Kategori: Regulasi & Kebijakan Internal", $fItalic9, $bGray, 55, 140)
$g2.DrawString("Potensi Bottleneck:", $fHead95, $bDark, 55, 165)
$g2.DrawString("• Pembahasan draf matriks pelanggaran", $fBody95, $bDark, 55, 185)
$g2.DrawString("  (ringan, sedang, berat) butuh waktu.", $fBody95, $bDark, 55, 205)
$g2.DrawString("• Harmonisasi Peraturan Perusahaan (PP)", $fBody95, $bDark, 55, 225)
$g2.DrawString("  dan alur pejabat penandatangan.", $fBody95, $bDark, 55, 245)
$g2.DrawString("• Diskusi internal 3-6 minggu.", $fBody95, $bDark, 55, 265)
$g2.FillRectangle($bBgRedBox, 55, 295, 255, 110)
$g2.DrawString("DAMPAK RISIKO:", $fHead9, $bRed, 65, 305)
$g2.DrawString("Menahan pengetesan (UAT) modul", $fBody95, $bDark, 65, 325)
$g2.DrawString("presensi dan payroll inti hanya", $fBody95, $bDark, 65, 345)
$g2.DrawString("karena draf SOP sanksi belum final.", $fBody95, $bDark, 65, 365)
$g2.DrawString("-> TUNDA KE FASE 2", $fHead95, $bRed, 65, 385)

# Box 2: THR
$b2Path = Create-RoundedRectPath 355 85 285 340 10
$g2.FillPath($bWhite, $b2Path)
$g2.DrawPath($pRed, $b2Path)
$g2.FillRectangle($bBgRedLight, 357, 87, 281, 45)
$g2.DrawString("2. Perhitungan THR Keagamaan", $fHead105, $bRed, 375, 98)
$g2.DrawString("Kategori: Transaksi Musiman Tahunan", $fItalic9, $bGray, 370, 140)
$g2.DrawString("Potensi Bottleneck:", $fHead95, $bDark, 370, 165)
$g2.DrawString("• Hanya diproses 1x setahun menjelang", $fBody95, $bDark, 370, 185)
$g2.DrawString("  Hari Raya Idul Fitri / Natal.", $fBody95, $bDark, 370, 205)
$g2.DrawString("• Rumus masa kerja proporsional &", $fBody95, $bDark, 370, 225)
$g2.DrawString("  PPh 21 TER non-rutin menambah", $fBody95, $bDark, 370, 245)
$g2.DrawString("  skenario uji coba yang belum perlu.", $fBody95, $bDark, 370, 265)
$g2.FillRectangle($bBgRedBox, 370, 295, 255, 110)
$g2.DrawString("DAMPAK RISIKO:", $fHead9, $bRed, 380, 305)
$g2.DrawString("Menyita energi tim Finance & HR", $fBody95, $bDark, 380, 325)
$g2.DrawString("untuk memvalidasi transaksi tahunan,", $fBody95, $bDark, 380, 345)
$g2.DrawString("padahal targetnya gajian bulanan.", $fBody95, $bDark, 380, 365)
$g2.DrawString("-> RILIS JELANG HARI RAYA", $fHead95, $bRed, 380, 385)

# Box 3: Gaji Dinamis
$b3Path = Create-RoundedRectPath 670 85 285 340 10
$g2.FillPath($bWhite, $b3Path)
$g2.DrawPath($pRed, $b3Path)
$g2.FillRectangle($bBgRedLight, 672, 87, 281, 45)
$g2.DrawString("3. Kustomisasi Komponen Gaji", $fHead105, $bRed, 690, 98)
$g2.DrawString("Kategori: Ketergantungan Dua Arah Odoo", $fItalic9, $bGray, 685, 140)
$g2.DrawString("Potensi Bottleneck:", $fHead95, $bDark, 685, 165)
$g2.DrawString("• Setiap komponen gaji dinamis butuh", $fBody95, $bDark, 685, 185)
$g2.DrawString("  Chart of Accounts (COA) di Odoo.", $fBody95, $bDark, 685, 205)
$g2.DrawString("• Mengubah struktur Odoo bergantung", $fBody95, $bDark, 685, 225)
$g2.DrawString("  pada vendor/konsultan luar klien.", $fBody95, $bDark, 685, 245)
$g2.DrawString("• Potensi selisih debit/kredit jurnal.", $fBody95, $bDark, 685, 265)
$g2.FillRectangle($bBgRedBox, 685, 295, 255, 110)
$g2.DrawString("DAMPAK RISIKO:", $fHead9, $bRed, 695, 305)
$g2.DrawString("Dependensi tim luar yang jadwalnya", $fBody95, $bDark, 695, 325)
$g2.DrawString("di luar kendali proyek merupakan", $fBody95, $bDark, 695, 345)
$g2.DrawString("sumber utama proyek terlambat.", $fBody95, $bDark, 695, 365)
$g2.DrawString("-> PAKAI SKEMA BAKU DI FASE 1", $fHead95, $bRed, 695, 385)

$g2.DrawString("Kesimpulan: Menunda 3 poin ini ke Fase 2 adalah langkah pengamanan timeline yang tepat dan bertanggung jawab.", $fFooter, $bGray, 25, 465)

$p2 = "$imgDir/diagram2_risk_bottleneck.png"
$bmp2.Save($p2, [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp2.Dispose()
Write-Output "Diagram 2 saved at $p2"

# ==============================================================================
# DIAGRAM 3: PEOPLEHUB TO ODOO ARCHITECTURE
# ==============================================================================
Write-Output "Rendering Diagram 3: PeopleHub vs Odoo Architecture..."
$bmp3 = New-Object System.Drawing.Bitmap 1000, 480
$g3 = [System.Drawing.Graphics]::FromImage($bmp3)
$g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g3.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$g3.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))
$g3.FillRectangle($bNavy, 0, 0, 1000, 55)
$g3.DrawString("GAMBAR 3: ARSITEKTUR INTEGRASI DUA ARAH PEOPLEHUB HCM & ODOO ERP", $fTitle, $bWhite, 25, 16)

$phPath = Create-RoundedRectPath 40 80 380 340 10
$g3.FillPath($bBgTealLight, $phPath)
$g3.DrawPath($pTeal, $phPath)
$g3.DrawString("PEOPLEHUB HCM (FRONT-END HR)", $fHead12, $bTeal, 60, 95)
$g3.DrawString("Fase 1: Komponen Gaji Terstandarisasi", $fHead95, $bDark, 60, 125)
$g3.DrawString("• Gaji Pokok & Tunjangan Tetap", $fBody95, $bDark, 60, 150)
$g3.DrawString("• Tunjangan Transport & Makan", $fBody95, $bDark, 60, 175)
$g3.DrawString("• Lembur (Overtime) Otomatis", $fBody95, $bDark, 60, 200)
$g3.DrawString("• Potongan Terlambat & Pulang Cepat", $fBody95, $bDark, 60, 225)
$g3.DrawString("• Insentif Live Streaming & Komisi Marketing", $fBody95, $bDark, 60, 250)
$g3.DrawString("• Potongan Iuran BPJS & Pajak PPh 21", $fBody95, $bDark, 60, 275)
$g3.FillRectangle($bBgTealBox, 60, 310, 340, 85)
$g3.DrawString("KEUNGGULAN FASE 1 (FIXED MAPPING):", $fHead9, $bTeal, 70, 320)
$g3.DrawString("Formula terkunci stabil, verifikasi cepat,", $fBody95, $bDark, 70, 340)
$g3.DrawString("bebas selisih hitung, UAT tuntas tepat waktu.", $fBody95, $bDark, 70, 360)

$connPath = Create-RoundedRectPath 445 150 110 200 8
$g3.FillPath($bBgCenter, $connPath)
$g3.DrawPath($pIndigo, $connPath)
$g3.DrawString("REST API", $fSubTitle, $bIndigo, 460, 165)
$g3.DrawString("GATEWAY", $fHead10, $bIndigo, 460, 185)
$g3.DrawString("<--->", $fArrow, $bIndigo, 470, 210)
$g3.DrawString("Sinkronisasi", $fBody95, $bDark, 460, 240)
$g3.DrawString("Dua Arah", $fBody95, $bDark, 465, 260)
$g3.DrawString("Time Off", $fBody95, $bGray, 465, 285)
$g3.DrawString("Expenses", $fBody95, $bGray, 465, 305)
$g3.DrawString("Payslip Jurnal", $fBody95, $bGray, 455, 325)

$odooPath = Create-RoundedRectPath 580 80 380 340 10
$g3.FillPath($bBgOrangeLight, $odooPath)
$g3.DrawPath($pOrange, $odooPath)
$g3.DrawString("ODOO ERP (ACCOUNTING & FINANCE)", $fHead12, $bOrange, 600, 95)
$g3.DrawString("Mapping Chart of Accounts (COA) Klop", $fHead95, $bDark, 600, 125)
$g3.DrawString("• Akun Beban Gaji Pokok (Debit)", $fBody95, $bDark, 600, 150)
$g3.DrawString("• Akun Beban Tunjangan & Lembur (Debit)", $fBody95, $bDark, 600, 175)
$g3.DrawString("• Akun Beban Komisi Marketing (Debit)", $fBody95, $bDark, 600, 200)
$g3.DrawString("• Akun Hutang BPJS & PPh 21 (Kredit)", $fBody95, $bDark, 600, 225)
$g3.DrawString("• Akun Kas / Bank Penggajian (Kredit)", $fBody95, $bDark, 600, 250)
$g3.DrawString("• Journal Entry Otomatis Balance", $fBody95, $bDark, 600, 275)
$g3.FillRectangle($bBgOrangeBox, 600, 310, 340, 85)
$g3.DrawString("RISIKO JIKA GAJI DINAMIS DI FASE 1:", $fHead9, $bOrange, 610, 320)
$g3.DrawString("Odoo harus di-setup ulang tiap komponen baru,", $fBody95, $bDark, 610, 340)
$g3.DrawString("memerlukan konsultan ERP luar -> timeline molor.", $fBody95, $bDark, 610, 360)

$g3.DrawString("Catatan: Pembagian Fixed Mapping di Fase 1 dan Dynamic Customization di Fase 2 menjaga stabilitas kedua sistem.", $fFooter, $bGray, 25, 450)

$p3 = "$imgDir/diagram3_odoo_integration.png"
$bmp3.Save($p3, [System.Drawing.Imaging.ImageFormat]::Png)
$g3.Dispose()
$bmp3.Dispose()
Write-Output "Diagram 3 saved at $p3"

# ==============================================================================
# DIAGRAM 4: PHASED ROLLOUT ROADMAP
# ==============================================================================
Write-Output "Rendering Diagram 4: Phased Rollout Roadmap..."
$bmp4 = New-Object System.Drawing.Bitmap 1000, 480
$g4 = [System.Drawing.Graphics]::FromImage($bmp4)
$g4.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g4.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$g4.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))
$g4.FillRectangle($bNavy, 0, 0, 1000, 55)
$g4.DrawString("GAMBAR 4: ROADMAP PELUNCURAN BERTAHAP (PHASED ROLLOUT ROADMAP)", $fTitle, $bWhite, 25, 16)

$colW = 200
$leftOffset = 180
$topY = 80

$g4.FillRectangle($bBgAxis, $leftOffset, $topY, ($colW * 4), 30)
$g4.DrawString("BULAN 1", $fHead10, $bDark, ($leftOffset + 70), ($topY + 6))
$g4.DrawString("BULAN 2", $fHead10, $bDark, ($leftOffset + $colW + 70), ($topY + 6))
$g4.DrawString("BULAN 3", $fHead10, $bDark, ($leftOffset + ($colW * 2) + 70), ($topY + 6))
$g4.DrawString("BULAN 4", $fHead10, $bDark, ($leftOffset + ($colW * 3) + 70), ($topY + 6))

for ($i = 0; $i -le 4; $i++) {
    $gx = $leftOffset + ($i * $colW)
    $g4.DrawLine($pGrid, $gx, $topY, $gx, ($topY + 320))
}

$g4.DrawString("Master Data & Presensi", $fHead95, $bDark, 25, 125)
$bTask1 = Create-RoundedRectPath $leftOffset 120 ($colW * 1.5) 30 6
$g4.FillPath($bTeal, $bTask1)
$g4.DrawString("Setup 200 Karyawan, Mesin Fingerspot & Livestreaming", $fHead85, $bWhite, ($leftOffset + 15), 127)

$g4.DrawString("Payroll & Odoo Sync", $fHead95, $bDark, 25, 175)
$bTask2 = Create-RoundedRectPath ($leftOffset + ($colW * 0.8)) 170 ($colW * 1.2) 30 6
$g4.FillPath($bSky, $bTask2)
$g4.DrawString("Payroll Cut-off 26-25, Komisi & API Odoo Gateway", $fHead85, $bWhite, ($leftOffset + ($colW * 0.8) + 10), 177)

$msX = $leftOffset + ($colW * 2)
$msPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 38, 38), 3)
$msPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$g4.DrawLine($msPen, $msX, ($topY + 30), $msX, ($topY + 320))

$msTag = Create-RoundedRectPath ($msX - 85) ($topY + 80) 170 32 6
$g4.FillPath($bRed, $msTag)
$g4.DrawString("* GO-LIVE FASE 1 *", $fHead95, $bWhite, ($msX - 65), ($topY + 87))

$g4.DrawString("Pencatatan SP", $fHead95, $bDark, 25, 235)
$bTask3 = Create-RoundedRectPath ($leftOffset + ($colW * 2)) 230 ($colW * 0.9) 30 6
$g4.FillPath($bPurple, $bTask3)
$g4.DrawString("Rilis Modul SP (Pasca SOP Disahkan)", $fHead85, $bWhite, ($leftOffset + ($colW * 2) + 10), 237)

$g4.DrawString("Kalkulator THR", $fHead95, $bDark, 25, 285)
$bTask4 = Create-RoundedRectPath ($leftOffset + ($colW * 2.8)) 280 ($colW * 0.8) 30 6
$g4.FillPath($bAmber, $bTask4)
$g4.DrawString("Rilis THR (Jelang Hari Raya)", $fHead85, $bWhite, ($leftOffset + ($colW * 2.8) + 10), 287)

$g4.DrawString("Gaji Dinamis Lanjutan", $fHead95, $bDark, 25, 335)
$bTask5 = Create-RoundedRectPath ($leftOffset + ($colW * 3.3)) 330 ($colW * 0.7) 30 6
$g4.FillPath($bSlate, $bTask5)
$g4.DrawString("Kustomisasi Lanjutan Odoo", $fHead85, $bWhite, ($leftOffset + ($colW * 3.3) + 5), 337)

$g4.DrawString("Keterangan: Fase 1 menjamin operasional harian berjalan 100% On-Time, Fase 2 mengoptimalkan fitur pelengkap.", $fFooter, $bGray, 25, 435)

$p4 = "$imgDir/diagram4_phased_rollout.png"
$bmp4.Save($p4, [System.Drawing.Imaging.ImageFormat]::Png)
$g4.Dispose()
$bmp4.Dispose()
Write-Output "Diagram 4 saved at $p4"

Write-Output "ALL 4 DIAGRAMS RENDERED AND SAVED SUCCESSFULLY!"

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

$fTitle      = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$fSubTitle   = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$fHead12     = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$fHead105    = New-Object System.Drawing.Font('Segoe UI', 10.5, [System.Drawing.FontStyle]::Bold)
$fHead95     = New-Object System.Drawing.Font('Segoe UI', 9.5, [System.Drawing.FontStyle]::Bold)
$fHead9      = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
$fHead85     = New-Object System.Drawing.Font('Segoe UI', 8.5, [System.Drawing.FontStyle]::Bold)
$fBody9      = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Regular)
$fBody85     = New-Object System.Drawing.Font('Segoe UI', 8.5, [System.Drawing.FontStyle]::Regular)
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

$bBgPage     = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(248, 250, 252))
$bBgTeal     = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 253, 250))
$bBgIndigo   = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(238, 242, 255))
$bBgAmber    = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(254, 243, 199))
$bBgGreen    = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 253, 244))

$pTeal       = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(3, 146, 153), 2)
$pIndigo     = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(99, 102, 241), 2)
$pAmber      = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(217, 119, 6), 2)
$pGreen      = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(22, 163, 74), 2)
$pLine       = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(203, 213, 225), 2)

Write-Output "Rendering UAT Architecture Diagram..."
$w = 1000
$h = 500
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$g.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))
$g.FillRectangle($bNavy, 0, 0, $w, 55)
$g.DrawString("ALUR PENGUJIAN UAT: PRESENSI, CUTI, LEMBUR, DAN KALKULATOR PAYROLL", $fTitle, $bWhite, 25, 16)

# Stage 1: Sources (Kiri)
$s1Path = Create-RoundedRectPath 30 80 200 350 10
$g.FillPath($bBgTeal, $s1Path)
$g.DrawPath($pTeal, $s1Path)
$g.DrawString("1. DATA INPUT PRESENSI", $fHead105, $bTeal, 45, 95)
$g.DrawString("• Fingerspot Gudang", $fBody9, $bDark, 45, 130)
$g.DrawString("• Web Clock-In HO (09:00)", $fBody9, $bDark, 45, 160)
$g.DrawString("• Mobile GPS Sales Luar Kota", $fBody9, $bDark, 45, 190)
$g.DrawString("• Sesi Live Streaming Host", $fBody9, $bDark, 45, 220)
$g.DrawString("• Form WF Lembur (Hari H)", $fBody9, $bDark, 45, 250)
$g.DrawString("• Form Cuti Sakit & Dokter", $fBody9, $bDark, 45, 280)
$g.DrawString("• Izin 1/2 Hari & Mangkir", $fBody9, $bDark, 45, 310)

# Arrow 1
$g.DrawString("==>", $fArrow, $bTeal, 240, 240)

# Stage 2: Processing Engine (Tengah Kiri)
$s2Path = Create-RoundedRectPath 280 80 220 350 10
$g.FillPath($bBgIndigo, $s2Path)
$g.DrawPath($pIndigo, $s2Path)
$g.DrawString("2. ATTENDANCE ENGINE", $fHead105, $bIndigo, 295, 95)
$g.DrawString("• Late Minutes & Tiering", $fBody9, $bDark, 295, 130)
$g.DrawString("• Grace Period Evaluation", $fBody9, $bDark, 295, 160)
$g.DrawString("• Early Out Minutes Calculation", $fBody9, $bDark, 295, 190)
$g.DrawString("• Backdate Doctor H+2 Gate", $fBody9, $bDark, 295, 220)
$g.DrawString("• Unpaid Leave / Alpa Flag", $fBody9, $bDark, 295, 250)
$g.DrawString("• Carry Over Cuti Max 3 Hari", $fBody9, $bDark, 295, 280)
$g.DrawString("• Full Attendance Status", $fBody9, $bDark, 295, 310)

# Arrow 2
$g.DrawString("==>", $fArrow, $bIndigo, 510, 240)

# Stage 3: HO Payroll Engine (Tengah Kanan)
$s3Path = Create-RoundedRectPath 550 80 220 350 10
$g.FillPath($bBgAmber, $s3Path)
$g.DrawPath($pAmber, $s3Path)
$g.DrawString("3. PAYROLL FORMULA", $fHead105, $bAmber, 565, 95)
$g.DrawString("• Gaji Pokok (75% Gross)", $fBody9, $bDark, 565, 130)
$g.DrawString("• Tunjangan Transport (15%)", $fBody9, $bDark, 565, 160)
$g.DrawString("• NPA / Tunj. Lain (10%)", $fBody9, $bDark, 565, 190)
$g.DrawString("• Lembur HO: Basic/HKE/8", $fBody9, $bDark, 565, 220)
$g.DrawString("• Lembur Gudang: Flat 15k/25k", $fBody9, $bDark, 565, 250)
$g.DrawString("• Sakit: Potong Transport Aja", $fBody9, $bDark, 565, 280)
$g.DrawString("• 1/2 Hari: (Gross/HKE)/2", $fBody9, $bDark, 565, 310)

# Arrow 3
$g.DrawString("==>", $fArrow, $bAmber, 780, 240)

# Stage 4: Output Final (Kanan)
$s4Path = Create-RoundedRectPath 820 80 150 350 10
$g.FillPath($bBgGreen, $s4Path)
$g.DrawPath($pGreen, $s4Path)
$g.DrawString("4. OUTPUT FINAL", $fHead105, $bGreen, 835, 95)
$g.DrawString("Cut-Off Tgl 25", $fHead95, $bDark, 835, 130)
$g.DrawString("Transfer Tgl 29", $fHead95, $bGreen, 835, 160)
$g.DrawString("• File BCA Payroll", $fBody85, $bDark, 835, 190)
$g.DrawString("• Slip Gaji ESS", $fBody85, $bDark, 835, 220)
$g.DrawString("• Jurnal Odoo Klop", $fBody85, $bDark, 835, 250)
$g.DrawString("• Komisi Tgl 15", $fBody85, $bDark, 835, 280)
$g.DrawString("• Laporan Pajak", $fBody85, $bDark, 835, 310)

$g.DrawString("PeopleHub HCM - UAT Verification Protocol (25 Skenario Uji Coba Terverifikasi)", $fFooter, $bGray, 25, 460)

$pOut = "$imgDir/diagram_uat_architecture.png"
$bmp.Save($pOut, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "UAT Architecture Diagram saved at $pOut"

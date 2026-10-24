import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { BuildingItem, EvaluatedComparableItem } from '../components/BceCalculator';

export interface ReportData {
  collateralLocationName: string;
  collateralCoordinates: { lat: number; lon: number };
  collateralAreaM2: number;
  analisName: string;
  penilaiName?: string;
  penilaiJabatan?: string;
  penyetujuName?: string;
  penyetujuJabatan?: string;
  shmImageBase64?: string | null;
  gistaruImageBase64?: string | null;
  googleMapsUrl?: string;
  bhumiUrl?: string;
  activeTanahPricePerM2: number;
  activeTanahBcePercent: number;
  nilaiPasarTanah: number;
  nilaiBceTanah: number;
  buildings: BuildingItem[];
  grandTotalNilaiPasar: number;
  grandTotalNilaiBce: number;
  comparables: EvaluatedComparableItem[];
  bceScores: {
    wilayah: number;
    lokasiJalan: number;
    kualitasTanah: number;
    marketable: number;
    total: number;
    bcePercent: number;
  };
}

export async function exportToExcel(data: ReportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Analisa Agunan Bank';
  workbook.created = new Date();

  // SHEET 1: KESIMPULAN NILAI PASAR & BCE (DENGAN RUMUS EXCEL)
  const sheet = workbook.addWorksheet('Kesimpulan Agunan', {
    views: [{ showGridLines: true }],
  });

  // Judul & Header Laporan
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = 'SISTEM ANALISA AGUNAN BERBASIS DATA PASAR';
  sheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Blue 900
  };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 30;

  sheet.mergeCells('A2:G2');
  sheet.getCell('A2').value = 'REKAPITULASI PENILAIAN NILAI PASAR DAN NILAI LIKUIDASI BCE';
  sheet.getCell('A2').font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A2').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }, // Blue 600
  };
  sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 24;

  // Metadata Info
  sheet.getCell('A4').value = 'Lokasi Agunan:';
  sheet.getCell('B4').value = data.collateralLocationName || 'Area Bali';
  sheet.getCell('A5').value = 'Koordinat:';
  sheet.getCell('B5').value = `${data.collateralCoordinates.lat}, ${data.collateralCoordinates.lon}`;
  sheet.getCell('A6').value = 'Tanggal Analisa:';
  sheet.getCell('B6').value = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  sheet.getCell('A7').value = 'Analis Kredit:';
  sheet.getCell('B7').value = data.analisName || 'Budi Pratama (Analis Kredit)';

  ['A4', 'A5', 'A6', 'A7'].forEach((cellKey) => {
    sheet.getCell(cellKey).font = { bold: true, size: 10, color: { argb: 'FF475569' } };
  });

  // Header Tabel Kesimpulan
  const headerRowIdx = 9;
  const headers = [
    'Keterangan',
    'Luas',
    'Satuan',
    'Harga Pasar per m2',
    'BCE',
    'Nilai Pasar',
    'Nilai BCE',
  ];
  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.values = headers;
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // Slate 900
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' },
    };
  });

  let currentRowIdx = 10;
  const startDataRow = currentRowIdx;

  // BARIS 1: TANAH (DENGAN RUMUS)
  const tanahRow = sheet.getRow(currentRowIdx);
  tanahRow.getCell(1).value = 'Tanah';
  tanahRow.getCell(2).value = data.collateralAreaM2;
  tanahRow.getCell(3).value = 'm2';
  tanahRow.getCell(4).value = data.activeTanahPricePerM2;
  tanahRow.getCell(5).value = data.activeTanahBcePercent / 100;
  // RUMUS: Nilai Pasar = Luas (B) * Harga Pasar (D)
  tanahRow.getCell(6).value = {
    formula: `B${currentRowIdx}*D${currentRowIdx}`,
    result: data.nilaiPasarTanah,
  };
  // RUMUS: Nilai BCE = Nilai Pasar (F) * BCE% (E)
  tanahRow.getCell(7).value = {
    formula: `F${currentRowIdx}*E${currentRowIdx}`,
    result: data.nilaiBceTanah,
  };

  tanahRow.height = 22;
  currentRowIdx++;

  // BARIS 2+: BANGUNAN-BANGUNAN (DENGAN RUMUS)
  data.buildings.forEach((b) => {
    const row = sheet.getRow(currentRowIdx);
    const pasarEstimasi = Math.round((Number(b.luasM2) || 0) * (Number(b.hargaPasarPerM2) || 0));
    const bceEstimasi = Math.round(pasarEstimasi * ((Number(b.bcePercent) || 0) / 100));

    row.getCell(1).value = b.keterangan || 'Bangunan';
    row.getCell(2).value = Number(b.luasM2) || 0;
    row.getCell(3).value = 'm2';
    row.getCell(4).value = Number(b.hargaPasarPerM2) || 0;
    row.getCell(5).value = (Number(b.bcePercent) || 0) / 100;
    // RUMUS: Nilai Pasar = Luas * Harga Pasar per m2
    row.getCell(6).value = {
      formula: `B${currentRowIdx}*D${currentRowIdx}`,
      result: pasarEstimasi,
    };
    // RUMUS: Nilai BCE = Nilai Pasar * BCE%
    row.getCell(7).value = {
      formula: `F${currentRowIdx}*E${currentRowIdx}`,
      result: bceEstimasi,
    };

    row.height = 22;
    currentRowIdx++;
  });

  const endDataRow = currentRowIdx - 1;

  // BARIS TOTAL: JUMLAH NILAI TANAH DAN BANGUNAN (DENGAN RUMUS SUM)
  const totalRow = sheet.getRow(currentRowIdx);
  totalRow.getCell(1).value = 'Jumlah nilai tanah dan bangunan';
  totalRow.getCell(2).value = '';
  totalRow.getCell(3).value = '';
  totalRow.getCell(4).value = '';
  totalRow.getCell(5).value = '';
  // RUMUS: SUM(F10:F...)
  totalRow.getCell(6).value = {
    formula: `SUM(F${startDataRow}:F${endDataRow})`,
    result: data.grandTotalNilaiPasar,
  };
  // RUMUS: SUM(G10:G...)
  totalRow.getCell(7).value = {
    formula: `SUM(G${startDataRow}:G${endDataRow})`,
    result: data.grandTotalNilaiBce,
  };
  totalRow.height = 26;

  // Formatting & Styling Cells
  for (let r = startDataRow; r <= currentRowIdx; r++) {
    const row = sheet.getRow(r);
    const isTotal = r === currentRowIdx;

    row.getCell(1).font = { bold: isTotal, size: 10 };
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(2).numFmt = '#,##0';
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(4).numFmt = '"Rp "#,##0';

    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(5).numFmt = '0%';
    if (!isTotal) {
      row.getCell(5).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF1F2' }, // Red 50
      };
    }

    row.getCell(6).alignment = { horizontal: 'right' };
    row.getCell(6).numFmt = '"Rp "#,##0';
    row.getCell(6).font = { bold: isTotal, size: 10, color: { argb: isTotal ? 'FF1E3A8A' : 'FF000000' } };
    if (!isTotal) {
      row.getCell(6).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFF6FF' }, // Blue 50
      };
    }

    row.getCell(7).alignment = { horizontal: 'right' };
    row.getCell(7).numFmt = '"Rp "#,##0';
    row.getCell(7).font = { bold: isTotal, size: 10, color: { argb: isTotal ? 'FF065F46' : 'FF000000' } };
    if (!isTotal) {
      row.getCell(7).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFECFDF5' }, // Emerald 50
      };
    }

    // Border styling
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber <= 7) {
        if (isTotal) {
          cell.border = {
            top: { style: 'medium' },
            left: { style: 'thin' },
            bottom: { style: 'double' },
            right: { style: 'thin' },
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' }, // Slate 100
          };
        } else {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        }
      }
    });
  }

  // Lebar Kolom Lembar Kerja
  sheet.columns = [
    { width: 32 }, // Keterangan
    { width: 14 }, // Luas
    { width: 10 }, // Satuan
    { width: 22 }, // Harga Pasar per m2
    { width: 12 }, // BCE
    { width: 25 }, // Nilai Pasar
    { width: 25 }, // Nilai BCE
  ];

  // Simpan dan Download File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Analisa_Agunan_${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

async function loadBase64Image(src: string): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('data:image')) return src;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Gagal memuat logo untuk PDF:', err);
    return null;
  }
}

export async function exportToPdf(data: ReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const formatRupiah = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
  };

  const penilaiName = data.penilaiName || data.analisName || 'user';
  const penilaiJabatan = data.penilaiJabatan || 'jabatan';
  const penyetujuName = data.penyetujuName || 'admin_1';
  const penyetujuJabatan = data.penyetujuJabatan || 'jabatan';

  const logoBase64 = await loadBase64Image('/logo1.png');

  // ==================== HALAMAN 1 ====================
  // 1. Logo Bank Kertiawan (Kiri Atas)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, 10, 48, 11);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('PT. BPR BANK KERTIAWAN', 14, 18);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text('PT. BPR BANK KERTIAWAN', 14, 18);
  }

  // 2. Judul Dokumen (Tengah)
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Hasil Penilaian Agunan', 105, 34, { align: 'center' });

  // 3. Metadata Informasi Agunan
  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const metadataRows = [
    ['Lokasi Titik', `: ${data.collateralLocationName || 'Area Bali'}`],
    ['Koordinat', `: ${data.collateralCoordinates.lat}, ${data.collateralCoordinates.lon}`],
    ['Luas Tanah Agunan', `: ${data.collateralAreaM2} m² (${(data.collateralAreaM2 / 100).toFixed(2)} are)`],
    ['Tanggal Penilaian', `: ${dateFormatted}`],
    ['Analis Kredit', `: ${penilaiName} (${penilaiJabatan})`],
  ];

  autoTable(doc, {
    startY: 40,
    body: metadataRows,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 0.9, textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 144 },
    },
    margin: { left: 14, right: 14 },
  });

  // 4. Tabel 1: Data Pembanding Pasar
  const startY1 = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. DATA PEMBANDING PASAR (SETELAH FAKTOR JARAK & DC)', 14, startY1);

  const compRows = data.comparables.map((item, idx) => [
    idx + 1,
    item.referenceTitle || 'Listing Properti',
    item.distanceMeters !== null ? `${item.distanceMeters} m` : '—',
    item.discountFactor !== null ? `${Math.round(item.discountFactor * 100)}%` : '—',
    formatRupiah(item.offerPrice),
    formatRupiah(item.discountedOfferPrice),
    formatRupiah(item.discountedPricePerM2),
  ]);

  autoTable(doc, {
    startY: startY1 + 2,
    head: [
      ['No', 'Data Pembanding', 'JDOP', 'DC %', 'Penawaran', 'Setelah DC', 'Harga/m² DC'],
    ],
    body: compRows.length > 0 ? compRows : [['—', 'Belum ada data pembanding dipilih', '—', '—', '—', '—', '—']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], fontSize: 7.5, fontStyle: 'bold', textColor: [255, 255, 255] },
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 54 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Tabel 2: Rekapitulasi Skor Kalkulator BCE
  const startY2 = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. REKAPITULASI SKOR KALKULATOR BCE', 14, startY2);

  const bceRows = [
    [
      'A. Wilayah Ruang Lingkup',
      data.bceScores.wilayah,
      'C. Kualitas Tanah',
      data.bceScores.kualitasTanah,
    ],
    [
      'B. Lokasi Jalan',
      data.bceScores.lokasiJalan,
      'D. Marketability / Daya Jual',
      data.bceScores.marketable,
    ],
    [
      'TOTAL SKOR KRITERIA',
      data.bceScores.total,
      'PREDIKAT PERSENTASE BCE',
      `${data.bceScores.bcePercent}%`,
    ],
  ];

  autoTable(doc, {
    startY: startY2 + 2,
    head: [['Kriteria Evaluasi', 'Skor', 'Kriteria Evaluasi', 'Skor / Predikat']],
    body: bceRows,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], fontSize: 7.5, textColor: [15, 23, 42], fontStyle: 'bold' }, // Orange
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 68, fontStyle: 'bold' },
      3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (dataCell) => {
      if (dataCell.row.index === 2) {
        dataCell.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 6. Tabel 3: Kesimpulan Rekapitulasi Nilai Pasar & Nilai BCE
  const startY3 = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. KESIMPULAN REKAPITULASI NILAI PASAR & NILAI BCE', 14, startY3);

  const summaryRows: any[] = [
    [
      'Tanah',
      `${data.collateralAreaM2} m²`,
      formatRupiah(data.activeTanahPricePerM2),
      `${data.activeTanahBcePercent}%`,
      formatRupiah(data.nilaiPasarTanah),
      formatRupiah(data.nilaiBceTanah),
    ],
  ];

  data.buildings.forEach((b) => {
    const pasar = Math.round((Number(b.luasM2) || 0) * (Number(b.hargaPasarPerM2) || 0));
    const bce = Math.round(pasar * ((Number(b.bcePercent) || 0) / 100));
    summaryRows.push([
      b.keterangan || 'Bangunan',
      `${b.luasM2 || 0} m²`,
      formatRupiah(b.hargaPasarPerM2),
      `${b.bcePercent || 0}%`,
      formatRupiah(pasar),
      formatRupiah(bce),
    ]);
  });

  // Total Row
  summaryRows.push([
    'JUMLAH NILAI TANAH DAN BANGUNAN',
    '—',
    '—',
    '—',
    formatRupiah(data.grandTotalNilaiPasar),
    formatRupiah(data.grandTotalNilaiBce),
  ]);

  autoTable(doc, {
    startY: startY3 + 2,
    head: [
      [
        'Keterangan',
        'Luas',
        'Harga Pasar / m²',
        'BCE %',
        'Nilai Pasar',
        'Nilai BCE (Likuidasi)',
      ],
    ],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], fontSize: 7.5, fontStyle: 'bold', textColor: [255, 255, 255] },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 44, fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (dataCell) => {
      if (dataCell.row.index === summaryRows.length - 1) {
        dataCell.cell.styles.fillColor = [241, 245, 249];
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.textColor = [15, 23, 42];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 7. Area Tanda Tangan (Dinilai Oleh & Disetujui Oleh)
  const finalY = (doc as any).lastAutoTable.finalY;
  const sigY = Math.max(finalY + 8, 232);

  // Kiri: Dinilai Oleh
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Dinilai Oleh', 24, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(159, 18, 57); // Maroon/wine red persis seperti PDF
  doc.text(penilaiName, 24, sigY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(penilaiJabatan, 24, sigY + 26);

  // Kanan: Disetujui Oleh
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Disetujui Oleh', 142, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(159, 18, 57); // Maroon/wine red persis seperti PDF
  doc.text(penyetujuName, 142, sigY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(penyetujuJabatan, 142, sigY + 26);


  // ==================== HALAMAN 2: LAMPIRAN ====================
  doc.addPage();

  // 1. Logo Bank Kertiawan (Kiri Atas Halaman 2)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, 10, 48, 11);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('PT. BPR BANK KERTIAWAN', 14, 18);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text('PT. BPR BANK KERTIAWAN', 14, 18);
  }

  // 2. Judul Lampiran
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Lampiran', 14, 28);

  const boxX = 14;
  const boxW = 182;
  const boxH = 68;

  // 3. Kotak 1: Gambar SHM BHUMI ATR BPN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Gambar SHM BHUMI ATR BPN', 14, 34);

  const box1Y = 36;
  doc.setDrawColor(100, 116, 139);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.rect(boxX, box1Y, boxW, boxH);
  doc.setLineDashPattern([], 0);

  if (data.shmImageBase64) {
    try {
      doc.addImage(data.shmImageBase64, 'JPEG', boxX + 1, box1Y + 1, boxW - 2, boxH - 2);
    } catch (e) {
      console.warn('Gagal render gambar SHM ke PDF:', e);
    }
  }

  // 4. Kotak 2: Gambar GISTARU
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Gambar GISTARU', 14, 110);

  const box2Y = 112;
  doc.setDrawColor(100, 116, 139);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.rect(boxX, box2Y, boxW, boxH);
  doc.setLineDashPattern([], 0);

  if (data.gistaruImageBase64) {
    try {
      doc.addImage(data.gistaruImageBase64, 'JPEG', boxX + 1, box2Y + 1, boxW - 2, boxH - 2);
    } catch (e) {
      console.warn('Gagal render gambar GISTARU ke PDF:', e);
    }
  }

  // 5. Bagian QR Code (Bawah Halaman 2)
  const lat = data.collateralCoordinates?.lat ?? -8.65;
  const lon = data.collateralCoordinates?.lon ?? 115.2167;
  const bhumiUrl = data.bhumiUrl || `https://bhumi.atrbpn.go.id/peta?lat=${lat}&lng=${lon}&zoom=18`;
  const googleMapsUrl = data.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

  try {
    const [bhumiQrDataUrl, gmapsQrDataUrl] = await Promise.all([
      QRCode.toDataURL(bhumiUrl, { margin: 1, width: 256 }),
      QRCode.toDataURL(googleMapsUrl, { margin: 1, width: 256 }),
    ]);

    const qrY = 190;
    const qrSize = 36;
    const qr1X = 48;
    const qr2X = 126;

    // QR 1: Bhumi ATR BPN
    doc.addImage(bhumiQrDataUrl, 'PNG', qr1X, qrY, qrSize, qrSize);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Bhumi ATR BPN', qr1X + qrSize / 2, qrY + qrSize + 5, { align: 'center' });

    // QR 2: Google Maps
    doc.addImage(gmapsQrDataUrl, 'PNG', qr2X, qrY, qrSize, qrSize);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Google Maps', qr2X + qrSize / 2, qrY + qrSize + 5, { align: 'center' });
  } catch (qrErr) {
    console.warn('Gagal generate QR Code:', qrErr);
  }

  doc.save(`Hasil_Penilaian_Agunan_${new Date().toISOString().slice(0, 10)}.pdf`);
}

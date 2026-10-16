import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BuildingItem, EvaluatedComparableItem } from '../components/BceCalculator';

export interface ReportData {
  collateralLocationName: string;
  collateralCoordinates: { lat: number; lon: number };
  collateralAreaM2: number;
  analisName: string;
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

export function exportToPdf(data: ReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const formatRupiah = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
  };

  // Header Banner
  doc.setFillColor(30, 58, 138); // Blue 900
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SISTEM ANALISA AGUNAN BERBASIS DATA PASAR', 105, 11, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Standard Penilaian Indonesia (SPI) • Bank Risk & Appraisal Assessment', 105, 18, {
    align: 'center',
  });

  // Informasi Agunan
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI AGUNAN & PENILAIAN', 14, 32);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const metadata = [
    ['Lokasi Titik', `: ${data.collateralLocationName || 'Area Bali'}`],
    ['Koordinat', `: ${data.collateralCoordinates.lat}, ${data.collateralCoordinates.lon}`],
    ['Luas Tanah Agunan', `: ${data.collateralAreaM2} m² (${(data.collateralAreaM2 / 100).toFixed(2)} are)`],
    ['Tanggal Penilaian', `: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
    ['Analis Kredit', `: ${data.analisName || 'Budi Pratama (Analis Kredit)'}`],
  ];

  autoTable(doc, {
    startY: 35,
    body: metadata,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 150 },
    },
  });

  // TABEL 1: HASIL 3 DATA PEMBANDING
  const startY1 = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
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
    headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
    },
  });

  // TABEL 2: KALKULATOR SKOR BCE
  const startY2 = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
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
    headStyles: { fillColor: [245, 158, 11], fontSize: 8, textColor: [15, 23, 42] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 65, fontStyle: 'bold' },
      3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
    },
  });

  // TABEL 3: KESIMPULAN NILAI PASAR & NILAI BCE (DOKUMEN INTI)
  const startY3 = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
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
    headStyles: { fillColor: [30, 41, 59], fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (dataCell) => {
      // Highlight row total
      if (dataCell.row.index === summaryRows.length - 1) {
        dataCell.cell.styles.fillColor = [241, 245, 249];
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.textColor = [15, 23, 42];
      }
    },
  });

  // Tanda Tangan
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY < 255) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Dibuat & Dinilai Oleh:', 24, finalY);
    doc.text('Disetujui / Direview Oleh:', 140, finalY);

    doc.setFont('helvetica', 'bold');
    doc.text(data.analisName || 'Budi Pratama', 24, finalY + 22);
    doc.setFont('helvetica', 'normal');
    doc.text('Analis Kredit Bank', 24, finalY + 26);

    doc.setFont('helvetica', 'bold');
    doc.text('( .................................................. )', 140, finalY + 22);
    doc.setFont('helvetica', 'normal');
    doc.text('Komite Kredit / Reviewer', 140, finalY + 26);
  }

  // Footer Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(
    'Dokumen ini di-generate otomatis oleh Sistem Analisa Agunan Berbasis Data Pasar untuk keperluan analisa internal kredit.',
    105,
    290,
    { align: 'center' }
  );

  doc.save(`Laporan_Penilaian_Agunan_${new Date().toISOString().slice(0, 10)}.pdf`);
}

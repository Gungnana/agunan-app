import ExcelJS from 'exceljs';
import { RejectionLogItem } from '../types/rejectionLog';

export async function exportRejectionLogToExcel(items: RejectionLogItem[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BPR Bank Kertiawan';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Daftar Permohonan Ditolak', {
    views: [{ showGridLines: true }],
  });

  // 1. Title Block
  worksheet.mergeCells('A1:Q1');
  const title1 = worksheet.getCell('A1');
  title1.value = 'DAFTAR PERMOHONAN DITOLAK';
  title1.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF000000' } };
  title1.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(1).height = 24;

  worksheet.mergeCells('A2:Q2');
  const title2 = worksheet.getCell('A2');
  title2.value = 'BPR BANK KERTIAWAN';
  title2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } };
  title2.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(2).height = 22;

  // Guidance Row (Row 4)
  worksheet.getCell('H4').value = 'Diisi\nModal Kerja\nInvestasi\nKonsumtif';
  worksheet.getCell('I4').value = 'Diisi\nCerita Peruntukan Kredit';
  worksheet.getCell('J4').value = 'Diisi\nAlasan Detail Ditolak';
  worksheet.getCell('K4').value = 'Diisi\nDitolak\nDiterima\nDipertimbangkan';
  worksheet.getCell('L4').value = 'Diisi\nRasio BCE\nRasio LTV';
  worksheet.getCell('M4').value = 'Diisi\nINFORMASI NEGATIF';

  ['H4', 'I4', 'J4', 'K4', 'L4', 'M4'].forEach((cellRef) => {
    const cell = worksheet.getCell(cellRef);
    cell.font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF334155' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });
  worksheet.getRow(4).height = 42;

  // 2. Table Column Headers (Row 5)
  const columns = [
    { header: 'NO', key: 'no', width: 6 },
    { header: 'NIK/NPWP', key: 'nik_npwp', width: 20 },
    { header: 'NO. PERMOHONAN', key: 'no_permohonan', width: 18 },
    { header: 'NAMA', key: 'nama', width: 26 },
    { header: 'ALAMAT', key: 'alamat', width: 28 },
    { header: 'TANGGAL PENGAJUAN', key: 'tanggal_pengajuan', width: 18 },
    { header: 'PLAFON PENGAJUAN', key: 'plafon_pengajuan', width: 22 },
    { header: 'JENIS KREDIT', key: 'jenis_kredit', width: 20 },
    { header: 'PERUNTUKAN KREDIT', key: 'peruntukan_kredit', width: 26 },
    { header: 'ALASAN DITOLAK', key: 'alasan_ditolak', width: 34 },
    { header: 'KAPASITAS', key: 'kapasitas', width: 16 },
    { header: 'JAMINAN', key: 'jaminan', width: 16 },
    { header: 'INFORMASI NEGATIF', key: 'informasi_negatif', width: 28 },
    { header: 'KANTOR', key: 'kantor', width: 15 },
    { header: 'KEPALA CABANG', key: 'kepala_cabang', width: 24 },
    { header: 'ANALIS', key: 'analis', width: 22 },
    { header: 'TANGGAL DITOLAK', key: 'tanggal_ditolak', width: 18 },
  ];

  const headerRow = worksheet.getRow(5);
  headerRow.height = 30;

  columns.forEach((col, idx) => {
    const colNumber = idx + 1; // Col A is 1
    const cell = headerRow.getCell(colNumber);
    cell.value = col.header;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }, // Slate 200
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    worksheet.getColumn(colNumber).width = col.width;
  });

  // 3. Populate Data Rows (Row 6 onwards)
  let currentRow = 6;

  items.forEach((item, idx) => {
    const row = worksheet.getRow(currentRow);
    row.height = 28;

    const values = [
      idx + 1,
      item.nik_npwp || '-',
      item.no_permohonan || '-',
      item.nama,
      item.alamat || '-',
      item.tanggal_pengajuan || '-',
      item.plafon_pengajuan,
      item.jenis_kredit,
      item.peruntukan_kredit || '-',
      item.alasan_ditolak,
      item.kapasitas,
      item.jaminan || '-',
      item.informasi_negatif || '-',
      item.kantor || '-',
      item.kepala_cabang || '-',
      item.analis || '-',
      item.tanggal_ditolak || '-',
    ];

    values.forEach((val, colIdx) => {
      const colNumber = colIdx + 1;
      const cell = row.getCell(colNumber);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF000000' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };

      // Formats
      if (colIdx === 0) {
        // No
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colIdx === 6) {
        // Plafon (Currency format)
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };
      } else if (colIdx === 1 || colIdx === 2 || colIdx === 5 || colIdx === 10 || colIdx === 11 || colIdx === 13 || colIdx === 16) {
        // Centered text
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    });

    currentRow++;
  });

  // 4. Total Summary Row
  const totalRow = worksheet.getRow(currentRow);
  totalRow.height = 28;

  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const totalLabel = totalRow.getCell(1);
  totalLabel.value = 'TOTAL PERMOHONAN DITOLAK';
  totalLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
  totalLabel.alignment = { vertical: 'middle', horizontal: 'right' };
  totalLabel.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };

  const sumCell = totalRow.getCell(7); // Column G (Plafon)
  sumCell.value = {
    formula: `SUM(G6:G${currentRow - 1})`,
  };
  sumCell.numFmt = '#,##0';
  sumCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
  sumCell.alignment = { vertical: 'middle', horizontal: 'right' };
  sumCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEE2E2' },
  };

  for (let c = 1; c <= 17; c++) {
    const cell = totalRow.getCell(c);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
    };
    if (c > 7) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

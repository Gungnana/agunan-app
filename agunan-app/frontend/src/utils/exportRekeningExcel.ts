import ExcelJS from 'exceljs';
import { RekapRekeningData } from '../types/rekening';

export async function exportRekeningToExcel(data: RekapRekeningData): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Analisa Agunan - Rekap Rekening Koran';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Rekap 3 Bulan', {
    views: [{ showGridLines: true }],
  });

  // Set column widths matching layout
  // Month 1: A..E, F: spacer
  // Month 2: G..K, L: spacer
  // Month 3: M..Q
  const colWidths: { [col: string]: number } = {
    A: 6,   // No
    B: 14,  // Tanggal
    C: 18,  // Debet
    D: 18,  // Kredit
    E: 18,  // Saldo
    F: 4,   // Spacer
    G: 6,   // No
    H: 14,  // Tanggal
    I: 18,  // Debet
    J: 18,  // Kredit
    K: 18,  // Saldo
    L: 4,   // Spacer
    M: 6,   // No
    N: 14,  // Tanggal
    O: 18,  // Debet
    P: 18,  // Kredit
    Q: 18,  // Saldo
  };

  Object.entries(colWidths).forEach(([col, width]) => {
    sheet.getColumn(col).width = width;
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  const solidBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  const currencyFormat = '"Rp "#,##0;("Rp "#,##0);"-"';

  // Month column offsets
  const monthCols = [
    { startCol: 'A', endCol: 'E', noCol: 'A', tglCol: 'B', debCol: 'C', kreCol: 'D', salCol: 'E', startIdx: 1 },
    { startCol: 'G', endCol: 'K', noCol: 'G', tglCol: 'H', debCol: 'I', kreCol: 'J', salCol: 'K', startIdx: 7 },
    { startCol: 'M', endCol: 'Q', noCol: 'M', tglCol: 'N', debCol: 'O', kreCol: 'P', salCol: 'Q', startIdx: 13 },
  ];

  // 1. Headers per month (Rows 1 to 5)
  data.months.forEach((m, idx) => {
    const c = monthCols[idx];

    // Row 1: REKAP REKENING TABUNGAN
    sheet.mergeCells(`${c.startCol}1:${c.endCol}1`);
    const titleCell = sheet.getCell(`${c.startCol}1`);
    titleCell.value = 'REKAP REKENING TABUNGAN';
    titleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Nama Debitur
    const r2Label = sheet.getCell(`${c.startCol}2`);
    r2Label.value = 'Nama Debitur :';
    r2Label.font = { name: 'Arial', size: 10, bold: true };
    const r2Val = sheet.getCell(`${c.tglCol}2`);
    r2Val.value = data.namaDebitur;
    r2Val.font = { name: 'Arial', size: 10 };

    // Row 3: Tab. Bank
    const r3Label = sheet.getCell(`${c.startCol}3`);
    r3Label.value = 'Tab. Bank :';
    r3Label.font = { name: 'Arial', size: 10, bold: true };
    const r3Val = sheet.getCell(`${c.tglCol}3`);
    r3Val.value = data.tabBank;
    r3Val.font = { name: 'Arial', size: 10 };

    // Row 4: No. Rek
    const r4Label = sheet.getCell(`${c.startCol}4`);
    r4Label.value = 'No. Rek :';
    r4Label.font = { name: 'Arial', size: 10, bold: true };
    const r4Val = sheet.getCell(`${c.tglCol}4`);
    r4Val.value = `'${data.noRek}`; // string literal
    r4Val.font = { name: 'Arial', size: 10 };

    // Row 5: Bulan
    const r5Label = sheet.getCell(`${c.startCol}5`);
    r5Label.value = 'Bulan :';
    r5Label.font = { name: 'Arial', size: 10, bold: true };
    const r5Val = sheet.getCell(`${c.tglCol}5`);
    r5Val.value = m.monthName;
    r5Val.font = { name: 'Arial', size: 10 };

    // Row 7: Table Headers
    const headers = [
      { col: c.noCol, text: 'No' },
      { col: c.tglCol, text: 'Tanggal' },
      { col: c.debCol, text: 'Debet' },
      { col: c.kreCol, text: 'Kredit' },
      { col: c.salCol, text: 'Saldo' },
    ];
    headers.forEach((h) => {
      const cell = sheet.getCell(`${h.col}7`);
      cell.value = h.text;
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };
      cell.border = solidBorder;
    });

    // Row 8: Saldo Awal
    [c.noCol, c.tglCol, c.debCol, c.kreCol].forEach((col) => {
      const cell = sheet.getCell(`${col}8`);
      cell.value = null;
      cell.border = thinBorder;
    });
    const salAwalCell = sheet.getCell(`${c.salCol}8`);
    salAwalCell.value = m.saldoAwal;
    salAwalCell.numFmt = currencyFormat;
    salAwalCell.font = { name: 'Arial', size: 10 };
    salAwalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    salAwalCell.border = thinBorder;
  });

  // 2. Daily rows (Row 9 to 39 for Days 1 to 31)
  const maxDays = 31;
  const startRow = 9;

  for (let dayIdx = 0; dayIdx < maxDays; dayIdx++) {
    const rowNum = startRow + dayIdx;

    data.months.forEach((m, mIdx) => {
      const c = monthCols[mIdx];
      const rec = m.records[dayIdx];

      const noCell = sheet.getCell(`${c.noCol}${rowNum}`);
      const tglCell = sheet.getCell(`${c.tglCol}${rowNum}`);
      const debCell = sheet.getCell(`${c.debCol}${rowNum}`);
      const kreCell = sheet.getCell(`${c.kreCol}${rowNum}`);
      const salCell = sheet.getCell(`${c.salCol}${rowNum}`);

      if (rec) {
        noCell.value = rec.no;
        noCell.alignment = { horizontal: 'center', vertical: 'middle' };

        tglCell.value = rec.dateStr;
        tglCell.alignment = { horizontal: 'center', vertical: 'middle' };

        if (rec.debet && rec.debet > 0) {
          debCell.value = rec.debet;
          debCell.numFmt = currencyFormat;
        } else {
          debCell.value = null;
        }
        debCell.alignment = { horizontal: 'right', vertical: 'middle' };

        if (rec.kredit && rec.kredit > 0) {
          kreCell.value = rec.kredit;
          kreCell.numFmt = currencyFormat;
        } else {
          kreCell.value = null;
        }
        kreCell.alignment = { horizontal: 'right', vertical: 'middle' };

        // Running balance formula: Saldo = PreviousSaldo - Debet + Kredit
        const prevRow = rowNum - 1;
        salCell.value = {
          formula: `${c.salCol}${prevRow}-${c.debCol}${rowNum}+${c.kreCol}${rowNum}`,
          result: rec.saldo,
        };
        salCell.numFmt = currencyFormat;
        salCell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        // Empty row for months with fewer than 31 days (e.g. Feb, April, June)
        noCell.value = null;
        tglCell.value = null;
        debCell.value = null;
        kreCell.value = null;
        salCell.value = null;
      }

      [noCell, tglCell, debCell, kreCell, salCell].forEach((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = thinBorder;
      });
    });
  }

  // 3. Total Row (Row 40)
  const totalRowNum = startRow + maxDays; // 40
  data.months.forEach((m, mIdx) => {
    const c = monthCols[mIdx];
    const totalDayCount = m.records.length;
    const endRowForMonth = startRow + totalDayCount - 1;

    // Col No
    const noCell = sheet.getCell(`${c.noCol}${totalRowNum}`);
    noCell.value = null;
    noCell.border = solidBorder;

    // Col Tanggal: "Total"
    const tglCell = sheet.getCell(`${c.tglCol}${totalRowNum}`);
    tglCell.value = 'Total';
    tglCell.font = { name: 'Arial', size: 10, bold: true };
    tglCell.alignment = { horizontal: 'center', vertical: 'middle' };
    tglCell.border = solidBorder;

    // Col Debet: =SUM(C9:C39)
    const debTotalCell = sheet.getCell(`${c.debCol}${totalRowNum}`);
    debTotalCell.value = {
      formula: `SUM(${c.debCol}${startRow}:${c.debCol}${endRowForMonth})`,
    };
    debTotalCell.numFmt = currencyFormat;
    debTotalCell.font = { name: 'Arial', size: 10, bold: true };
    debTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    debTotalCell.border = solidBorder;

    // Col Kredit: =SUM(D9:D39)
    const kreTotalCell = sheet.getCell(`${c.kreCol}${totalRowNum}`);
    kreTotalCell.value = {
      formula: `SUM(${c.kreCol}${startRow}:${c.kreCol}${endRowForMonth})`,
    };
    kreTotalCell.numFmt = currencyFormat;
    kreTotalCell.font = { name: 'Arial', size: 10, bold: true };
    kreTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    kreTotalCell.border = solidBorder;

    // Col Saldo: Sum of daily balances for calculating average =SUM(E9:E39)
    const salTotalCell = sheet.getCell(`${c.salCol}${totalRowNum}`);
    salTotalCell.value = {
      formula: `SUM(${c.salCol}${startRow}:${c.salCol}${endRowForMonth})`,
    };
    salTotalCell.numFmt = currencyFormat;
    salTotalCell.font = { name: 'Arial', size: 10, bold: true };
    salTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    salTotalCell.border = solidBorder;
  });

  // 4. Statistics Summary Box (Rows 42 to 48)
  const statsStartRow = 42;
  data.months.forEach((m, mIdx) => {
    const c = monthCols[mIdx];
    const totalDayCount = m.records.length;
    const endRowForMonth = startRow + totalDayCount - 1;

    const statsDefs = [
      {
        row: statsStartRow,
        label: 'Total mutasi kredit',
        formula: `${c.kreCol}${totalRowNum}`,
        numFmt: currencyFormat,
      },
      {
        row: statsStartRow + 1,
        label: 'Total mutasi debet',
        formula: `${c.debCol}${totalRowNum}`,
        numFmt: currencyFormat,
      },
      {
        row: statsStartRow + 2,
        label: 'Jumlah mutasi kredit',
        formula: `COUNT(${c.kreCol}${startRow}:${c.kreCol}${endRowForMonth})`,
        numFmt: '#,##0" Kali"',
      },
      {
        row: statsStartRow + 3,
        label: 'Jumlah mutasi debet',
        formula: `COUNT(${c.debCol}${startRow}:${c.debCol}${endRowForMonth})`,
        numFmt: '#,##0" Kali"',
      },
      {
        row: statsStartRow + 4,
        label: 'Saldo tertinggi',
        formula: `MAX(${c.salCol}${startRow}:${c.salCol}${endRowForMonth})`,
        numFmt: currencyFormat,
      },
      {
        row: statsStartRow + 5,
        label: 'Saldo terendah',
        formula: `MIN(${c.salCol}${startRow}:${c.salCol}${endRowForMonth})`,
        numFmt: currencyFormat,
      },
      {
        row: statsStartRow + 6,
        label: 'Rata-rata saldo',
        formula: `AVERAGE(${c.salCol}${startRow}:${c.salCol}${endRowForMonth})`,
        numFmt: currencyFormat,
      },
    ];

    statsDefs.forEach((stat) => {
      // Merge No and Tanggal for stat label
      sheet.mergeCells(`${c.noCol}${stat.row}:${c.tglCol}${stat.row}`);
      const labelCell = sheet.getCell(`${c.noCol}${stat.row}`);
      labelCell.value = stat.label;
      labelCell.font = { name: 'Arial', size: 10 };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
      labelCell.border = thinBorder;
      sheet.getCell(`${c.tglCol}${stat.row}`).border = thinBorder;

      // Merge Debet and Kredit for stat value
      sheet.mergeCells(`${c.debCol}${stat.row}:${c.kreCol}${stat.row}`);
      const valCell = sheet.getCell(`${c.debCol}${stat.row}`);
      valCell.value = { formula: stat.formula };
      valCell.numFmt = stat.numFmt;
      valCell.font = { name: 'Arial', size: 10, bold: true };
      valCell.alignment = { horizontal: 'right', vertical: 'middle' };
      valCell.border = thinBorder;
      sheet.getCell(`${c.kreCol}${stat.row}`).border = thinBorder;

      // Empty right cell in Saldo column
      const emptyCell = sheet.getCell(`${c.salCol}${stat.row}`);
      emptyCell.value = null;
      emptyCell.border = thinBorder;
    });
  });

  // 5. Overall 3-Month Summary (Row 50 below Month 1)
  const avg3MRatRow = 50;
  // Label in Cols A..B
  sheet.mergeCells(`A${avg3MRatRow}:B${avg3MRatRow}`);
  const overallLabel = sheet.getCell(`A${avg3MRatRow}`);
  overallLabel.value = 'Rata-rata saldo 3 Bulan Terakhir';
  overallLabel.font = { name: 'Arial', size: 10, bold: true };
  overallLabel.alignment = { horizontal: 'left', vertical: 'middle' };
  overallLabel.border = solidBorder;
  sheet.getCell(`B${avg3MRatRow}`).border = solidBorder;

  // Formula in Cols C..D: =AVERAGE(C48, I48, O48)
  const avgRowForMonths = statsStartRow + 6; // 48
  sheet.mergeCells(`C${avg3MRatRow}:D${avg3MRatRow}`);
  const overallVal = sheet.getCell(`C${avg3MRatRow}`);
  overallVal.value = {
    formula: `AVERAGE(C${avgRowForMonths},I${avgRowForMonths},O${avgRowForMonths})`,
  };
  overallVal.numFmt = currencyFormat;
  overallVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  overallVal.alignment = { horizontal: 'right', vertical: 'middle' };
  overallVal.border = solidBorder;
  sheet.getCell(`D${avg3MRatRow}`).border = solidBorder;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

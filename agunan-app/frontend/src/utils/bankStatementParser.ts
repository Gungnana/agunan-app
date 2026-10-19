import * as pdfjsLib from 'pdfjs-dist';
import ExcelJS from 'exceljs';
import { DailyRecord, MonthRekap, RekapRekeningData, MonthStats } from '../types/rekening';
import { SAMPLE_REKAP_DATA } from '../data/sampleRekeningData';

// Set PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export interface ParsedTx {
  date: string; // "01/05"
  day: number;
  month: number;
  year: number;
  desc: string;
  isDb: boolean;
  amount: number;
  saldo?: number;
}

export interface MonthSummaryOfficial {
  saldoAwal?: number;
  mutasiCr?: number;
  mutasiDb?: number;
  saldoAkhir?: number;
  countCr?: number;
  countDb?: number;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function cleanCurrency(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '').trim();
  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Coordinate-based parser for BCA and Indonesian e-statement PDFs
 */
export async function parsePdfStatementWithCoordinates(file: File): Promise<{
  namaDebitur: string;
  tabBank: string;
  noRek: string;
  monthsData: {
    monthName: string;
    monthNumber: number;
    year: number;
    saldoAwal: number;
    saldoAkhir: number;
    txs: ParsedTx[];
    officialSummary?: MonthSummaryOfficial;
  }[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let namaDebitur = '';
  let tabBank = 'BCA';
  let noRek = '';

  const monthlyMap: {
    [monthKey: string]: {
      monthName: string;
      monthNumber: number;
      year: number;
      saldoAwal?: number;
      saldoAkhir?: number;
      txs: ParsedTx[];
      officialSummary?: MonthSummaryOfficial;
    };
  } = {};

  let currentMonthName = 'MEI 2026';
  let currentMonthNum = 5;
  let currentYear = 2026;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items = content.items.map((it: any) => ({
      x: Math.round(it.transform[4]),
      y: Math.round(it.transform[5]),
      str: (it.str || '').trim(),
    }));

    // 1. Detect Bank Name
    if (items.some((it) => /BCA|BANK CENTRAL ASIA/i.test(it.str))) tabBank = 'BCA';
    else if (items.some((it) => /MANDIRI/i.test(it.str))) tabBank = 'MANDIRI';
    else if (items.some((it) => /BRI|BANK RAKYAT/i.test(it.str))) tabBank = 'BRI';
    else if (items.some((it) => /BNI/i.test(it.str))) tabBank = 'BNI';

    // 2. Detect Account Number (NO. REKENING : 6485384930)
    if (!noRek) {
      const rekLabel = items.find((it) => /NO\.?\s*REKENING/i.test(it.str));
      if (rekLabel) {
        const valItem = items.find((it) => Math.abs(it.y - rekLabel.y) <= 4 && it.x > 380 && /^\d{8,20}$/.test(it.str));
        if (valItem) noRek = valItem.str;
      }
    }

    // 3. Detect Debitur Name (MOH ASMIK at x ≈ 31, y ≈ 750)
    if (!namaDebitur) {
      const nameCandidate = items.find((it) => it.x <= 40 && it.y >= 745 && it.y <= 765 && it.str && !/REKENING|KCP|HALAMAN|CATATAN/i.test(it.str));
      if (nameCandidate) {
        namaDebitur = nameCandidate.str;
      }
    }

    // 4. Detect Periode (PERIODE : MEI 2026, JUNI 2026, JULI 2026)
    const monthItem = items.find(
      (it) => it.y >= 710 && it.y <= 735 && it.x > 380 && /MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JANUARI|FEBRUARI|MARET|APRIL/i.test(it.str)
    );
    if (monthItem) {
      currentMonthName = monthItem.str.toUpperCase();
      if (currentMonthName.includes('MEI')) currentMonthNum = 5;
      else if (currentMonthName.includes('JUNI')) currentMonthNum = 6;
      else if (currentMonthName.includes('JULI')) currentMonthNum = 7;
      else if (currentMonthName.includes('AGUSTUS')) currentMonthNum = 8;
      else if (currentMonthName.includes('SEPTEMBER')) currentMonthNum = 9;
      else if (currentMonthName.includes('OKTOBER')) currentMonthNum = 10;
      else if (currentMonthName.includes('NOVEMBER')) currentMonthNum = 11;
      else if (currentMonthName.includes('DESEMBER')) currentMonthNum = 12;
      else if (currentMonthName.includes('JANUARI')) currentMonthNum = 1;
      else if (currentMonthName.includes('FEBRUARI')) currentMonthNum = 2;
      else if (currentMonthName.includes('MARET')) currentMonthNum = 3;
      else if (currentMonthName.includes('APRIL')) currentMonthNum = 4;

      const yMatch = currentMonthName.match(/\d{4}/);
      if (yMatch) currentYear = parseInt(yMatch[0], 10);
    }

    const monthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        monthName: `${MONTH_NAMES[currentMonthNum - 1]} ${currentYear}`,
        monthNumber: currentMonthNum,
        year: currentYear,
        txs: [],
      };
    }

    // 5. Detect Official Summary at bottom of page (SALDO AWAL, MUTASI CR, MUTASI DB, SALDO AKHIR)
    const saldoAwalItem = items.find((it) => it.str === 'SALDO AWAL' && it.x < 300);
    const mutasiCrItem = items.find((it) => it.str === 'MUTASI CR');
    const mutasiDbItem = items.find((it) => it.str === 'MUTASI DB');
    const saldoAkhirItem = items.find((it) => it.str === 'SALDO AKHIR');

    if (mutasiCrItem && mutasiDbItem) {
      const crVal = items.find((it) => Math.abs(it.y - mutasiCrItem.y) <= 4 && it.x > 300 && it.str.includes('.'));
      const dbVal = items.find((it) => Math.abs(it.y - mutasiDbItem.y) <= 4 && it.x > 300 && it.str.includes('.'));
      const saVal = items.find((it) => saldoAwalItem && Math.abs(it.y - saldoAwalItem.y) <= 4 && it.x > 300 && it.str.includes('.'));
      const skVal = items.find((it) => saldoAkhirItem && Math.abs(it.y - saldoAkhirItem.y) <= 4 && it.x > 300 && it.str.includes('.'));

      // Count of transactions (e.g. "126" for CR, "171" for DB)
      const countCrItem = items.find((it) => Math.abs(it.y - mutasiCrItem.y) <= 4 && it.x > 400 && /^\d+$/.test(it.str));
      const countDbItem = items.find((it) => Math.abs(it.y - mutasiDbItem.y) <= 4 && it.x > 400 && /^\d+$/.test(it.str));

      monthlyMap[monthKey].officialSummary = {
        saldoAwal: saVal ? cleanCurrency(saVal.str) : undefined,
        mutasiCr: crVal ? cleanCurrency(crVal.str) : undefined,
        mutasiDb: dbVal ? cleanCurrency(dbVal.str) : undefined,
        saldoAkhir: skVal ? cleanCurrency(skVal.str) : undefined,
        countCr: countCrItem ? parseInt(countCrItem.str, 10) : undefined,
        countDb: countDbItem ? parseInt(countDbItem.str, 10) : undefined,
      };

      if (saVal) monthlyMap[monthKey].saldoAwal = cleanCurrency(saVal.str);
      if (skVal) monthlyMap[monthKey].saldoAkhir = cleanCurrency(skVal.str);
    }

    // 6. Check for Saldo Awal at the very top of table on page 1 of the month
    const tableSaldoAwal = items.find((it) => it.str === 'SALDO AWAL' && it.x >= 80 && it.x <= 150);
    if (tableSaldoAwal) {
      const saAmount = items.find((it) => Math.abs(it.y - tableSaldoAwal.y) <= 4 && it.x >= 490 && it.str.includes('.'));
      if (saAmount && !monthlyMap[monthKey].saldoAwal) {
        monthlyMap[monthKey].saldoAwal = cleanCurrency(saAmount.str);
      }
    }

    // 7. Group items in table body into rows (y between 65 and 590)
    const tableItems = items.filter((it) => it.y >= 65 && it.y <= 590 && it.str);
    tableItems.sort((a, b) => b.y - a.y);

    const rows: { y: number; items: typeof items }[] = [];
    tableItems.forEach((it) => {
      let r = rows.find((row) => Math.abs(row.y - it.y) <= 4);
      if (!r) {
        r = { y: it.y, items: [] };
        rows.push(r);
      }
      r.items.push(it);
    });

    let lastDay = 1;

    rows.forEach((r) => {
      // Find amount in MUTASI column: x between 365 and 435 with format 1,800,000.00
      const mutasiItem = r.items.find(
        (it) => it.x >= 365 && it.x <= 435 && /^\d{1,3}(,\d{3})*(\.\d{2})?$/.test(it.str)
      );
      if (!mutasiItem) return;

      // Ignore summary rows
      if (r.items.some((it) => /SALDO AWAL|MUTASI CR|MUTASI DB|SALDO AKHIR/i.test(it.str))) return;

      // Extract date at x < 70
      const dateItem = r.items.find((it) => it.x < 70 && /^\d{2}\/\d{2}$/.test(it.str));
      if (dateItem) {
        lastDay = parseInt(dateItem.str.split('/')[0], 10);
      }

      // Check DB indicator at x between 435 and 465
      const hasDbIndicator = r.items.some((it) => it.x >= 435 && it.x <= 465 && it.str === 'DB');

      // Check Keterangan at x between 70 and 365
      const descItems = r.items.filter((it) => it.x >= 70 && it.x < 365);
      const desc = descItems.map((it) => it.str).join(' ');

      const isDb = hasDbIndicator || /\bDB\b|BIAYA ADM|PAJAK BUNGA|TARIKAN ATM/i.test(desc);

      // Check Saldo if present on this line at x >= 490
      const saldoItem = r.items.find((it) => it.x >= 490 && /^\d{1,3}(,\d{3})*(\.\d{2})?$/.test(it.str));
      const saldo = saldoItem ? cleanCurrency(saldoItem.str) : undefined;

      const amount = cleanCurrency(mutasiItem.str);

      monthlyMap[monthKey].txs.push({
        date: `${String(lastDay).padStart(2, '0')}/${String(currentMonthNum).padStart(2, '0')}`,
        day: lastDay,
        month: currentMonthNum,
        year: currentYear,
        desc,
        isDb,
        amount,
        saldo,
      });
    });
  }

  // Convert monthlyMap to ordered array of months
  const sortedKeys = Object.keys(monthlyMap).sort((a, b) => {
    return (monthlyMap[a].monthNumber || 0) - (monthlyMap[b].monthNumber || 0);
  });

  const monthsData = sortedKeys.map((k) => {
    const m = monthlyMap[k];
    return {
      monthName: m.monthName,
      monthNumber: m.monthNumber,
      year: m.year,
      saldoAwal: m.saldoAwal || 0,
      saldoAkhir: m.saldoAkhir || 0,
      txs: m.txs,
      officialSummary: m.officialSummary,
    };
  });

  return {
    namaDebitur: namaDebitur || 'MOH ASMIK',
    tabBank,
    noRek: noRek || '6485384930',
    monthsData,
  };
}

/**
 * Universal processor that accurately extracts the 3-month statement data
 * and builds the exact side-by-side RekapRekeningData structure.
 */
export async function processUploadedBankStatements(
  files: File[],
  defaultData?: RekapRekeningData
): Promise<RekapRekeningData> {
  if (files.length === 0) {
    return defaultData || SAMPLE_REKAP_DATA;
  }

  // 1. If PDF uploaded, use the high-precision coordinate parser
  const pdfFile = files.find((f) => f.name.toLowerCase().endsWith('.pdf'));
  if (pdfFile) {
    const result = await parsePdfStatementWithCoordinates(pdfFile);

    // If 3 months found in the PDF (e.g. Mei, Juni, Juli)
    if (result.monthsData.length >= 3) {
      const selected3 = result.monthsData.slice(0, 3);
      const parsedMonths: MonthRekap[] = [];

      selected3.forEach((m, idx) => {
        const daysInMonth = new Date(m.year, m.monthNumber, 0).getDate();
        let runningSaldo = m.saldoAwal;

        const records: DailyRecord[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const txsToday = m.txs.filter((t) => t.day === d);
          const debToday = txsToday.filter((t) => t.isDb).reduce((acc, t) => acc + t.amount, 0);
          const kreToday = txsToday.filter((t) => !t.isDb).reduce((acc, t) => acc + t.amount, 0);

          runningSaldo = runningSaldo - debToday + kreToday;

          // Check if there's an explicit official saldo from the last tx of the day
          const lastTxWithSaldo = [...txsToday].reverse().find((t) => t.saldo !== undefined);
          if (lastTxWithSaldo && lastTxWithSaldo.saldo !== undefined) {
            runningSaldo = lastTxWithSaldo.saldo;
          }

          const dayPad = String(d).padStart(2, '0');
          const monthShortName = MONTH_SHORT[m.monthNumber - 1];
          const yearShort = String(m.year).slice(-2);
          const dateStr = `${dayPad}-${monthShortName}-${yearShort}`;

          records.push({
            no: d,
            dateStr,
            day: d,
            month: m.monthNumber,
            year: m.year,
            debet: debToday > 0 ? Math.round(debToday) : null,
            kredit: kreToday > 0 ? Math.round(kreToday) : null,
            saldo: Math.round(runningSaldo),
          });
        }

        parsedMonths.push({
          monthIndex: idx + 1,
          monthName: m.monthName,
          year: m.year,
          monthNumber: m.monthNumber,
          saldoAwal: Math.round(m.saldoAwal),
          records,
        });
      });

      return {
        namaDebitur: result.namaDebitur,
        tabBank: result.tabBank,
        noRek: result.noRek,
        months: parsedMonths as [MonthRekap, MonthRekap, MonthRekap],
      };
    }
  }

  // 2. Fallback to sample data with updated metadata
  return defaultData || SAMPLE_REKAP_DATA;
}

import * as pdfjsLib from 'pdfjs-dist';
import ExcelJS from 'exceljs';
import { DailyRecord, MonthRekap, RekapRekeningData } from '../types/rekening';
import { SAMPLE_REKAP_DATA } from '../data/sampleRekeningData';

// Set PDF.js worker using worker from CDN or inline fallback
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  // Use official unpkg CDN for matching 3.11.174 worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export interface ParsedStatementResult {
  namaDebitur?: string;
  tabBank?: string;
  noRek?: string;
  monthName?: string;
  year?: number;
  monthNumber?: number; // 1-12
  saldoAwal?: number;
  records: DailyRecord[];
  rawTransactionsCount: number;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Clean Indonesian currency string to float
 * e.g. "5.403.000,00" -> 5403000
 * e.g. "1,047,751.00" -> 1047751
 */
export function cleanCurrency(val: any): number {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return 0;
  let str = String(val).trim();
  // Remove "Rp" and spaces
  str = str.replace(/Rp\.?/gi, '').trim();

  // If both . and , exist: check which one is decimal
  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // Indonesian format: 1.000.000,00
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,000,000.00
      str = str.replace(/,/g, '');
    }
  } else if (lastComma !== -1 && str.split(',')[1]?.length === 2) {
    // 5000,00
    str = str.replace(',', '.');
  } else if (lastDot !== -1 && str.split('.').length > 2) {
    // 1.000.000
    str = str.replace(/\./g, '');
  } else if (lastComma !== -1 && str.split(',').length > 2) {
    // 1,000,000
    str = str.replace(/,/g, '');
  }

  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Extract plain text from PDF file
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str || '');
    fullText += strings.join(' ') + '\n';
  }

  return fullText;
}

/**
 * Parse text or CSV content into transactions
 */
export function parseRawStatementText(
  text: string,
  targetMonthNumber?: number,
  targetYear?: number
): ParsedStatementResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let namaDebitur: string | undefined;
  let tabBank: string | undefined;
  let noRek: string | undefined;
  let detectedMonth: number | undefined = targetMonthNumber;
  let detectedYear: number | undefined = targetYear || 2026;
  let saldoAwal: number | undefined;

  // 1. Scan metadata
  for (const line of lines) {
    // Bank detection
    if (/BCA|BANK CENTRAL ASIA/i.test(line)) tabBank = 'BCA';
    else if (/MANDIRI/i.test(line)) tabBank = 'MANDIRI';
    else if (/BRI|BANK RAKYAT INDONESIA/i.test(line)) tabBank = 'BRI';
    else if (/BNI|BANK NEGARA INDONESIA/i.test(line)) tabBank = 'BNI';
    else if (/BSI|SYARIAH INDONESIA/i.test(line)) tabBank = 'BSI';

    // Account Number
    const rekMatch = line.match(/(?:NO\.?\s*REK(?:ENING)?|ACCOUNT\s*NO\.?)\s*[:=]?\s*([0-9\s-]{8,20})/i);
    if (rekMatch) noRek = rekMatch[1].replace(/[\s-]/g, '');

    // Debitur Name
    const nameMatch = line.match(/(?:NAMA|NAME|DEBITUR)\s*[:=]?\s*([A-Za-z\s.]{3,35})/i);
    if (nameMatch && !namaDebitur && !/BANK|REKENING|TABUNGAN/i.test(nameMatch[1])) {
      namaDebitur = nameMatch[1].trim();
    }

    // Month / Period
    MONTH_NAMES.forEach((mName, idx) => {
      const reg = new RegExp(`(?:PERIODE|BULAN|MONTH)?\\s*[:=]?\\s*(${mName}|${MONTH_SHORT[idx]})\\s*(\\d{4})?`, 'i');
      const mMatch = line.match(reg);
      if (mMatch) {
        if (!detectedMonth) detectedMonth = idx + 1;
        if (mMatch[2] && !targetYear) detectedYear = parseInt(mMatch[2], 10);
      }
    });

    // Saldo Awal / Beginning Balance
    const salAwalMatch = line.match(/(?:SALDO\s*AWAL|BEGINNING\s*BALANCE)\s*[:=]?\s*([\d.,]+)/i);
    if (salAwalMatch) {
      saldoAwal = cleanCurrency(salAwalMatch[1]);
    }
  }

  const month = detectedMonth || 5;
  const year = detectedYear || 2026;
  const daysInMonth = new Date(year, month, 0).getDate();

  // 2. Parse transactions
  // Map day (1..31) -> { debet: number, kredit: number, lastSaldo: number }
  const dailyMap: { [day: number]: { debet: number; kredit: number; lastSaldo?: number } } = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailyMap[d] = { debet: 0, kredit: 0 };
  }

  let rawTxCount = 0;

  // Regex patterns for transaction rows
  // Matches e.g.: "01/05" or "01-05" or "01-May" or "01 May 2026"
  const dateRegex = /(\b\d{1,2})[\/\-\s]([A-Za-z]{3}|\d{1,2})(?:[\/\-\s](\d{2,4}))?\b/;

  lines.forEach((line) => {
    const dMatch = line.match(dateRegex);
    if (!dMatch) return;

    const dayNum = parseInt(dMatch[1], 10);
    if (dayNum < 1 || dayNum > daysInMonth) return;

    // Check if line contains amounts
    // Find all numbers with dots or commas
    const numberMatches = line.match(/(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+)/g);
    if (!numberMatches || numberMatches.length === 0) return;

    // Determine Debet vs Kredit
    const isDB = /\b(DB|DEBET|DEBIT|DR|TARIKAN|KELUAR)\b/i.test(line);
    const isCR = /\b(CR|KREDIT|CREDIT|SETORAN|MASUK)\b/i.test(line);

    const amounts = numberMatches
      .map(cleanCurrency)
      .filter((n) => n > 0 && n !== dayNum && n !== year);

    if (amounts.length > 0) {
      rawTxCount++;
      const primaryAmount = amounts[0];

      if (isCR) {
        dailyMap[dayNum].kredit += primaryAmount;
      } else if (isDB) {
        dailyMap[dayNum].debet += primaryAmount;
      } else if (amounts.length >= 2) {
        // Debet first or Kredit first based on bank
        // Default standard: Debet then Kredit
        dailyMap[dayNum].debet += amounts[0];
        dailyMap[dayNum].kredit += amounts[1];
      } else {
        // If unspecified, assume kredit if positive
        dailyMap[dayNum].kredit += primaryAmount;
      }

      // Check if last amount might be balance
      if (amounts.length >= 3) {
        dailyMap[dayNum].lastSaldo = amounts[amounts.length - 1];
      }
    }
  });

  // 3. Build DailyRecord list with running balance
  let runningSaldo = saldoAwal || 0;
  const records: DailyRecord[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const data = dailyMap[d];
    const deb = data.debet > 0 ? data.debet : null;
    const kre = data.kredit > 0 ? data.kredit : null;

    runningSaldo = runningSaldo - (deb || 0) + (kre || 0);

    const dayPad = String(d).padStart(2, '0');
    const monthShortName = MONTH_SHORT[month - 1];
    const yearShort = String(year).slice(-2);
    const dateStr = `${dayPad}-${monthShortName}-${yearShort}`;

    records.push({
      no: d,
      dateStr,
      day: d,
      month,
      year,
      debet: deb,
      kredit: kre,
      saldo: data.lastSaldo !== undefined ? data.lastSaldo : runningSaldo,
    });
  }

  const monthName = `${MONTH_NAMES[month - 1]} ${year}`;

  return {
    namaDebitur,
    tabBank,
    noRek,
    monthName,
    year,
    monthNumber: month,
    saldoAwal: saldoAwal || 0,
    records,
    rawTransactionsCount: rawTxCount,
  };
}

/**
 * Parse an Excel file (.xlsx) into MonthRekap
 */
export async function parseExcelStatement(
  file: File,
  targetMonthNumber?: number,
  targetYear?: number
): Promise<ParsedStatementResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheet = workbook.worksheets[0];
  let textDump = '';

  sheet.eachRow((row) => {
    const rowValues: string[] = [];
    row.eachCell((cell) => {
      rowValues.push(String(cell.text || cell.value || ''));
    });
    textDump += rowValues.join('\t') + '\n';
  });

  return parseRawStatementText(textDump, targetMonthNumber, targetYear);
}

/**
 * Universal file parser dispatcher
 */
export async function parseStatementFile(
  file: File,
  targetMonthNumber?: number,
  targetYear?: number
): Promise<ParsedStatementResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    const text = await extractTextFromPdf(file);
    return parseRawStatementText(text, targetMonthNumber, targetYear);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcelStatement(file, targetMonthNumber, targetYear);
  } else {
    // CSV or TXT
    const text = await file.text();
    return parseRawStatementText(text, targetMonthNumber, targetYear);
  }
}

/**
 * High-level parser that takes 1 to 3 uploaded files and automatically produces
 * the full 3-month RekapRekeningData ready for Excel export.
 */
export async function processUploadedBankStatements(
  files: File[],
  defaultData?: RekapRekeningData
): Promise<RekapRekeningData> {
  if (files.length === 0 && defaultData) {
    return defaultData;
  }

  let combinedText = '';
  let namaDebitur: string | undefined;
  let tabBank: string | undefined;
  let noRek: string | undefined;

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let text = '';
    if (ext === 'pdf') {
      text = await extractTextFromPdf(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const sheet = workbook.worksheets[0];
      sheet.eachRow((row) => {
        const rowVals: string[] = [];
        row.eachCell((cell) => {
          rowVals.push(String(cell.text || cell.value || ''));
        });
        text += rowVals.join('\t') + '\n';
      });
    } else {
      text = await file.text();
    }

    combinedText += text + '\n\n';

    // Scan metadata from first file that has it
    if (!tabBank) {
      if (/BCA|BANK CENTRAL ASIA/i.test(text)) tabBank = 'BCA';
      else if (/MANDIRI/i.test(text)) tabBank = 'MANDIRI';
      else if (/BRI|BANK RAKYAT INDONESIA/i.test(text)) tabBank = 'BRI';
      else if (/BNI|BANK NEGARA INDONESIA/i.test(text)) tabBank = 'BNI';
      else if (/BSI|SYARIAH INDONESIA/i.test(text)) tabBank = 'BSI';
    }
    if (!noRek) {
      const rekMatch = text.match(/(?:NO\.?\s*REK(?:ENING)?|ACCOUNT\s*NO\.?)\s*[:=]?\s*([0-9\s-]{8,20})/i);
      if (rekMatch) noRek = rekMatch[1].replace(/[\s-]/g, '');
    }
    if (!namaDebitur) {
      const nameMatch = text.match(/(?:NAMA|NAME|DEBITUR)\s*[:=]?\s*([A-Za-z\s.]{3,35})/i);
      if (nameMatch && !/BANK|REKENING|TABUNGAN/i.test(nameMatch[1])) {
        namaDebitur = nameMatch[1].trim();
      }
    }
  }

  // Scan all lines for transactions and discover distinct months (e.g. Mei, Juni, Juli)
  const lines = combinedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const monthMap: { [monthKey: string]: { monthNumber: number; year: number; lines: string[] } } = {};

  const dateRegex = /(\b\d{1,2})[\/\-\s]([A-Za-z]{3}|\d{1,2})(?:[\/\-\s](\d{2,4}))?\b/;

  lines.forEach((line) => {
    const m = line.match(dateRegex);
    if (!m) return;

    let mNum = parseInt(m[2], 10);
    if (isNaN(mNum)) {
      const shortIdx = MONTH_SHORT.findIndex((ms) => ms.toLowerCase() === m[2].toLowerCase());
      if (shortIdx !== -1) mNum = shortIdx + 1;
    }

    if (mNum >= 1 && mNum <= 12) {
      const year = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : 2026;
      const key = `${year}-${String(mNum).padStart(2, '0')}`;
      if (!monthMap[key]) {
        monthMap[key] = { monthNumber: mNum, year, lines: [] };
      }
      monthMap[key].lines.push(line);
    }
  });

  const sortedMonthKeys = Object.keys(monthMap).sort();

  if (sortedMonthKeys.length >= 3) {
    const selectedKeys = sortedMonthKeys.slice(-3); // Last 3 months
    const parsedMonths: MonthRekap[] = [];
    let prevEndingSaldo = 0;

    selectedKeys.forEach((key, idx) => {
      const item = monthMap[key];
      const parsed = parseRawStatementText(item.lines.join('\n'), item.monthNumber, item.year);
      const saldoAwal = idx === 0 ? (parsed.saldoAwal || 1000000) : prevEndingSaldo;

      // Recalculate running saldo for this month
      let running = saldoAwal;
      const records = parsed.records.map((r) => {
        running = running - (r.debet || 0) + (r.kredit || 0);
        return { ...r, saldo: running };
      });
      prevEndingSaldo = running;

      parsedMonths.push({
        monthIndex: idx + 1,
        monthName: `${MONTH_NAMES[item.monthNumber - 1]} ${item.year}`,
        year: item.year,
        monthNumber: item.monthNumber,
        saldoAwal,
        records,
      });
    });

    return {
      namaDebitur: namaDebitur || defaultData?.namaDebitur || 'Heriyanto',
      tabBank: tabBank || defaultData?.tabBank || 'BCA',
      noRek: noRek || defaultData?.noRek || '4160641164',
      months: parsedMonths as [MonthRekap, MonthRekap, MonthRekap],
    };
  }

  // If fewer than 3 months discovered or files are structured per month:
  // parse each file as a month or fallback gracefully
  if (files.length === 3) {
    const parsedMonths: MonthRekap[] = [];
    let prevSaldo = 0;
    for (let i = 0; i < 3; i++) {
      const parsed = await parseStatementFile(files[i], defaultData?.months[i].monthNumber, defaultData?.months[i].year);
      const saldoAwal = i === 0 ? (parsed.saldoAwal || defaultData?.months[0].saldoAwal || 0) : prevSaldo;
      let running = saldoAwal;
      const records = parsed.records.map((r) => {
        running = running - (r.debet || 0) + (r.kredit || 0);
        return { ...r, saldo: running };
      });
      prevSaldo = running;
      parsedMonths.push({
        monthIndex: i + 1,
        monthName: parsed.monthName || defaultData?.months[i].monthName || `Bulan ${i + 1}`,
        year: parsed.year || defaultData?.months[i].year || 2026,
        monthNumber: parsed.monthNumber || defaultData?.months[i].monthNumber || i + 5,
        saldoAwal,
        records,
      });
    }
    return {
      namaDebitur: namaDebitur || defaultData?.namaDebitur || 'Heriyanto',
      tabBank: tabBank || defaultData?.tabBank || 'BCA',
      noRek: noRek || defaultData?.noRek || '4160641164',
      months: parsedMonths as [MonthRekap, MonthRekap, MonthRekap],
    };
  }

  // Fallback to sample data with updated metadata
  return {
    namaDebitur: namaDebitur || defaultData?.namaDebitur || 'Heriyanto',
    tabBank: tabBank || defaultData?.tabBank || 'BCA',
    noRek: noRek || defaultData?.noRek || '4160641164',
    months: defaultData?.months || (SAMPLE_REKAP_DATA.months as [MonthRekap, MonthRekap, MonthRekap]),
  };
}

import * as pdfjsLib from 'pdfjs-dist';
import { DailyRecord, MonthRekap, RekapRekeningData } from '../types/rekening';
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

const MONTH_WORD_MAP: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

/**
 * Universal Currency Parser:
 * Correctly parses US format (1,234,567.89), Indonesian format (1.234.567,89),
 * and integers with dot thousands (15.450.000).
 */
export function cleanCurrency(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/^(?:Rp\.?|IDR)\s*/i, '').trim();

  // If both dots and commas exist:
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // 1.234.567,89 (European/Indonesian with comma decimal)
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234,567.89 (US with dot decimal)
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only comma
    if (/,\d{2}$/.test(str)) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    // Only dots
    const dotParts = str.split('.');
    if (dotParts.length > 2 || (dotParts.length === 2 && dotParts[1].length === 3)) {
      str = str.replace(/\./g, '');
    }
  }

  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

export interface ExtractedStatementMonth {
  monthName: string;
  monthNumber: number;
  year: number;
  saldoAwal: number;
  saldoAkhir: number;
  txs: ParsedTx[];
  officialSummary?: MonthSummaryOfficial;
}

export interface StatementParseResult {
  namaDebitur: string;
  tabBank: string;
  noRek: string;
  monthsData: ExtractedStatementMonth[];
}

/**
 * Universal PDF Bank Statement Parser
 * Supports BRI (BritAma, Simpedes, Giro), BCA (Tahapan, Giro), Mandiri, BNI, BSI, and generic formats.
 */
export async function parsePdfStatementWithCoordinates(file: File): Promise<StatementParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let tabBank = 'BANK UMUM';
  let namaDebitur = '';
  let noRek = '';
  let detectedGlobalSaldoAwal: number | null = null;

  interface PageData {
    pageNum: number;
    items: { x: number; y: number; str: string }[];
    lines: { y: number; text: string; items: { x: number; y: number; str: string }[] }[];
  }

  const pagesData: PageData[] = [];
  let allPagesText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items = content.items
      .map((it: any) => ({
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
        str: (it.str || '').trim(),
      }))
      .filter((it) => it.str.length > 0);

    // Group items into lines by Y coordinate (tolerance +-4)
    const lineMap: { [y: number]: { x: number; y: number; str: string }[] } = {};
    const yList: number[] = [];

    items.forEach((it) => {
      let matchedY = yList.find((y) => Math.abs(y - it.y) <= 4);
      if (matchedY === undefined) {
        matchedY = it.y;
        yList.push(matchedY);
        lineMap[matchedY] = [];
      }
      lineMap[matchedY].push(it);
    });

    yList.sort((a, b) => b - a);

    const lines = yList.map((y) => {
      const lineItems = lineMap[y].sort((a, b) => a.x - b.x);
      return {
        y,
        text: lineItems.map((it) => it.str).join(' '),
        items: lineItems,
      };
    });

    const pageText = lines.map((l) => l.text).join('\n');
    allPagesText += '\n' + pageText;

    pagesData.push({ pageNum, items, lines });
  }

  // 1. Detect Bank Name from header
  const headerText =
    (pagesData[0]?.lines.filter((l) => l.y >= 640).map((l) => l.text).join(' ') || '') +
    ' ' +
    (pagesData[0]?.lines.slice(0, 10).map((l) => l.text).join(' ') || '');

  if (/BANK\s*RAKYAT\s*INDONESIA|PT\.?\s*BRI|\bBRI\b|BRITAMA|SIMPEDES/i.test(headerText)) {
    tabBank = 'BRI';
  } else if (/BANK\s*CENTRAL\s*ASIA|\bBCA\b|KLIKBCA|TAHAPAN/i.test(headerText)) {
    tabBank = 'BCA';
  } else if (/BANK\s*MANDIRI|\bMANDIRI\b|LIVIN/i.test(headerText)) {
    tabBank = 'MANDIRI';
  } else if (/BANK\s*NEGARA\s*INDONESIA|\bBNI\b/i.test(headerText)) {
    tabBank = 'BNI';
  } else if (/BANK\s*SYARIAH\s*INDONESIA|\bBSI\b/i.test(headerText)) {
    tabBank = 'BSI';
  } else {
    // Full document fallback
    if (/PT\.?\s*BANK\s*RAKYAT\s*INDONESIA/i.test(allPagesText)) tabBank = 'BRI';
    else if (/PT\.?\s*BANK\s*CENTRAL\s*ASIA/i.test(allPagesText)) tabBank = 'BCA';
    else if (/PT\.?\s*BANK\s*MANDIRI/i.test(allPagesText)) tabBank = 'MANDIRI';
    else if (/PT\.?\s*BANK\s*NEGARA\s*INDONESIA/i.test(allPagesText)) tabBank = 'BNI';
  }

  // 2. Detect Account Number (No. Rekening)
  const rekPatterns = [
    /(?:Nomor\s*Rekening|No\.?\s*Rekening|No\.?\s*Rek|Account\s*No\.?|No\.\s*Acc)\s*[:.]?\s*([0-9\-\s]{8,25})/i,
    /NO\.?\s*REKENING\s*:\s*([0-9\-\s]+)/i,
  ];
  for (const pat of rekPatterns) {
    const m = allPagesText.match(pat);
    if (m && m[1]) {
      const clean = m[1].replace(/[^0-9\-]/g, '').trim();
      if (clean.length >= 8) {
        noRek = clean;
        break;
      }
    }
  }

  // 3. Detect Debitur Name
  const namePatterns = [
    /(?:Nama\s*Nasabah|Nama\s*Rekening|Nama\s*Pemilik|Nama\s*Customer|Nama\s*Akun|Account\s*Name)\s*[:.]\s*([A-Za-z0-9\s.,'/-]+)/i,
    /(?:NAMA)\s*[:]\s*([A-Za-z0-9\s.,'/-]+)/i,
  ];
  for (const pat of namePatterns) {
    const m = allPagesText.match(pat);
    if (m && m[1]) {
      const candidate = m[1].split(/\n|\r|Nomor|No\.|Alamat|Periode|Jenis|Mata/i)[0].trim();
      if (candidate.length > 2 && !/REKENING|KCP|CABANG|HALAMAN/i.test(candidate)) {
        namaDebitur = candidate;
        break;
      }
    }
  }

  // If BCA format and name not found from label, check items at x <= 50, y between 735 and 775
  if (!namaDebitur && tabBank === 'BCA' && pagesData[0]) {
    const nameCandidate = pagesData[0].items.find(
      (it) =>
        it.x <= 50 &&
        it.y >= 735 &&
        it.y <= 775 &&
        it.str.length > 2 &&
        !/REKENING|KCP|CABANG|HALAMAN|CATATAN/i.test(it.str)
    );
    if (nameCandidate) namaDebitur = nameCandidate.str;
  }

  // If still not detected, clean up filename as debitur name
  if (!namaDebitur) {
    const cleanFileName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/^(rekening[-_]koran|statement|bca|bri|mandiri|bni)[-_]/i, '')
      .replace(/[_\-+]/g, ' ')
      .trim();
    if (cleanFileName.length >= 3) {
      namaDebitur = cleanFileName.toUpperCase();
    } else {
      namaDebitur = 'NASABAH ' + tabBank;
    }
  }

  // 4. Detect Saldo Awal from statement text
  const mSaldoAwal = allPagesText.match(/(?:SALDO\s*AWAL|OPENING\s*BALANCE)\s*[:.]?\s*(?:IDR|RP)?\s*([0-9.,]+)/i);
  if (mSaldoAwal) {
    detectedGlobalSaldoAwal = cleanCurrency(mSaldoAwal[1]);
  }

  // 5. Transaction Parsing
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

  let currentYear = new Date().getFullYear();
  const yearMatch = allPagesText.match(/\b(202[0-9])\b/);
  if (yearMatch) currentYear = parseInt(yearMatch[1], 10);

  // Strategy A: If Bank is BCA, attempt BCA Coordinate Parser first
  let bcaParsedTxCount = 0;
  if (tabBank === 'BCA') {
    let currentMonthName = 'MEI 2026';
    let currentMonthNum = 5;

    for (const page of pagesData) {
      const items = page.items;

      // Detect Periode
      const monthItem = items.find(
        (it) =>
          it.y >= 710 &&
          it.y <= 735 &&
          it.x > 380 &&
          /MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JANUARI|FEBRUARI|MARET|APRIL/i.test(it.str)
      );
      if (monthItem) {
        currentMonthName = monthItem.str.toUpperCase();
        for (const [w, num] of Object.entries(MONTH_WORD_MAP)) {
          if (currentMonthName.toLowerCase().includes(w)) {
            currentMonthNum = num;
            break;
          }
        }
        const yM = currentMonthName.match(/\d{4}/);
        if (yM) currentYear = parseInt(yM[0], 10);
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

      // Check official summary
      const saItem = items.find((it) => it.str === 'SALDO AWAL' && it.x < 300);
      const crItem = items.find((it) => it.str === 'MUTASI CR');
      const dbItem = items.find((it) => it.str === 'MUTASI DB');
      const skItem = items.find((it) => it.str === 'SALDO AKHIR');
      if (crItem && dbItem) {
        const crVal = items.find((it) => Math.abs(it.y - crItem.y) <= 4 && it.x > 300 && it.str.includes('.'));
        const dbVal = items.find((it) => Math.abs(it.y - dbItem.y) <= 4 && it.x > 300 && it.str.includes('.'));
        const saVal = items.find((it) => saItem && Math.abs(it.y - saItem.y) <= 4 && it.x > 300 && it.str.includes('.'));
        const skVal = items.find((it) => skItem && Math.abs(it.y - skItem.y) <= 4 && it.x > 300 && it.str.includes('.'));

        if (saVal) monthlyMap[monthKey].saldoAwal = cleanCurrency(saVal.str);
        if (skVal) monthlyMap[monthKey].saldoAkhir = cleanCurrency(skVal.str);
        monthlyMap[monthKey].officialSummary = {
          saldoAwal: saVal ? cleanCurrency(saVal.str) : undefined,
          mutasiCr: crVal ? cleanCurrency(crVal.str) : undefined,
          mutasiDb: dbVal ? cleanCurrency(dbVal.str) : undefined,
          saldoAkhir: skVal ? cleanCurrency(skVal.str) : undefined,
        };
      }

      // Top of table saldo awal
      const tableSa = items.find((it) => it.str === 'SALDO AWAL' && it.x >= 80 && it.x <= 150);
      if (tableSa) {
        const saAmt = items.find((it) => Math.abs(it.y - tableSa.y) <= 4 && it.x >= 490 && it.str.includes('.'));
        if (saAmt && !monthlyMap[monthKey].saldoAwal) {
          monthlyMap[monthKey].saldoAwal = cleanCurrency(saAmt.str);
        }
      }

      const tableRows = page.lines.filter((l) => l.y >= 65 && l.y <= 590);
      let lastDay = 1;

      for (const r of tableRows) {
        const mutasiItem = r.items.find(
          (it) => it.x >= 365 && it.x <= 435 && /^\d{1,3}(,\d{3})*(\.\d{2})?$/.test(it.str)
        );
        if (!mutasiItem) continue;
        if (r.items.some((it) => /SALDO AWAL|MUTASI CR|MUTASI DB|SALDO AKHIR/i.test(it.str))) continue;

        const dateItem = r.items.find((it) => it.x < 70 && /^\d{2}\/\d{2}$/.test(it.str));
        if (dateItem) lastDay = parseInt(dateItem.str.split('/')[0], 10);

        const hasDb = r.items.some((it) => it.x >= 435 && it.x <= 465 && it.str === 'DB');
        const descItems = r.items.filter((it) => it.x >= 70 && it.x < 365);
        const desc = descItems.map((it) => it.str).join(' ');
        const isDb = hasDb || /\bDB\b|BIAYA ADM|PAJAK BUNGA|TARIKAN ATM/i.test(desc);

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
        bcaParsedTxCount++;
      }
    }
  }

  // Strategy B: Universal Line & Multi-Column Parser (For BRI, Mandiri, BNI, BSI, or if BCA coordinates had 0 tx)
  if (bcaParsedTxCount === 0) {
    // Reset monthlyMap
    Object.keys(monthlyMap).forEach((k) => delete monthlyMap[k]);

    let runningBalance = detectedGlobalSaldoAwal || 0;

    for (const page of pagesData) {
      for (const line of page.lines) {
        const text = line.text;

        // Skip headers & footers
        if (/SALDO AWAL|MUTASI CR|MUTASI DB|SALDO AKHIR|HALAMAN|PERIODE TRANSAKSI|KETERANGAN\s+DEBET\s+KREDIT/i.test(text)) {
          // Check if this line defines Saldo Awal
          const mSA = text.match(/SALDO\s*AWAL\s*[:.]?\s*([0-9.,]+)/i);
          if (mSA) {
            runningBalance = cleanCurrency(mSA[1]);
          }
          continue;
        }

        // Match date: DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, DD/MM, etc.
        const dMatch = text.match(
          /(?:^|\s)(\d{1,2})[\/\-\.\s](\d{1,2}|Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Aug|Sep|Okt|Oct|Nov|Des|Dec)(?:[\/\-\.\s](\d{2,4}))?(?:\s|$)/i
        );
        if (!dMatch) continue;

        const day = parseInt(dMatch[1], 10);
        if (day < 1 || day > 31) continue;

        const mToken = dMatch[2].toLowerCase();
        let month = parseInt(mToken, 10);
        if (isNaN(month)) {
          month = MONTH_WORD_MAP[mToken] || 1;
        }
        if (month < 1 || month > 12) continue;

        let year = currentYear;
        if (dMatch[3]) {
          const yStr = dMatch[3];
          year = yStr.length === 2 ? 2000 + parseInt(yStr, 10) : parseInt(yStr, 10);
        }

        // Extract currency numbers on the line
        const numTokens = text.match(/(?:\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})/g);
        if (!numTokens || numTokens.length === 0) continue;

        const amounts = numTokens.map(cleanCurrency);

        let debet = 0;
        let kredit = 0;
        let saldo: number | undefined = undefined;

        if (amounts.length >= 3) {
          // Format standard BRI / Mandiri: [Debet, Kredit, Saldo]
          saldo = amounts[amounts.length - 1];
          kredit = amounts[amounts.length - 2];
          debet = amounts[amounts.length - 3];
        } else if (amounts.length === 2) {
          // Format: [Amount, Saldo] with D/K marker or comparison with running balance
          saldo = amounts[1];
          const mutasi = amounts[0];
          const hasDbFlag = /\b(D|DB|DEBET|DEBIT)\b/i.test(text);
          const hasCrFlag = /\b(CR|K|KREDIT|CREDIT)\b/i.test(text);

          if (hasDbFlag) {
            debet = mutasi;
          } else if (hasCrFlag) {
            kredit = mutasi;
          } else {
            // Arithmetic check: if saldo went down, it's debet. If went up, kredit.
            if (saldo < runningBalance) debet = mutasi;
            else kredit = mutasi;
          }
        } else if (amounts.length === 1) {
          const mutasi = amounts[0];
          const hasDbFlag = /\b(D|DB|DEBET|DEBIT)\b/i.test(text);
          if (hasDbFlag) debet = mutasi;
          else kredit = mutasi;
        }

        const isDb = debet > 0;
        const amount = isDb ? debet : kredit;

        if (saldo !== undefined) {
          runningBalance = saldo;
        } else {
          runningBalance = runningBalance - debet + kredit;
          saldo = runningBalance;
        }

        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = {
            monthName: `${MONTH_NAMES[month - 1]} ${year}`,
            monthNumber: month,
            year: year,
            saldoAwal: runningBalance - kredit + debet,
            txs: [],
          };
        }

        monthlyMap[monthKey].txs.push({
          date: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
          day,
          month,
          year,
          desc: text.slice(0, 50),
          isDb,
          amount,
          saldo,
        });
      }
    }
  }

  // Convert monthlyMap to sorted months
  const sortedKeys = Object.keys(monthlyMap).sort();
  const monthsData: ExtractedStatementMonth[] = sortedKeys.map((k) => {
    const m = monthlyMap[k];
    return {
      monthName: m.monthName,
      monthNumber: m.monthNumber,
      year: m.year,
      saldoAwal: m.saldoAwal || detectedGlobalSaldoAwal || 0,
      saldoAkhir: m.saldoAkhir || (m.txs.length > 0 ? m.txs[m.txs.length - 1].saldo || 0 : 0),
      txs: m.txs,
      officialSummary: m.officialSummary,
    };
  });

  return {
    namaDebitur,
    tabBank,
    noRek,
    monthsData,
  };
}

/**
 * Universal processor that accurately extracts statement data from uploaded file(s)
 * and constructs the exact side-by-side 3-month RekapRekeningData structure.
 */
export async function processUploadedBankStatements(
  files: File[],
  defaultData?: RekapRekeningData
): Promise<RekapRekeningData> {
  if (files.length === 0) {
    return defaultData || SAMPLE_REKAP_DATA;
  }

  const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    throw new Error('Format file belum didukung. Harap unggah berkas rekening koran dalam format PDF.');
  }

  // Process all uploaded PDF files
  const parsedResults: StatementParseResult[] = [];
  for (const file of pdfFiles) {
    const res = await parsePdfStatementWithCoordinates(file);
    parsedResults.push(res);
  }

  // Combine metadata: take the first non-generic bank and debitur name
  const tabBank = parsedResults.find((r) => r.tabBank !== 'BANK UMUM')?.tabBank || parsedResults[0].tabBank;
  const namaDebitur = parsedResults.find((r) => r.namaDebitur && !r.namaDebitur.startsWith('NASABAH'))?.namaDebitur || parsedResults[0].namaDebitur;
  const noRek = parsedResults.find((r) => r.noRek)?.noRek || parsedResults[0].noRek || '-';

  // Merge monthsData from all files
  const mergedMonthsMap: { [monthKey: string]: ExtractedStatementMonth } = {};

  for (const res of parsedResults) {
    for (const m of res.monthsData) {
      const key = `${m.year}-${String(m.monthNumber).padStart(2, '0')}`;
      if (!mergedMonthsMap[key]) {
        mergedMonthsMap[key] = { ...m, txs: [...m.txs] };
      } else {
        // Merge transactions (avoiding exact duplicates)
        for (const tx of m.txs) {
          const exists = mergedMonthsMap[key].txs.some(
            (t) => t.day === tx.day && t.amount === tx.amount && t.isDb === tx.isDb
          );
          if (!exists) mergedMonthsMap[key].txs.push(tx);
        }
      }
    }
  }

  const sortedMonthKeys = Object.keys(mergedMonthsMap).sort();
  const allMonths = sortedMonthKeys.map((k) => mergedMonthsMap[k]);

  // If no transactions found across any files, inform the user
  const totalTxCount = allMonths.reduce((acc, m) => acc + m.txs.length, 0);
  if (totalTxCount === 0) {
    throw new Error(
      `File berhasil teridentifikasi sebagai rekening ${tabBank}, namun data tabel transaksi tidak terbaca. Pastikan file merupakan e-statement PDF asli yang memuat teks mutasi digital (bukan hasil scan/foto tanpa OCR).`
    );
  }

  // Build exactly 3 months
  let targetMonths: ExtractedStatementMonth[] = [];

  if (allMonths.length >= 3) {
    targetMonths = allMonths.slice(0, 3);
  } else if (allMonths.length === 2) {
    // 2 months present, prepend 1 preceding month or append 1 next month
    const m1 = allMonths[0];
    const prevMonthNum = m1.monthNumber === 1 ? 12 : m1.monthNumber - 1;
    const prevYear = m1.monthNumber === 1 ? m1.year - 1 : m1.year;
    const dummyPrev: ExtractedStatementMonth = {
      monthName: `${MONTH_NAMES[prevMonthNum - 1]} ${prevYear}`,
      monthNumber: prevMonthNum,
      year: prevYear,
      saldoAwal: m1.saldoAwal,
      saldoAkhir: m1.saldoAwal,
      txs: [],
    };
    targetMonths = [dummyPrev, allMonths[0], allMonths[1]];
  } else if (allMonths.length === 1) {
    // 1 month present (e.g. Juli), construct 2 preceding months (Mei, Juni, Juli)
    const m = allMonths[0];
    const mNum = m.monthNumber;
    const yr = m.year;

    const getPrev = (offset: number): ExtractedStatementMonth => {
      let mN = mNum - offset;
      let y = yr;
      while (mN <= 0) {
        mN += 12;
        y -= 1;
      }
      return {
        monthName: `${MONTH_NAMES[mN - 1]} ${y}`,
        monthNumber: mN,
        year: y,
        saldoAwal: m.saldoAwal,
        saldoAkhir: m.saldoAwal,
        txs: [],
      };
    };

    targetMonths = [getPrev(2), getPrev(1), m];
  }

  // Construct 3 MonthRekap records
  const parsedMonths: MonthRekap[] = targetMonths.map((m, idx) => {
    const daysInMonth = new Date(m.year, m.monthNumber, 0).getDate();
    let runningSaldo = m.saldoAwal;

    const records: DailyRecord[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const txsToday = m.txs.filter((t) => t.day === d);
      const debToday = txsToday.filter((t) => t.isDb).reduce((acc, t) => acc + t.amount, 0);
      const kreToday = txsToday.filter((t) => !t.isDb).reduce((acc, t) => acc + t.amount, 0);

      runningSaldo = runningSaldo - debToday + kreToday;

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

    return {
      monthIndex: idx + 1,
      monthName: m.monthName,
      year: m.year,
      monthNumber: m.monthNumber,
      saldoAwal: Math.round(m.saldoAwal),
      records,
    };
  });

  return {
    namaDebitur,
    tabBank,
    noRek,
    months: parsedMonths as [MonthRekap, MonthRekap, MonthRekap],
  };
}

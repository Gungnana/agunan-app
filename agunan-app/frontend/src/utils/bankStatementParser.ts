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
  feb: 2, februari: 2, february: 2, peb: 2, pebruari: 2,
  mar: 3, maret: 3, march: 3, mrt: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agustus: 8, aug: 8, august: 8, agt: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11, nop: 11, nopember: 11,
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
  return isNaN(num) ? 0 : Math.abs(num);
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

export class PasswordRequiredError extends Error {
  code: number;
  fileName: string;
  constructor(message: string, code: number = 1, fileName: string = '') {
    super(message);
    this.name = 'PasswordRequiredError';
    this.code = code;
    this.fileName = fileName;
  }
}

/**
 * Universal PDF Bank Statement Parser
 * Supports BRI (BritAma, Simpedes, Giro), BCA (Tahapan, Giro), Mandiri, BNI, BSI, and generic formats.
 */
export async function parsePdfStatementWithCoordinates(
  file: File,
  password?: string
): Promise<StatementParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: password || undefined,
  });

  let pdf: any;
  try {
    pdf = await loadingTask.promise;
  } catch (err: any) {
    if (err.name === 'PasswordException' || /password/i.test(err.message || '')) {
      const isIncorrect = err.code === 2 || /incorrect/i.test(err.message || '');
      throw new PasswordRequiredError(
        isIncorrect
          ? 'Password yang Anda masukkan salah. Silakan coba lagi.'
          : 'File rekening koran ini diproteksi oleh password.',
        err.code || (isIncorrect ? 2 : 1),
        file.name
      );
    }
    throw err;
  }

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

    const items: { x: number; y: number; str: string }[] = content.items
      .map((it: any) => ({
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
        str: (it.str || '').trim(),
      }))
      .filter((it: any) => it.str.length > 0);

    // Group items into lines by Y coordinate (tolerance +-4)
    const lineMap: { [y: number]: { x: number; y: number; str: string }[] } = {};
    const yList: number[] = [];

    items.forEach((it) => {
      let matchedY = yList.find((y) => Math.abs(y - it.y) <= 4);
      if (matchedY === undefined) {
        const newY = it.y;
        yList.push(newY);
        lineMap[newY] = [];
        lineMap[newY].push(it);
      } else {
        lineMap[matchedY].push(it);
      }
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

  if (/BANK\s*RAKYAT\s*INDONESIA|PT\.?\s*BRI|\bBRI\b|BRITAMA|SIMPEDES|BRIMO/i.test(headerText)) {
    tabBank = 'BRI';
  } else if (/BANK\s*CENTRAL\s*ASIA|\bBCA\b|KLIKBCA|TAHAPAN/i.test(headerText)) {
    tabBank = 'BCA';
  } else if (/BANK\s*MANDIRI|\bMANDIRI\b|LIVIN|KOPRA/i.test(headerText)) {
    tabBank = 'MANDIRI';
  } else if (/BANK\s*NEGARA\s*INDONESIA|\bBNI\b|BNI\s*DigiCS|bni\.co\.id|TAPLUS/i.test(headerText)) {
    tabBank = 'BNI';
  } else if (/BANK\s*SYARIAH\s*INDONESIA|\bBSI\b|MUDHARABAH|WADIAH/i.test(headerText)) {
    tabBank = 'BSI';
  } else if (/BPD\s*BALI|BANK\s*PEMBANGUNAN\s*DAERAH\s*BALI|SIMPEDA/i.test(headerText)) {
    tabBank = 'BPD BALI';
  } else if (/CIMB\s*NIAGA|OCTO/i.test(headerText)) {
    tabBank = 'CIMB NIAGA';
  } else if (/DANAMON/i.test(headerText)) {
    tabBank = 'DANAMON';
  } else if (/PERMATA/i.test(headerText)) {
    tabBank = 'PERMATA';
  } else if (/PANIN/i.test(headerText)) {
    tabBank = 'PANIN';
  } else if (/BTN|TABUNGAN\s*NEGARA/i.test(headerText)) {
    tabBank = 'BTN';
  } else if (/BPR\s*BANK\s*KERTIAWAN|BPR\s*KERTIAWAN|BANK\s*KERTIAWAN|KERTIAWAN/i.test(headerText)) {
    tabBank = 'BPR BANK KERTIAWAN';
  } else {
    // Full document fallback
    if (/PT\.?\s*BANK\s*RAKYAT\s*INDONESIA|\bBRI\b|BRITAMA/i.test(allPagesText)) tabBank = 'BRI';
    else if (/PT\.?\s*BANK\s*CENTRAL\s*ASIA|\bBCA\b|TAHAPAN/i.test(allPagesText)) tabBank = 'BCA';
    else if (/PT\.?\s*BANK\s*MANDIRI|\bMANDIRI\b|LIVIN/i.test(allPagesText)) tabBank = 'MANDIRI';
    else if (/PT\.?\s*BANK\s*NEGARA\s*INDONESIA|\bBNI\b|bni\.co\.id|TAPLUS/i.test(allPagesText)) tabBank = 'BNI';
    else if (/BANK\s*SYARIAH\s*INDONESIA|\bBSI\b/i.test(allPagesText)) tabBank = 'BSI';
    else if (/BPD\s*BALI|PEMBANGUNAN\s*DAERAH\s*BALI/i.test(allPagesText)) tabBank = 'BPD BALI';
    else if (/CIMB\s*NIAGA/i.test(allPagesText)) tabBank = 'CIMB NIAGA';
    else if (/DANAMON/i.test(allPagesText)) tabBank = 'DANAMON';
    else if (/PERMATA/i.test(allPagesText)) tabBank = 'PERMATA';
    else if (/PANIN/i.test(allPagesText)) tabBank = 'PANIN';
    else if (/BTN|TABUNGAN\s*NEGARA/i.test(allPagesText)) tabBank = 'BTN';
    else if (/BPR\s*BANK\s*KERTIAWAN|BPR\s*KERTIAWAN|BANK\s*KERTIAWAN|KERTIAWAN/i.test(allPagesText)) tabBank = 'BPR BANK KERTIAWAN';
  }

  // 2. Detect Account Number (No. Rekening)
  const rekPatterns = [
    /(?:BNI\s+[A-Za-z0-9]+|TAPLUS(?:\s+[A-Za-z0-9]+)?|TAPPA)\s*[-:]\s*([0-9]{8,20})/i,
    /(?:Nomor\s*Rekening|No\.?\s*Rekening|No\.?\s*Rek|Account\s*No\.?|No\.\s*Acc|No\.?\s*Rekening\s*\/[^\n:]+|Rekening|Account)\s*[:.]?\s*([0-9.\-\s]{8,30})/i,
    /NO\.?\s*REKENING\s*:\s*([0-9.\-\s]+)/i,
    /(?:Rekening|Account)\s*[\r\n\s:]+([0-9.\-]{8,25})/i,
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
    /(?:Nama\s*Nasabah|Nama\s*Lengkap|Nama\s*Pemilik(?:\s*Rekening)?|Nama\s*Customer|Nama\s*Akun|Account\s*Name|Nama\s*\/\s*Name)\s*[:.]\s*([A-Za-z0-9\s.,'/-]+)/i,
    /(?:^|\s)NAMA\s*[:]\s*([A-Za-z0-9\s.,'/-]+)/i,
  ];
  for (const pat of namePatterns) {
    const m = allPagesText.match(pat);
    if (m && m[1]) {
      let candidate = m[1].split(/\n|\r|Nomor|No\.|Alamat|Periode|Jenis|Mata|Produk|OPR|HAL|KODE/i)[0].trim();
      candidate = candidate.replace(/^[:\s\-.]+/, '').trim();
      if (
        candidate.length > 2 &&
        !/\d{4,}/.test(candidate) &&
        !/REKENING|KCP|CABANG|HALAMAN|STATEMENT|DATE|TANGGAL|PRODUK|BRITAMA|SIMPEDES|TAPLUS|TAHAPAN/i.test(
          candidate
        )
      ) {
        namaDebitur = candidate;
        break;
      }
    }
  }

  // Fallback BCA: Khusus bank BCA, pada baris NO. REKENING, teks di sisi kiri (x < 300) adalah Nama Nasabah (mis. I WAYAN ARDIKA)
  if (!namaDebitur && tabBank === 'BCA' && pagesData[0]) {
    for (const l of pagesData[0].lines) {
      if (/NO\.?\s*REKENING/i.test(l.text)) {
        const leftItems = l.items.filter((it) => it.x < 300 && !/REKENING|KCP|CABANG|HALAMAN/i.test(it.str));
        const cand = leftItems.map((it) => it.str).join(' ').trim();
        if (cand.length >= 3 && !/TAHAPAN|GIRO|DEPOSITO/i.test(cand) && !/\d{4,}/.test(cand)) {
          namaDebitur = cand;
          break;
        }
      }
    }
  }

  // Fallback BNI (e-Statement & Laporan Mutasi Rekening):
  if (!namaDebitur && (tabBank === 'BNI' || /BNI/i.test(headerText)) && pagesData[0]) {
    // 1. Cek baris yang mengandung BNI TAPPA / TAPLUS / No. Rekening: teks di sisi kiri (x < 350) adalah Nama Nasabah
    for (const l of pagesData[0].lines) {
      if (/BNI\s+TAPPA|BNI\s+TAPLUS|TAPPA\s*[-:]|TAPLUS\s*[-:]/i.test(l.text)) {
        const leftItems = l.items.filter((it) => it.x < 350 && !/BNI|LAPORAN|MUTASI|PERIODE/i.test(it.str));
        const cand = leftItems.map((it) => it.str).join(' ').trim();
        if (cand.length >= 3 && !/\d{4,}/.test(cand) && !/BR\s*DINAS|DESA|JL\.|KEC/i.test(cand)) {
          namaDebitur = cand;
          break;
        }
      }
    }
    // 2. Baris di atas alamat nasabah (BR DINAS, DESA, JL., KEL., KEC.)
    if (!namaDebitur) {
      const lines = pagesData[0].lines;
      const addrIdx = lines.findIndex((l) => /BR\s*DINAS|DESA\s+\d|JL\.|JALAN|KEL\.|KEC\./i.test(l.text));
      if (addrIdx > 0) {
        for (let i = addrIdx - 1; i >= 0 && i >= addrIdx - 3; i--) {
          const cand = lines[i].text.replace(/BNI\s+TAPPA.*$/i, '').trim();
          if (cand.length >= 3 && !/LAPORAN|MUTASI|PERIODE|BNI/i.test(cand) && !/\d{4,}/.test(cand)) {
            namaDebitur = cand;
            break;
          }
        }
      }
    }
    // 3. Fallback DigiCS
    if (!namaDebitur) {
      for (const l of pagesData[0].lines) {
        if (/TAPLUS|PRODUK/i.test(l.text)) {
          const cand = l.text.split(/Produk|TAPLUS/i)[0].trim();
          if (cand.length >= 3 && !/TANGGAL|REKENING|KEPADA|PERIODE/i.test(cand)) {
            namaDebitur = cand;
            break;
          }
        }
      }
    }
  }

  // Fallback BRImo: Pada baris di bawah 'Kepada Yth. / To :', cari baris nama di sisi kiri (x < 300)
  if (!namaDebitur && pagesData[0]) {
    const lines = pagesData[0].lines;
    const ythIdx = lines.findIndex((l) => /Kepada\s*Yth/i.test(l.text));
    if (ythIdx !== -1) {
      for (let offset = 1; offset <= 3; offset++) {
        const l = lines[ythIdx + offset];
        if (!l) break;
        const leftItems = l.items.filter(
          (it) => it.x < 300 && !/Kepada|Yth|Tanggal|Statement|Date|Periode|Transaction/i.test(it.str)
        );
        const cand = leftItems.map((it) => it.str).join(' ').trim();
        if (cand.length >= 3 && !/BANJAR|DESA|JL\.|JALAN|RT\.|RW\.|KECAMATAN|KABUPATEN/i.test(cand)) {
          namaDebitur = cand;
          break;
        }
      }
    }
  }

  // If still not detected, clean up filename as debitur name
  if (!namaDebitur) {
    const cleanFileName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/^(rekening[-_]koran|statement|bca|bri|mandiri|bni)[-_]/i, '')
      .replace(/[_\-+]/g, ' ')
      .trim();
    if (cleanFileName.length >= 3 && !/^[0-9a-f]{20,}$/i.test(cleanFileName)) {
      namaDebitur = cleanFileName.toUpperCase();
    } else {
      namaDebitur = 'NASABAH ' + tabBank;
    }
  }

  // 4. Detect Saldo Awal from statement text
  const mSaldoAwal = allPagesText.match(/(?:SALDO\s*AWAL|OPENING\s*BALANCE|INITIAL\s*BALANCE)(?:\s*\/[^\n:]+)?\s*[:.]?\s*(?:IDR|RP)?\s*([0-9.,]+)/i);
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
      // Check if page defines a Period (e.g. Periode: 1 - 30 November 2025)
      let pageMonthNum: number | null = null;
      let pageYear = currentYear;
      for (const l of page.lines) {
        const mPer = l.text.match(/Periode\s*:\s*[0-9\-\s]+([A-Za-z]{3,})\s*(\d{4})/i);
        if (mPer) {
          const mToken = mPer[1].toLowerCase();
          if (MONTH_WORD_MAP[mToken]) {
            pageMonthNum = MONTH_WORD_MAP[mToken];
            pageYear = parseInt(mPer[2], 10);
            break;
          }
        }
      }

      // Check 4-Box Summary Card (BNI & similar formats: Saldo Awal, Total Pemasukan, Total Pengeluaran, Saldo Akhir)
      const lblLineIdx = page.lines.findIndex((l) =>
        /Saldo\s*Awal/i.test(l.text) &&
        /Total\s*Pemasukan/i.test(l.text) &&
        /Total\s*Pengeluaran/i.test(l.text) &&
        /Saldo\s*Akhir/i.test(l.text)
      );
      if (lblLineIdx !== -1 && page.lines[lblLineIdx + 1]) {
        const valLine = page.lines[lblLineIdx + 1];
        // Extract 4 values
        const vTokens = valLine.text.match(/(?:[+-]?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|[+-]?\s*\d+)/g);
        if (vTokens && vTokens.length >= 4) {
          const sa = cleanCurrency(vTokens[0]);
          const masuk = cleanCurrency(vTokens[1]);
          const keluar = cleanCurrency(vTokens[2]);
          const sk = cleanCurrency(vTokens[3]);

          if (pageMonthNum) {
            const mKey = `${pageYear}-${String(pageMonthNum).padStart(2, '0')}`;
            if (!monthlyMap[mKey]) {
              monthlyMap[mKey] = {
                monthName: `${MONTH_NAMES[pageMonthNum - 1]} ${pageYear}`,
                monthNumber: pageMonthNum,
                year: pageYear,
                saldoAwal: sa,
                saldoAkhir: sk,
                txs: [],
              };
            }
            monthlyMap[mKey].saldoAwal = sa;
            monthlyMap[mKey].saldoAkhir = sk;
            monthlyMap[mKey].officialSummary = {
              saldoAwal: sa,
              mutasiCr: masuk,
              mutasiDb: keluar,
              saldoAkhir: sk,
            };
          }
        }
      }

      for (let lineIdx = 0; lineIdx < page.lines.length; lineIdx++) {
        const line = page.lines[lineIdx];
        const text = line.text;

        // Skip 4-box card labels and card values
        if (
          /Saldo\s*Awal/i.test(text) &&
          /Total\s*Pemasukan/i.test(text) &&
          /Total\s*Pengeluaran/i.test(text) &&
          /Saldo\s*Akhir/i.test(text)
        ) {
          continue;
        }

        // Skip headers & footers & page numbers & metadata lines
        if (
          /MUTASI CR|MUTASI DB|PERIODE TRANSAKSI|KETERANGAN\s+DEBET\s+KREDIT|HALAMAN\s*\d+\s*DARI|HAL\s*[:.]?\s*\d+\s*DARI|Periode\s*(?:\/|\:)|Period|Dicetak\s*pada|Issued\s*on|Cabang\s*\/\s*Branch|Tanggal\s*\/\s*Date|Initial\s*Balance|Closing\s*Balance|Incoming\s*Transactions|Outgoing\s*Transactions|Dana\s*Masuk|Dana\s*Keluar/i.test(
            text
          )
        ) {
          continue;
        }

        // Check if this line defines single Saldo Awal row in table
        if (/Saldo\s*Awal/i.test(text) && !/Total/i.test(text)) {
          const mSA = text.match(/(?:SALDO\s*AWAL|INITIAL\s*BALANCE)(?:\s*\/[^\n:]+)?\s*[:.]?\s*(?:IDR|RP)?\s*([0-9.,]+)/i);
          if (mSA) {
            runningBalance = cleanCurrency(mSA[1]);
          } else {
            const saNum = text.match(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?\b/);
            if (saNum) runningBalance = cleanCurrency(saNum[0]);
          }
          continue;
        }

        // Match date:
        // Priority 1: Named month e.g. 04 Aug 2026, 31 Jul 2026, 09 Sep 2026, 04-Aug-2026
        // Priority 2: ISO YYYY-MM-DD
        // Priority 3: Delimited numeric date DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (delimited by / - ., never whitespace)
        let day: number | null = null;
        let month: number | null = null;
        let year: number = currentYear;
        let textWithoutDate = text;

        const namedMatch = text.match(
          /(?:^|\s)(\d{1,2})[\/\-\.\s]([A-Za-z]{3,})(?:[\/\-\.\s](\d{2,4}))?(?:\s|$)/
        );
        if (namedMatch) {
          const d = parseInt(namedMatch[1], 10);
          const mToken = namedMatch[2].toLowerCase();
          if (MONTH_WORD_MAP[mToken] && d >= 1 && d <= 31) {
            day = d;
            month = MONTH_WORD_MAP[mToken];
            if (namedMatch[3]) {
              const yStr = namedMatch[3];
              year = yStr.length === 2 ? 2000 + parseInt(yStr, 10) : parseInt(yStr, 10);
            }
            textWithoutDate = text.replace(namedMatch[0], ' ');
          }
        }

        if (!day) {
          const isoMatch = text.match(/(?:^|\s)(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s|$)/);
          if (isoMatch) {
            year = parseInt(isoMatch[1], 10);
            month = parseInt(isoMatch[2], 10);
            day = parseInt(isoMatch[3], 10);
            textWithoutDate = text.replace(isoMatch[0], ' ');
          } else {
            // Strictly delimited numeric date (slash, dash, dot - NOT whitespace)
            const numMatch = text.match(
              /(?:^|\s)(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?(?:\s|$)/
            );
            if (numMatch) {
              const d = parseInt(numMatch[1], 10);
              const m = parseInt(numMatch[2], 10);
              if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
                day = d;
                month = m;
                if (numMatch[3]) {
                  const yStr = numMatch[3];
                  year = yStr.length === 2 ? 2000 + parseInt(yStr, 10) : parseInt(yStr, 10);
                }
                textWithoutDate = text.replace(numMatch[0], ' ');
              }
            }
          }
        }

        if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) continue;

        // Clean time patterns (e.g. 06:21:30 WIB) so they don't interfere with currency tokens
        textWithoutDate = textWithoutDate.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:WIB|WITA|WIT)?\b/gi, ' ');

        // Extract currency numbers on the line:
        // Supports: +16, -1,000, +473,500, 1,133,477, 0.00 / 0,00 / 1.234.567,89 / 1,234,567.89 / 15.000.000 / 250,000 / 50.000
        let numTokens = textWithoutDate.match(
          /(?:[+-]\s*\d+(?:[.,]\d{3})*(?:[.,]\d{2})?|\b(?:0[.,]00|\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d+[.,]\d{2})\b)/g
        );

        // Fallback: If no dotted/comma numbers found, look for plain 5+ digit integers (>= 10,000)
        if (!numTokens || numTokens.length === 0) {
          const plainNumbers = textWithoutDate.match(/\b\d{5,12}\b/g);
          if (plainNumbers && plainNumbers.length > 0) {
            numTokens = plainNumbers;
          }
        }

        if (!numTokens || numTokens.length === 0) continue;

        const amounts = numTokens.map(cleanCurrency);

        let debet = 0;
        let kredit = 0;
        let saldo: number | undefined = undefined;

        if (amounts.length >= 3) {
          // Format standard BRI / Mandiri / BPD Bali 3-Column: [Debet, Kredit, Saldo]
          saldo = amounts[amounts.length - 1];
          kredit = amounts[amounts.length - 2];
          debet = amounts[amounts.length - 3];
        } else if (amounts.length === 2) {
          // Format: [Amount, Saldo] with D/K, DB/CR, +/- sign marker, or comparison with running balance
          saldo = amounts[1];
          const mutasi = amounts[0];
          const hasDbFlag = /\b(D|DB|DEBET|DEBIT)\b/i.test(text);
          const hasCrFlag = /\b(CR|K|KREDIT|CREDIT)\b/i.test(text);
          const hasMinusFlag = /[-\u2212\u2013\u2014]\s*[\d.,]+/.test(textWithoutDate);
          const hasPlusFlag = /\+\s*[\d.,]+/.test(textWithoutDate);

          if (hasMinusFlag || hasDbFlag) {
            debet = mutasi;
          } else if (hasPlusFlag || hasCrFlag) {
            kredit = mutasi;
          } else {
            // Arithmetic check: if saldo went down, it's debet. If went up, kredit.
            if (runningBalance > 0 && saldo !== undefined) {
              if (saldo < runningBalance) debet = mutasi;
              else if (saldo > runningBalance) kredit = mutasi;
              else {
                if (/\b(TARIK|BIAYA|ADM|PAJAK|TRF KE|TRANSFER KE|PEMBELIAN|DEBIT|PINJAMAN)\b/i.test(text)) {
                  debet = mutasi;
                } else {
                  kredit = mutasi;
                }
              }
            } else {
              // Keyword heuristic
              if (/\b(TARIK|BIAYA|ADM|PAJAK|TRF KE|TRANSFER KE|PEMBELIAN|DEBIT|PINJAMAN)\b/i.test(text)) {
                debet = mutasi;
              } else {
                kredit = mutasi;
              }
            }
          }
        } else if (amounts.length === 1) {
          const mutasi = amounts[0];
          const hasDbFlag = /\b(D|DB|DEBET|DEBIT)\b/i.test(text);
          const hasCrFlag = /\b(CR|K|KREDIT|CREDIT)\b/i.test(text);
          const hasMinusFlag = /[-\u2212\u2013\u2014]\s*[\d.,]+/.test(textWithoutDate);
          const hasPlusFlag = /\+\s*[\d.,]+/.test(textWithoutDate);
          if (hasMinusFlag || hasDbFlag) {
            debet = mutasi;
          } else if (hasPlusFlag || hasCrFlag) {
            kredit = mutasi;
          } else if (/\b(TARIK|BIAYA|ADM|PAJAK|TRF KE|TRANSFER KE|PEMBELIAN|PINJAMAN)\b/i.test(text)) {
            debet = mutasi;
          } else {
            kredit = mutasi;
          }
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

        let cleanDesc = textWithoutDate
          .replace(/[+-]\s*\d+(?:[.,]\d{3})*(?:[.,]\d{2})?/g, ' ')
          .replace(/\b(?:0[.,]00|\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d+[.,]\d{2})\b/g, ' ')
          .replace(/\b(D|K|DB|CR)\b/g, ' ')
          .trim();

        // Check if next line is a subline (e.g. "10:28:10 WIB MANDIRI -")
        const nextLine = page.lines[lineIdx + 1];
        if (nextLine && !nextLine.text.match(/(?:^|\s)\d{1,2}[\/\-\.\s][A-Za-z]{3,}|\b\d{1,2}[\/\-]\d{1,2}\b/)) {
          const subText = nextLine.text
            .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:WIB|WITA|WIT)?\b/gi, '')
            .replace(/PT Bank Negara.*$/i, '')
            .trim();
          if (subText.length > 2 && !/Saldo Awal|Informasi|Total/i.test(subText)) {
            cleanDesc = (cleanDesc + ' ' + subText).trim();
          }
        }

        monthlyMap[monthKey].txs.push({
          date: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
          day,
          month,
          year,
          desc: cleanDesc.slice(0, 60) || text.slice(0, 50),
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
    const sortedTxs = [...m.txs].sort((a, b) => a.day - b.day);

    let calculatedSaldoAwal = m.saldoAwal || detectedGlobalSaldoAwal || 0;
    if (sortedTxs.length > 0 && sortedTxs[0].saldo !== undefined) {
      const first = sortedTxs[0];
      const s = first.saldo as number;
      calculatedSaldoAwal = first.isDb ? s + first.amount : s - first.amount;
    }

    const lastWithSaldo = [...sortedTxs].reverse().find((t) => t.saldo !== undefined);
    const calculatedSaldoAkhir = lastWithSaldo?.saldo || (sortedTxs.length > 0 ? sortedTxs[sortedTxs.length - 1].saldo || 0 : 0);

    return {
      monthName: m.monthName,
      monthNumber: m.monthNumber,
      year: m.year,
      saldoAwal: Math.round(calculatedSaldoAwal),
      saldoAkhir: Math.round(calculatedSaldoAkhir),
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
  password?: string,
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
    const res = await parsePdfStatementWithCoordinates(file, password);
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
    // Pattern Bank Mandiri / E-statement: Periode seringkali dimulai dari hari terakhir bulan sebelumnya
    // (misal: 31 Jul 2026 - 08 Oct 2026) hanya untuk mendebet biaya administrasi bulanan di jam 23:59 WIB.
    // Jika terdapat 4 bulan di mana bulan pertama hanya memiliki <= 2 transaksi di tanggal akhir (>= 28):
    if (allMonths.length === 4 && allMonths[0].txs.length <= 2 && allMonths[0].txs.every((t) => t.day >= 28)) {
      const boundaryMonth = allMonths[0];
      const primaryMonths = allMonths.slice(1, 4);

      // Saldo awal bulan pertama utama (Agustus) adalah saldo awal resmi sebelum transaksi penutup tersebut
      primaryMonths[0].saldoAwal = boundaryMonth.saldoAwal;

      // Pindahkan transaksi batas akhir bulan tersebut ke hari pertama bulan utama agar seluruh mutasi tetap utuh
      for (const bTx of boundaryMonth.txs) {
        primaryMonths[0].txs.unshift({
          ...bTx,
          day: 1,
          month: primaryMonths[0].monthNumber,
          year: primaryMonths[0].year,
          date: `01/${String(primaryMonths[0].monthNumber).padStart(2, '0')}`,
        });
      }
      targetMonths = primaryMonths;
    } else {
      // Secara umum pada analisa kredit perbankan, selalu ambil 3 bulan terakhir (terbaru)
      targetMonths = allMonths.slice(-3);
    }
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

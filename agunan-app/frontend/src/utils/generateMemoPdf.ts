import { jsPDF } from 'jspdf';
import { RejectionLogItem } from '../types/rejectionLog';

const formatRupiahMemo = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0,-';
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(val);
  return `Rp ${formatted},-`;
};

// Cached font bytes and logo data URL
let cachedRegularFont: string | null = null;
let cachedBoldFont: string | null = null;
let cachedLogoDataUrl: string | null = null;

async function arrayBufferToBinary(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

async function loadAssets(): Promise<{
  regularFont: string | null;
  boldFont: string | null;
  logoDataUrl: string | null;
}> {
  if (cachedRegularFont && cachedBoldFont && cachedLogoDataUrl) {
    return {
      regularFont: cachedRegularFont,
      boldFont: cachedBoldFont,
      logoDataUrl: cachedLogoDataUrl,
    };
  }

  try {
    const [resReg, resBold, resLogo] = await Promise.all([
      fetch('/fonts/JosefinSans-Regular.ttf'),
      fetch('/fonts/JosefinSans-Bold.ttf'),
      fetch('/logo1.png'),
    ]);

    if (resReg.ok) {
      const bufReg = await resReg.arrayBuffer();
      cachedRegularFont = await arrayBufferToBinary(bufReg);
    }

    if (resBold.ok) {
      const bufBold = await resBold.arrayBuffer();
      cachedBoldFont = await arrayBufferToBinary(bufBold);
    }

    if (resLogo.ok) {
      const blob = await resLogo.blob();
      cachedLogoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn('Gagal memuat aset kustom memo, menggunakan fallback standar:', err);
  }

  return {
    regularFont: cachedRegularFont,
    boldFont: cachedBoldFont,
    logoDataUrl: cachedLogoDataUrl,
  };
}

/**
 * Generate official rejection memo PDF matching BPR Bank Kertiawan template:
 * - Font: Josefin Sans
 * - Paper size: F4 (215 mm x 330 mm)
 * - Official logo from /logo1.png
 */
export async function generateMemoPenolakanPdf(item: RejectionLogItem): Promise<Blob> {
  const { regularFont, boldFont, logoDataUrl } = await loadAssets();

  // Create document with F4 (Folio) paper size: 215 mm x 330 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215, 330],
  });

  let fontName = 'helvetica';

  if (regularFont) {
    try {
      doc.addFileToVFS('JosefinSans-Regular.ttf', regularFont);
      doc.addFont('JosefinSans-Regular.ttf', 'JosefinSans', 'normal');
      fontName = 'JosefinSans';
    } catch (e) {
      console.warn('Gagal mendaftarkan JosefinSans-Regular:', e);
    }
  }

  if (boldFont) {
    try {
      doc.addFileToVFS('JosefinSans-Bold.ttf', boldFont);
      doc.addFont('JosefinSans-Bold.ttf', 'JosefinSans', 'bold');
      fontName = 'JosefinSans';
    } catch (e) {
      console.warn('Gagal mendaftarkan JosefinSans-Bold:', e);
    }
  }

  // 1. Add Bank Logo at top left with exact natural aspect ratio
  if (logoDataUrl) {
    try {
      const logoW = 66;
      let logoH = (logoW * 260) / 2037; // Natural aspect ratio of logo1.png (2037x260) -> ~8.42 mm
      try {
        const imgProps = doc.getImageProperties(logoDataUrl);
        if (imgProps && imgProps.width && imgProps.height) {
          logoH = (logoW * imgProps.height) / imgProps.width;
        }
      } catch {
        // Fallback to exact pixel ratio
      }
      doc.addImage(logoDataUrl, 'PNG', 25, 20, logoW, logoH);
    } catch (err) {
      console.warn('Gagal menempelkan gambar logo:', err);
    }
  }

  // 2. Outer Border Frame (F4 paper height = 330 mm)
  const boxX = 25;
  const boxY = 35;
  const boxW = 165;
  const boxH = 258; // Bottom border at 35 + 258 = 293 mm (37 mm bottom margin on F4 paper)

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(boxX, boxY, boxW, boxH);

  // Header Sub-Cell
  doc.line(boxX, boxY + 10, boxX + boxW, boxY + 10);

  // Title
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('MEMO PENOLAKAN PERMOHONAN KREDIT', boxX + boxW / 2, boxY + 6.8, {
    align: 'center',
  });

  // 3. Body Content
  doc.setFont(fontName, 'normal');
  doc.setFontSize(10.5);

  let curY = boxY + 18;
  doc.text('Menunjuk permohonan kredit dengan data sebagai berikut :', boxX + 8, curY);

  curY += 9;
  const labelX = boxX + 8;
  const colonX = boxX + 46;
  const valX = boxX + 50;
  const lineGap = 6.5;

  // Resolve data values with proper fallbacks
  const noPermohonan =
    item.no_permohonan && item.no_permohonan !== '-'
      ? item.no_permohonan
      : item.id.replace('rej-', '') || '111';

  const tglDitolak =
    item.tanggal_ditolak && item.tanggal_ditolak !== '-'
      ? item.tanggal_ditolak
      : item.tanggal_pengajuan || new Date().toLocaleDateString('id-ID');

  const namaNasabah = item.nama;
  const alamatNasabah = item.alamat && item.alamat !== '-' ? item.alamat : 'Bali, Indonesia';
  const plafonKredit = formatRupiahMemo(item.plafon_pengajuan);

  // No. Permohonan
  doc.text('No. Permohonan', labelX, curY);
  doc.text(':', colonX, curY);
  doc.text(noPermohonan, valX, curY);

  // Tanggal
  curY += lineGap;
  doc.text('Tanggal', labelX, curY);
  doc.text(':', colonX, curY);
  doc.text(tglDitolak, valX, curY);

  // Nama
  curY += lineGap;
  doc.text('Nama', labelX, curY);
  doc.text(':', colonX, curY);
  doc.text(namaNasabah, valX, curY);

  // Alamat (Support text wrapping)
  curY += lineGap;
  doc.text('Alamat', labelX, curY);
  doc.text(':', colonX, curY);
  const splitAlamat = doc.splitTextToSize(alamatNasabah, boxW - 58);
  doc.text(splitAlamat, valX, curY);
  curY += (splitAlamat.length - 1) * 5;

  // Plafond Kredit
  curY += lineGap;
  doc.text('Plafond Kredit', labelX, curY);
  doc.text(':', colonX, curY);
  doc.text(plafonKredit, valX, curY);

  // Paragraf Alasan
  curY += 12;
  const splitKet1 = doc.splitTextToSize(
    'Dengan ini di sampaikan bahwa permohonan kredit tersebut tidak bisa di proses lebih lanjut dengan alasan sebagai berikut :',
    boxW - 16
  );
  doc.text(splitKet1, boxX + 8, curY);
  curY += splitKet1.length * 5 + 4;

  // Rincian Alasan Ditolak (Text in Red color as per template)
  doc.setTextColor(215, 38, 38);
  const splitAlasan = doc.splitTextToSize(item.alasan_ditolak, boxW - 16);
  doc.text(splitAlasan, boxX + 8, curY);
  curY += splitAlasan.length * 5 + 6;

  // Informasi Negatif (Dibawah Alasan Ditolak)
  const infoNegatif = item.informasi_negatif?.trim() || '-';
  doc.setFont(fontName, 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Informasi Negatif :', boxX + 8, curY);
  curY += 5.5;

  doc.setFont(fontName, 'normal');
  doc.setFontSize(10);
  if (infoNegatif !== '-') {
    doc.setTextColor(215, 38, 38); // Red color for negative findings
  } else {
    doc.setTextColor(100, 100, 100);
  }
  const splitInfoNeg = doc.splitTextToSize(infoNegatif, boxW - 16);
  doc.text(splitInfoNeg, boxX + 8, curY);
  curY += splitInfoNeg.length * 5 + 8;

  // Paragraf Penutup
  doc.setTextColor(0, 0, 0);
  const splitClosing = doc.splitTextToSize(
    'Demikian memo ini kami buat untuk dapat di tindak lanjuti, atas perhatian dan kerjasamanya kami ucapkan terima kasih.',
    boxW - 16
  );
  doc.text(splitClosing, boxX + 8, curY);

  // 4. Signatures Area (Safely inside bottom of the box with ample margin)
  const bottomBox = boxY + boxH; // 293 mm
  const titleY = bottomBox - 14;  // 279 mm (14 mm padding from bottom border)
  const nameY = titleY - 6.5;     // 272.5 mm
  const sigHeaderY = nameY - 26;  // 246.5 mm

  // Column centers
  const col1X = boxX + 32;        // 57 mm
  const col2X = boxX + boxW / 2;  // 107.5 mm
  const col3X = boxX + boxW - 32; // 158 mm

  doc.setFont(fontName, 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);

  doc.text('Mengetahui,', col1X, sigHeaderY, { align: 'center' });
  doc.text('Menyetujui,', col2X, sigHeaderY, { align: 'center' });
  doc.text(`Denpasar, ${tglDitolak}`, col3X, sigHeaderY, { align: 'center' });

  // Left Signature: Pjs. Kabag Analis Kredit
  const nameKabag = 'Gede Cahya Aryadiputra, S.Pd.';
  doc.text(nameKabag, col1X, nameY, { align: 'center' });
  const w1 = doc.getTextWidth(nameKabag);
  doc.line(col1X - w1 / 2, nameY + 0.8, col1X + w1 / 2, nameY + 0.8);
  doc.text('Pjs. Kabag Analis Kredit', col1X, titleY, { align: 'center' });

  // Center Signature: Kepala Cabang / Marketing
  const rawKepala = item.kepala_cabang && item.kepala_cabang !== '-' ? item.kepala_cabang : 'Yudhi Novianto,.S.E';
  doc.text(rawKepala, col2X, nameY, { align: 'center' });
  const w2 = doc.getTextWidth(rawKepala);
  doc.line(col2X - w2 / 2, nameY + 0.8, col2X + w2 / 2, nameY + 0.8);
  doc.text('Marketing', col2X, titleY, { align: 'center' });

  // Right Signature: Analis Kredit
  const rawAnalis = item.analis && item.analis !== '-' ? item.analis : 'I Putu Dimas Adiputra';
  doc.text(rawAnalis, col3X, nameY, { align: 'center' });
  const w3 = doc.getTextWidth(rawAnalis);
  doc.line(col3X - w3 / 2, nameY + 0.8, col3X + w3 / 2, nameY + 0.8);
  doc.text('Analis Kredit', col3X, titleY, { align: 'center' });

  return doc.output('blob');
}

/**
 * Download the generated rejection memo PDF
 */
export async function downloadMemoPenolakanPdf(item: RejectionLogItem): Promise<void> {
  const blob = await generateMemoPenolakanPdf(item);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanNama = (item.nama || 'Nasabah').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanNo = (item.no_permohonan || item.id).replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `Memo_Penolakan_${cleanNama}_${cleanNo}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

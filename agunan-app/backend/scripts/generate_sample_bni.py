#!/usr/bin/env python3
"""
Generator Sample Rekening Koran BNI (Laporan Mutasi Rekening)
============================================================
Sesuai format resmi BNI Laporan Mutasi Rekening
Nasabah: I NYOMAN ABI PRAMANTARA
No. Rekening: 1972911034 (BNI TAPPA)
Periode: 1 November 2025 - 31 Januari 2026 (3 Bulan Penuh)
Cabang: FATMAWATI / DENPASAR
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, String

def create_bni_logo():
    """Membuat logo BNI berbasis teks vektor ReportLab."""
    d = Drawing(90, 24)
    d.add(String(0, 4, "BNI", fontName="Helvetica-Bold", fontSize=22, fillColor=colors.HexColor("#005E6A")))
    d.add(String(48, 11, "•", fontName="Helvetica-Bold", fontSize=18, fillColor=colors.HexColor("#F15A22")))
    return d

def create_bni_header(periode_str: str):
    """Header e-Statement BNI Laporan Mutasi Rekening."""
    title_style = ParagraphStyle(
        'BNITitle',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        alignment=2,
        textColor=colors.HexColor("#0F172A")
    )
    period_style = ParagraphStyle(
        'BNIPeriod',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        alignment=2,
        textColor=colors.HexColor("#475569")
    )

    t = Table(
        [
            [create_bni_logo(), Paragraph("<b>Laporan Mutasi Rekening</b>", title_style)],
            ["", Paragraph(f"Periode: {periode_str}", period_style)]
        ],
        colWidths=[150, 385]
    )
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    return t

def create_bni_meta(cabang="DENPASAR"):
    """Identitas Nasabah & Akun BNI."""
    name_style = ParagraphStyle('BNIName', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor("#0F172A"))
    addr_style = ParagraphStyle('BNIAddr', fontName='Helvetica', fontSize=7, leading=9.5, textColor=colors.HexColor("#334155"))
    acc_style = ParagraphStyle('BNIAcc', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=2, textColor=colors.HexColor("#0F172A"))
    cab_style = ParagraphStyle('BNICab', fontName='Helvetica', fontSize=7.5, leading=10, alignment=2, textColor=colors.HexColor("#334155"))

    data = [
        [
            Paragraph("<b>I NYOMAN ABI PRAMANTARA</b>", name_style),
            Paragraph("<b>BNI TAPPA - 1972911034</b>", acc_style)
        ],
        [
            Paragraph("BR DINAS GADUNGAN DESA 000 000, KEL. GADUNGAN, KEC.<br/>SELEMADEG TIMUR /TABANAN, KAB. TABANAN, BALI", addr_style),
            Paragraph(f"Kantor Cabang: {cabang} • Mata Uang: IDR", cab_style)
        ]
    ]

    t = Table(data, colWidths=[310, 225])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return t

def create_summary_card(saldo_awal, masuk, keluar, saldo_akhir):
    """4-Box Summary Card khas BNI berlatar hijau zaitun / chartreuse lembut."""
    lbl_style = ParagraphStyle('CardLbl', fontName='Helvetica', fontSize=7, leading=9, alignment=1, textColor=colors.HexColor("#1E293B"))
    val_bold = ParagraphStyle('CardVal', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=1, textColor=colors.HexColor("#0F172A"))
    val_masuk = ParagraphStyle('CardIn', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=1, textColor=colors.HexColor("#107C41"))

    data = [
        [
            Paragraph("Saldo Awal", lbl_style),
            Paragraph("Total Pemasukan", lbl_style),
            Paragraph("Total Pengeluaran", lbl_style),
            Paragraph("Saldo Akhir", lbl_style)
        ],
        [
            Paragraph(f"<b>{saldo_awal}</b>", val_bold),
            Paragraph(f"<b>{masuk}</b>", val_masuk),
            Paragraph(f"<b>{keluar}</b>", val_bold),
            Paragraph(f"<b>{saldo_akhir}</b>", val_bold)
        ]
    ]

    t = Table(data, colWidths=[133, 134, 134, 134])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#E2E99B")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 5),
        ('LINEAFTER', (0, 0), (2, -1), 0.5, colors.HexColor("#CBD58A")),
    ]))
    return t

def create_bni_footer(page_num=1, total_pages=7):
    foot_l = ParagraphStyle('BniFootL', fontName='Helvetica', fontSize=5.8, leading=7.5, textColor=colors.HexColor("#94A3B8"))
    foot_r = ParagraphStyle('BniFootR', fontName='Helvetica', fontSize=6.5, leading=8, alignment=2, textColor=colors.HexColor("#94A3B8"))

    t = Table(
        [
            [
                Paragraph("PT Bank Negara Indonesia (Persero) Tbk. berizin dan diawasi oleh Otoritas Jasa Keuangan (OJK) serta merupakan peserta penjaminan Lembaga Penjamin Simpanan (LPS).", foot_l),
                Paragraph(f"{page_num} dari {total_pages}", foot_r)
            ]
        ],
        colWidths=[455, 80]
    )
    t.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 0.4, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return t

def build_bni_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=30,
        rightMargin=30,
        topMargin=20,
        bottomMargin=20
    )

    # Table Header & Cell Styles
    th_style = ParagraphStyle('BNITH', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0F172A"))
    th_right = ParagraphStyle('BNITHR', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=2, textColor=colors.HexColor("#0F172A"))

    td_tgl = ParagraphStyle('BNITgl', fontName='Helvetica', fontSize=7, leading=9, textColor=colors.HexColor("#0F172A"))
    td_title = ParagraphStyle('BNIRemTitle', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=colors.HexColor("#0F172A"))
    td_desc = ParagraphStyle('BNIRemDesc', fontName='Helvetica', fontSize=6, leading=8, textColor=colors.HexColor("#475569"))

    td_pos = ParagraphStyle('BNIPos', fontName='Helvetica-Bold', fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#107C41"))
    td_neg = ParagraphStyle('BNINeg', fontName='Helvetica-Bold', fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#0F172A"))
    td_saldo = ParagraphStyle('BNISaldo', fontName='Helvetica', fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#0F172A"))

    col_widths = [105, 230, 100, 100]

    tx_h = [
        Paragraph("<b>Tanggal & Waktu</b>", th_style),
        Paragraph("<b>Rincian Transaksi</b>", th_style),
        Paragraph("<b>Nominal (IDR)</b>", th_right),
        Paragraph("<b>Saldo (IDR)</b>", th_right),
    ]

    def make_table(rows):
        t = Table([tx_h] + rows, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E99B")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('LINEBELOW', (0, 1), (-1, -1), 0.3, colors.HexColor("#F1F5F9")),
        ]))
        return t

    elements = []

    # ================= BULAN 1: NOVEMBER 2025 =================
    elements.append(create_bni_header("1 - 30 November 2025"))
    elements.append(Spacer(1, 8))
    elements.append(create_bni_meta("FATMAWATI"))
    elements.append(Spacer(1, 10))
    elements.append(create_summary_card("659,977", "+7,772,010", "-8,301,608", "130,379"))
    elements.append(Spacer(1, 10))

    rows_nov = [
        ["", Paragraph("<b>Saldo Awal</b>", td_title), "", Paragraph("659,977", td_saldo)],
        [Paragraph("06 Nov 2025<br/><font color='#64748B'>10:28:10 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>MANDIRI -</font>", td_desc), Paragraph("+473,500", td_pos), Paragraph("1,133,477", td_saldo)],
        [Paragraph("10 Nov 2025<br/><font color='#64748B'>13:49:40 WIB</font>", td_tgl), Paragraph("<b>Virtual Account</b><br/><font color='#475569'>PT NUSA SATU INTI ARTHA - DOKU-AGODA INDONESIA</font>", td_desc), Paragraph("-616,046", td_neg), Paragraph("517,431", td_saldo)],
        [Paragraph("11 Nov 2025<br/><font color='#64748B'>06:43:38 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BRI - I NYOMAN ABI PRAMANT</font>", td_desc), Paragraph("-450,000", td_neg), Paragraph("67,431", td_saldo)],
        [Paragraph("11 Nov 2025<br/><font color='#64748B'>06:43:38 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("64,931", td_saldo)],
        [Paragraph("11 Nov 2025<br/><font color='#64748B'>07:18:54 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BNI - NI KOMANG ARI SUSIANI</font>", td_desc), Paragraph("+620,000", td_pos), Paragraph("684,931", td_saldo)],
        [Paragraph("12 Nov 2025<br/><font color='#64748B'>10:54:13 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BRI - I PUTU BAGUS WIRADIN</font>", td_desc), Paragraph("-300,000", td_neg), Paragraph("384,931", td_saldo)],
        [Paragraph("12 Nov 2025<br/><font color='#64748B'>10:54:13 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("382,431", td_saldo)],
        [Paragraph("13 Nov 2025<br/><font color='#64748B'>14:58:38 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BNI - ROSMILAH</font>", td_desc), Paragraph("+250,000", td_pos), Paragraph("632,431", td_saldo)],
        [Paragraph("14 Nov 2025<br/><font color='#64748B'>11:46:49 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>MANDIRI -</font>", td_desc), Paragraph("+6,428,500", td_pos), Paragraph("7,060,931", td_saldo)],
        [Paragraph("14 Nov 2025<br/><font color='#64748B'>13:57:22 WIB</font>", td_tgl), Paragraph("<b>Pembayaran Qris</b><br/><font color='#475569'>ADI SEDANA UDENG BALI - TABANAN</font>", td_desc), Paragraph("-155,000", td_neg), Paragraph("6,905,931", td_saldo)],
        [Paragraph("14 Nov 2025<br/><font color='#64748B'>16:49:36 WIB</font>", td_tgl), Paragraph("<b>Virtual Account</b><br/><font color='#475569'>PT NUSA SATU INTI ARTHA - DOKU-AGODA INDONESIA</font>", td_desc), Paragraph("-303,513", td_neg), Paragraph("6,602,418", td_saldo)],
        [Paragraph("30 Nov 2025<br/><font color='#64748B'>20:00:00 WIB</font>", td_tgl), Paragraph("<b>Lainnya</b><br/><font color='#475569'>Bunga</font>", td_desc), Paragraph("+10", td_pos), Paragraph("6,602,428", td_saldo)],
        [Paragraph("30 Nov 2025<br/><font color='#64748B'>21:10:00 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>MANDIRI - SITI MUFLIHATUSS</font>", td_desc), Paragraph("-6,471,049", td_neg), Paragraph("131,379", td_saldo)],
        [Paragraph("30 Nov 2025<br/><font color='#64748B'>23:59:59 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Admin Rekening</font>", td_desc), Paragraph("-1,000", td_neg), Paragraph("130,379", td_saldo)],
    ]
    elements.append(make_table(rows_nov))
    elements.append(Spacer(1, 15))
    elements.append(create_bni_footer(1, 3))

    # ================= BULAN 2: DESEMBER 2025 =================
    elements.append(PageBreak())
    elements.append(create_bni_header("1 - 31 Desember 2025"))
    elements.append(Spacer(1, 8))
    elements.append(create_bni_meta("DENPASAR"))
    elements.append(Spacer(1, 10))
    elements.append(create_summary_card("130,379", "+12,920,016", "-8,073,759", "4,976,636"))
    elements.append(Spacer(1, 10))

    rows_des = [
        ["", Paragraph("<b>Saldo Awal</b>", td_title), "", Paragraph("130,379", td_saldo)],
        [Paragraph("05 Dec 2025<br/><font color='#64748B'>15:29:05 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BNI - PEMERINTAH DITJEN PERBENDAHARAAN DEPKEU RI</font>", td_desc), Paragraph("+6,435,000", td_pos), Paragraph("6,565,379", td_saldo)],
        [Paragraph("06 Dec 2025<br/><font color='#64748B'>06:12:49 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BRI - I NYOMAN ABI PRAMANT</font>", td_desc), Paragraph("-1,000,000", td_neg), Paragraph("5,565,379", td_saldo)],
        [Paragraph("06 Dec 2025<br/><font color='#64748B'>06:12:49 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("5,562,879", td_saldo)],
        [Paragraph("07 Dec 2025<br/><font color='#64748B'>20:15:02 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BRI - I MADE GAMI SANDI UN</font>", td_desc), Paragraph("-150,000", td_neg), Paragraph("5,412,879", td_saldo)],
        [Paragraph("07 Dec 2025<br/><font color='#64748B'>20:15:02 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("5,410,379", td_saldo)],
        [Paragraph("08 Dec 2025<br/><font color='#64748B'>11:59:15 WIB</font>", td_tgl), Paragraph("<b>Pembayaran Qris</b><br/><font color='#475569'>KP TABANAN 82100 - TABANAN</font>", td_desc), Paragraph("-170,000", td_neg), Paragraph("5,240,379", td_saldo)],
        [Paragraph("08 Dec 2025<br/><font color='#64748B'>12:31:13 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BNI - I NYOMAN AGUS WAHYU ABADI</font>", td_desc), Paragraph("+50,000", td_pos), Paragraph("5,290,379", td_saldo)],
        [Paragraph("09 Dec 2025<br/><font color='#64748B'>11:24:35 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>MANDIRI - NI LUH GEDE DIAN EKA</font>", td_desc), Paragraph("-1,500,000", td_neg), Paragraph("3,790,379", td_saldo)],
        [Paragraph("09 Dec 2025<br/><font color='#64748B'>11:24:35 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("3,787,879", td_saldo)],
        [Paragraph("10 Dec 2025<br/><font color='#64748B'>18:04:32 WIB</font>", td_tgl), Paragraph("<b>Virtual Account</b><br/><font color='#475569'>SHOPEE-KXXXXI/PXXXXXXXXXXXXXXXXXX</font>", td_desc), Paragraph("-791,659", td_neg), Paragraph("2,996,220", td_saldo)],
        [Paragraph("10 Dec 2025<br/><font color='#64748B'>20:49:24 WIB</font>", td_tgl), Paragraph("<b>Virtual Account</b><br/><font color='#475569'>SHOPEE-KXXXXI/PXXXXXXXXXXXXXXXXXX</font>", td_desc), Paragraph("-31,000", td_neg), Paragraph("2,965,220", td_saldo)],
        [Paragraph("11 Dec 2025<br/><font color='#64748B'>18:46:44 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BNI - NI KOMANG ARI SUSIANI</font>", td_desc), Paragraph("-100,000", td_neg), Paragraph("2,865,220", td_saldo)],
        [Paragraph("12 Dec 2025<br/><font color='#64748B'>22:10:45 WIB</font>", td_tgl), Paragraph("<b>Virtual Account</b><br/><font color='#475569'>PT MEDIA INDONUSA - I NYXXAN AXI PRXXXXXXRA</font>", td_desc), Paragraph("-425,000", td_neg), Paragraph("2,440,220", td_saldo)],
        [Paragraph("13 Dec 2025<br/><font color='#64748B'>08:17:43 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BRI - I MADE GAMI SANDI UN</font>", td_desc), Paragraph("-2,000,000", td_neg), Paragraph("440,220", td_saldo)],
        [Paragraph("13 Dec 2025<br/><font color='#64748B'>08:17:43 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("437,720", td_saldo)],
        [Paragraph("13 Dec 2025<br/><font color='#64748B'>19:06:54 WIB</font>", td_tgl), Paragraph("<b>Pembayaran Qris</b><br/><font color='#475569'>DCREPESLIVING WORLD BAL - BALI</font>", td_desc), Paragraph("-24,000", td_neg), Paragraph("413,720", td_saldo)],
        [Paragraph("13 Dec 2025<br/><font color='#64748B'>19:42:07 WIB</font>", td_tgl), Paragraph("<b>Pembayaran Qris</b><br/><font color='#475569'>SHIGERU LIVING WORLD DENP - DENPASAR (KOT</font>", td_desc), Paragraph("-56,100", td_neg), Paragraph("357,620", td_saldo)],
        [Paragraph("17 Dec 2025<br/><font color='#64748B'>05:01:37 WIB</font>", td_tgl), Paragraph("<b>Pembayaran</b><br/><font color='#475569'>TOKEN LISTRIK - I MADE BADRA SUYASA</font>", td_desc), Paragraph("-200,000", td_neg), Paragraph("157,620", td_saldo)],
        [Paragraph("17 Dec 2025<br/><font color='#64748B'>05:01:37 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>PEMBAYARAN TOKEN LISTRIK</font>", td_desc), Paragraph("-3,500", td_neg), Paragraph("154,120", td_saldo)],
        [Paragraph("20 Dec 2025<br/><font color='#64748B'>14:20:29 WIB</font>", td_tgl), Paragraph("<b>Ewallet</b><br/><font color='#475569'>TOP UP GOPAY 6282145255155</font>", td_desc), Paragraph("-50,000", td_neg), Paragraph("104,120", td_saldo)],
        [Paragraph("20 Dec 2025<br/><font color='#64748B'>14:20:29 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>EWALLET TOP UP GOPAY</font>", td_desc), Paragraph("-1,000", td_neg), Paragraph("103,120", td_saldo)],
        [Paragraph("21 Dec 2025<br/><font color='#64748B'>13:05:26 WIB</font>", td_tgl), Paragraph("<b>Pembayaran Qris</b><br/><font color='#475569'>FORE COFFEE - JAKARTA PUSAT</font>", td_desc), Paragraph("-58,000", td_neg), Paragraph("45,120", td_saldo)],
        [Paragraph("31 Dec 2025<br/><font color='#64748B'>12:30:08 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BNI - PEMERINTAH DITJEN PERBENDAHARAAN DEPKEU RI</font>", td_desc), Paragraph("+6,435,000", td_pos), Paragraph("6,480,120", td_saldo)],
        [Paragraph("31 Dec 2025<br/><font color='#64748B'>14:15:47 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>MANDIRI - NI LUH PUTU SITA DEW</font>", td_desc), Paragraph("-500,000", td_neg), Paragraph("5,980,120", td_saldo)],
        [Paragraph("31 Dec 2025<br/><font color='#64748B'>14:15:47 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("5,977,620", td_saldo)],
        [Paragraph("31 Dec 2025<br/><font color='#64748B'>16:20:19 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BNI - I NYOMAN ABI PRAMANTARA</font>", td_desc), Paragraph("-1,000,000", td_neg), Paragraph("4,977,620", td_saldo)],
        [Paragraph("31 Dec 2025<br/><font color='#64748B'>23:59:59 WIB</font>", td_tgl), Paragraph("<b>Lainnya</b><br/><font color='#475569'>Bunga</font>", td_desc), Paragraph("+16", td_pos), Paragraph("4,977,636", td_saldo)],
        [Paragraph("31 Dec 2025<br/><font color='#64748B'>23:59:59 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Admin Rekening</font>", td_desc), Paragraph("-1,000", td_neg), Paragraph("4,976,636", td_saldo)],
    ]
    elements.append(make_table(rows_des))
    elements.append(Spacer(1, 15))
    elements.append(create_bni_footer(2, 3))

    # ================= BULAN 3: JANUARI 2026 =================
    elements.append(PageBreak())
    elements.append(create_bni_header("1 - 31 Januari 2026"))
    elements.append(Spacer(1, 8))
    elements.append(create_bni_meta("DENPASAR"))
    elements.append(Spacer(1, 10))
    elements.append(create_summary_card("4,976,636", "+0", "-4,931,500", "45,136"))
    elements.append(Spacer(1, 10))

    rows_jan = [
        ["", Paragraph("<b>Saldo Awal</b>", td_title), "", Paragraph("4,976,636", td_saldo)],
        [Paragraph("01 Jan 2026<br/><font color='#64748B'>17:54:22 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BNI - I NYOMAN ABI PRAMANTARA</font>", td_desc), Paragraph("-1,900,000", td_neg), Paragraph("3,076,636", td_saldo)],
        [Paragraph("02 Jan 2026<br/><font color='#64748B'>19:17:23 WIB</font>", td_tgl), Paragraph("<b>Pembayaran</b><br/><font color='#475569'>TOKEN LISTRIK - DRA NI KETUT SERIASIH</font>", td_desc), Paragraph("-100,000", td_neg), Paragraph("2,976,636", td_saldo)],
        [Paragraph("02 Jan 2026<br/><font color='#64748B'>19:17:23 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>PEMBAYARAN TOKEN LISTRIK</font>", td_desc), Paragraph("-3,500", td_neg), Paragraph("2,973,136", td_saldo)],
        [Paragraph("04 Jan 2026<br/><font color='#64748B'>21:30:11 WIB</font>", td_tgl), Paragraph("<b>Pembayaran Qris</b><br/><font color='#475569'>MCDONALD'S SDK 33501 - TABANAN</font>", td_desc), Paragraph("-78,000", td_neg), Paragraph("2,895,136", td_saldo)],
        [Paragraph("11 Jan 2026<br/><font color='#64748B'>19:51:59 WIB</font>", td_tgl), Paragraph("<b>Pembayaran Qris</b><br/><font color='#475569'>2159 ST EG TABANAN - TABANAN</font>", td_desc), Paragraph("-382,000", td_neg), Paragraph("2,513,136", td_saldo)],
        [Paragraph("12 Jan 2026<br/><font color='#64748B'>10:31:18 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BCA - PUTU SUDARSANA</font>", td_desc), Paragraph("-400,000", td_neg), Paragraph("2,113,136", td_saldo)],
        [Paragraph("12 Jan 2026<br/><font color='#64748B'>10:31:18 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("2,110,636", td_saldo)],
        [Paragraph("12 Jan 2026<br/><font color='#64748B'>18:41:22 WIB</font>", td_tgl), Paragraph("<b>Virtual Account</b><br/><font color='#475569'>PT MEDIA INDONUSA - I NYXXAN AXI PRXXXXXXRA</font>", td_desc), Paragraph("-425,000", td_neg), Paragraph("1,685,636", td_saldo)],
        [Paragraph("13 Jan 2026<br/><font color='#64748B'>11:37:05 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BCA - ATRINDO ASIA GLOBAL PT</font>", td_desc), Paragraph("-400,000", td_neg), Paragraph("1,285,636", td_saldo)],
        [Paragraph("13 Jan 2026<br/><font color='#64748B'>11:37:05 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("1,283,136", td_saldo)],
        [Paragraph("14 Jan 2026<br/><font color='#64748B'>09:33:06 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>Mandiri - I PUTU SUMERTA</font>", td_desc), Paragraph("-100,000", td_neg), Paragraph("1,183,136", td_saldo)],
        [Paragraph("14 Jan 2026<br/><font color='#64748B'>09:33:06 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("1,180,636", td_saldo)],
        [Paragraph("14 Jan 2026<br/><font color='#64748B'>14:01:57 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BCA - PUTU AHYUNDASARI WEDYANT</font>", td_desc), Paragraph("-200,000", td_neg), Paragraph("980,636", td_saldo)],
        [Paragraph("14 Jan 2026<br/><font color='#64748B'>14:01:57 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("978,136", td_saldo)],
        [Paragraph("16 Jan 2026<br/><font color='#64748B'>03:24:34 WIB</font>", td_tgl), Paragraph("<b>Pembayaran</b><br/><font color='#475569'>ISI PULSA TELKOMSEL - 082145255155</font>", td_desc), Paragraph("-25,000", td_neg), Paragraph("953,136", td_saldo)],
        [Paragraph("16 Jan 2026<br/><font color='#64748B'>03:24:34 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>PEMBAYARAN ISI PULSA TELKOMSEL</font>", td_desc), Paragraph("-2,000", td_neg), Paragraph("951,136", td_saldo)],
        [Paragraph("20 Jan 2026<br/><font color='#64748B'>16:05:31 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>MANDIRI - SITI MUFLIHATUSS AFI</font>", td_desc), Paragraph("-500,000", td_neg), Paragraph("451,136", td_saldo)],
        [Paragraph("20 Jan 2026<br/><font color='#64748B'>16:05:31 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("448,636", td_saldo)],
        [Paragraph("24 Jan 2026<br/><font color='#64748B'>15:39:46 WIB</font>", td_tgl), Paragraph("<b>Transfer</b><br/><font color='#475569'>BRI - I NYOMAN ABI PRAMANT</font>", td_desc), Paragraph("-400,000", td_neg), Paragraph("48,636", td_saldo)],
        [Paragraph("24 Jan 2026<br/><font color='#64748B'>15:39:46 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Transfer BI-FAST</font>", td_desc), Paragraph("-2,500", td_neg), Paragraph("46,136", td_saldo)],
        [Paragraph("31 Jan 2026<br/><font color='#64748B'>23:59:59 WIB</font>", td_tgl), Paragraph("<b>Biaya</b><br/><font color='#475569'>Admin Rekening</font>", td_desc), Paragraph("-1,000", td_neg), Paragraph("45,136", td_saldo)],
    ]
    elements.append(make_table(rows_jan))
    elements.append(Spacer(1, 10))

    # Informasi Lainnya Box
    disc_title = Paragraph("<b>Informasi Lainnya</b>", ParagraphStyle('BniDiscTitle', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor("#0F172A")))
    disc_text = ParagraphStyle('BniDiscText', fontName='Helvetica', fontSize=6.5, leading=8.5, textColor=colors.HexColor("#334155"))
    elements.append(disc_title)
    elements.append(Spacer(1, 3))
    elements.append(Paragraph("1. Apabila terdapat kesalahan data pada dokumen ini dan tidak dilaporkan hingga 7 hari kerja, nasabah telah dianggap menyetujui seluruh data yang tercantum.", disc_text))
    elements.append(Paragraph("2. BNI dapat sewaktu-waktu melakukan koreksi atau pembaruan data pada dokumen ini.", disc_text))
    elements.append(Paragraph("3. Dokumen ini dibuat oleh sistem dan tidak memerlukan tanda tangan Bank.", disc_text))

    elements.append(Spacer(1, 10))
    elements.append(create_bni_footer(3, 3))

    doc.build(elements)
    print(f"Sample PDF BNI berhasil digenerate di: {output_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_backend = os.path.join(script_dir, "sample_rekening_bni.pdf")
    build_bni_pdf(out_backend)

    frontend_public = os.path.join(script_dir, "..", "..", "frontend", "public")
    if os.path.exists(frontend_public):
        out_frontend = os.path.join(frontend_public, "sample_rekening_bni.pdf")
        build_bni_pdf(out_frontend)

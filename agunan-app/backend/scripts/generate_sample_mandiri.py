#!/usr/bin/env python3
"""
Generator Sample Rekening Koran Bank Mandiri (e-Statement)
=========================================================
Sesuai format resmi e-Statement Bank Mandiri (Persero) Tbk.
Nasabah: I KETUT SUARNA
No. Rekening: 1450017154820
Periode: 31 Jul 2026 - 08 Oct 2026
Cabang: KCP Denpasar Imam Bonjol
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Group, Circle, Wedge

def create_mandiri_logo():
    """Membuat logo Bank Mandiri berbasis vektor ReportLab."""
    d = Drawing(120, 36)
    # Mandiri dark blue wordmark
    d.add(String(0, 10, "mandiri", fontName="Helvetica-Bold", fontSize=22, fillColor=colors.HexColor("#003D79")))
    # Golden arcs above the 'i'
    d.add(Wedge(85, 22, 10, 30, 150, fillColor=colors.HexColor("#FFA800"), strokeColor=None))
    d.add(Wedge(87, 26, 7, 30, 150, fillColor=colors.HexColor("#FFC72C"), strokeColor=None))
    return d

def create_header_bar(page_num=1, total_pages=2):
    """Header e-Statement khas Bank Mandiri dengan ribbon biru dan alamat pusat."""
    styles = getSampleStyleSheet()

    estatement_style = ParagraphStyle(
        'Estatement',
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#003D79")
    )

    address_style = ParagraphStyle(
        'AddressHeader',
        fontName='Helvetica',
        fontSize=6.5,
        leading=8,
        alignment=1, # Center
        textColor=colors.HexColor("#003D79")
    )

    logo = create_mandiri_logo()

    header_table = Table(
        [
            [Paragraph("<b>e-Statement</b>", estatement_style), "", logo],
            ["", Paragraph("Menara Mandiri 1 Jalan Jenderal Sudirman Kav. 54-55, Jakarta 12190, Indonesia", address_style), ""]
        ],
        colWidths=[150, 260, 125]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('SPAN', (1, 1), (1, 1)),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    return header_table

def build_mandiri_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=28,
        rightMargin=28,
        topMargin=20,
        bottomMargin=20
    )

    styles = getSampleStyleSheet()

    lbl_style = ParagraphStyle('Lbl', fontName='Helvetica-Bold', fontSize=7.5, leading=10, textColor=colors.HexColor("#1E293B"))
    lbl_sub = ParagraphStyle('LblSub', fontName='Helvetica-Oblique', fontSize=6.5, leading=9, textColor=colors.HexColor("#64748B"))
    val_style = ParagraphStyle('Val', fontName='Helvetica', fontSize=7.5, leading=10, textColor=colors.HexColor("#0F172A"))
    val_bold = ParagraphStyle('ValBold', fontName='Helvetica-Bold', fontSize=7.5, leading=10, textColor=colors.HexColor("#0F172A"))
    
    # Table Styles
    th_style = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=7, leading=9, alignment=1, textColor=colors.HexColor("#003D79"))
    th_sub = ParagraphStyle('THSub', fontName='Helvetica-Oblique', fontSize=6, leading=8, alignment=1, textColor=colors.HexColor("#003D79"))
    
    td_no = ParagraphStyle('TDNo', fontName='Helvetica', fontSize=7, leading=9, alignment=1, textColor=colors.HexColor("#0F172A"))
    td_tgl = ParagraphStyle('TDTgl', fontName='Helvetica', fontSize=6.8, leading=8.5, textColor=colors.HexColor("#0F172A"))
    td_desc = ParagraphStyle('TDDesc', fontName='Helvetica', fontSize=6.8, leading=8.5, textColor=colors.HexColor("#0F172A"))
    
    td_nom_pos = ParagraphStyle('TDNomPos', fontName='Helvetica-Bold', fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#107C41"))
    td_nom_neg = ParagraphStyle('TDNomNeg', fontName='Helvetica-Bold', fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#0F172A"))
    td_saldo = ParagraphStyle('TDSaldo', fontName='Helvetica', fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#0F172A"))

    elements = []

    # ================= PAGE 1 =================
    elements.append(create_header_bar(1, 2))
    elements.append(Spacer(1, 10))

    # Metadata Grid (Nama, Cabang vs Periode, Cetak, Hal)
    meta_data = [
        [
            Paragraph("<b>Nama</b>/<i>Name</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("<b>I KETUT SUARNA</b>", val_bold),
            Paragraph("<b>Periode</b>/<i>Period</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("31 Jul 2026 - 08 Oct 2026", val_style),
            Paragraph("<b>1 dari 2</b><br/><i>1 of 2</i>", ParagraphStyle('Hal', fontName='Helvetica', fontSize=7, leading=9, alignment=2))
        ],
        [
            Paragraph("<b>Cabang</b>/<i>Branch</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("KCP Denpasar Imam Bonjol", val_style),
            Paragraph("<b>Dicetak pada</b>/<i>Issued on</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("20 Oct 2026", val_style),
            ""
        ]
    ]

    t_meta = Table(meta_data, colWidths=[65, 8, 175, 85, 8, 140, 54])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('SPAN', (6, 0), (6, 1)),
        ('ALIGN', (6, 0), (6, 1), 'RIGHT'),
    ]))
    elements.append(t_meta)
    elements.append(Spacer(1, 12))

    # Account Title & Summary Box
    acc_box_data = [
        [
            Paragraph("<b>Tabungan Mandiri</b>", ParagraphStyle('TabMandiri', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=colors.HexColor("#003D79"))),
            "",
            Paragraph("<b>Saldo Awal</b>/<i>Initial Balance</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("12.188.929,10", ParagraphStyle('SldAwal', fontName='Helvetica', fontSize=7.5, leading=9.5, alignment=2))
        ],
        [
            Paragraph("<b>Nomor Rekening</b>/<i>Account Number</i>", lbl_style),
            Paragraph(": <b>1450017154820</b>", val_style),
            Paragraph("<b>Dana Masuk</b>/<i>Incoming Transactions</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("<b>+ 12.514.546,00</b>", ParagraphStyle('InTx', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=2, textColor=colors.HexColor("#107C41")))
        ],
        [
            Paragraph("<b>Mata Uang</b>/<i>Currency</i>", lbl_style),
            Paragraph(": IDR", val_style),
            Paragraph("<b>Dana Keluar</b>/<i>Outgoing Transactions</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("<b>- 12.508.222,19</b>", ParagraphStyle('OutTx', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=2, textColor=colors.HexColor("#0F172A")))
        ],
        [
            "",
            "",
            Paragraph("<b>Saldo Akhir</b>/<i>Closing Balance</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("<b>12.195.252,91</b>", ParagraphStyle('SldAkhir', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=2))
        ]
    ]

    t_acc = Table(acc_box_data, colWidths=[120, 130, 135, 8, 142])
    t_acc.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('SPAN', (0, 0), (1, 0)),
    ]))
    elements.append(t_acc)
    elements.append(Spacer(1, 14))

    # Transactions Table Page 1 (No 1 to 10)
    tx_headers = [
        Paragraph("<b>No</b><br/><i>No</i>", th_style),
        Paragraph("<b>Tanggal</b><br/><i>Date</i>", th_style),
        Paragraph("<b>Keterangan</b><br/><i>Remarks</i>", ParagraphStyle('THRem', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=colors.HexColor("#003D79"))),
        Paragraph("<b>Nominal (IDR)</b><br/><i>Amount (IDR)</i>", ParagraphStyle('THNom', fontName='Helvetica-Bold', fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#003D79"))),
        Paragraph("<b>Saldo (IDR)</b><br/><i>Balance (IDR)</i>", ParagraphStyle('THSal', fontName='Helvetica-Bold', fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#003D79"))),
    ]

    tx_rows_p1 = [
        [
            Paragraph("1", td_no),
            Paragraph("31 Jul 2026<br/>23:59:00 WIB", td_tgl),
            Paragraph("Biaya administrasi rekening", td_desc),
            Paragraph("-13.000,00", td_nom_neg),
            Paragraph("12.175.929,10", td_saldo)
        ],
        [
            Paragraph("2", td_no),
            Paragraph("04 Aug 2026<br/>05:42:46 WIB", td_tgl),
            Paragraph("Biaya administrasi kartu debit", td_desc),
            Paragraph("-4.000,00", td_nom_neg),
            Paragraph("12.171.929,10", td_saldo)
        ],
        [
            Paragraph("3", td_no),
            Paragraph("09 Aug 2026<br/>00:00:01 WIB", td_tgl),
            Paragraph("Transfer otomatis<br/>DARI 1450017154820 KE 1450017160751", td_desc),
            Paragraph("-200.000,00", td_nom_neg),
            Paragraph("11.971.929,10", td_saldo)
        ],
        [
            Paragraph("4", td_no),
            Paragraph("09 Aug 2026<br/>05:08:02 WIB", td_tgl),
            Paragraph("Pembayaran pinjaman<br/>1450101161582", td_desc),
            Paragraph("-5.931.569,10", td_nom_neg),
            Paragraph("6.040.360,00", td_saldo)
        ],
        [
            Paragraph("5", td_no),
            Paragraph("10 Aug 2026<br/>14:23:54 WIB", td_tgl),
            Paragraph("Transfer BI Fast<br/>Dari BRI<br/>I KETUT SUARNA 463101014215537", td_desc),
            Paragraph("+100.000,00", td_nom_pos),
            Paragraph("6.140.360,00", td_saldo)
        ],
        [
            Paragraph("6", td_no),
            Paragraph("10 Aug 2026<br/>21:47:38 WIB", td_tgl),
            Paragraph("Pembayaran pinjaman<br/>1450101161582", td_desc),
            Paragraph("-8.790,90", td_nom_neg),
            Paragraph("6.131.569,10", td_saldo)
        ],
        [
            Paragraph("7", td_no),
            Paragraph("24 Aug 2026<br/>15:02:23 WIB", td_tgl),
            Paragraph("Transfer antar Mandiri DARI WIND OF CHANGE<br/>TRAVEL TL Fee - July 2026 & Transfer Fee", td_desc),
            Paragraph("+4.973.296,00", td_nom_pos),
            Paragraph("11.104.865,10", td_saldo)
        ],
        [
            Paragraph("8", td_no),
            Paragraph("09 Sep 2026<br/>00:00:01 WIB", td_tgl),
            Paragraph("Transfer otomatis<br/>DARI 1450017154820 KE 1450017160751", td_desc),
            Paragraph("-200.000,00", td_nom_neg),
            Paragraph("10.904.865,10", td_saldo)
        ],
        [
            Paragraph("9", td_no),
            Paragraph("09 Sep 2026<br/>03:01:38 WIB", td_tgl),
            Paragraph("Pembayaran pinjaman<br/>1450101161582", td_desc),
            Paragraph("-4.864.505,10", td_nom_neg),
            Paragraph("6.040.360,00", td_saldo)
        ],
        [
            Paragraph("10", td_no),
            Paragraph("09 Sep 2026<br/>08:29:04 WIB", td_tgl),
            Paragraph("Transfer BI Fast<br/>Dari BRI<br/>I KETUT SUARNA 463101014215537", td_desc),
            Paragraph("+1.200.000,00", td_nom_pos),
            Paragraph("7.240.360,00", td_saldo)
        ],
    ]

    t_table_p1 = Table([tx_headers] + tx_rows_p1, colWidths=[24, 76, 235, 100, 100])
    t_table_p1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F0F7FD")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor("#CBD5E1")),
        ('LINEBELOW', (0, 1), (-1, -1), 0.3, colors.HexColor("#F1F5F9")),
    ]))
    elements.append(t_table_p1)

    # Footer Page 1
    elements.append(Spacer(1, 15))
    footer_text_p1 = Table(
        [
            [
                Paragraph("PT Bank Mandiri (Persero) Tbk. berizin dan diawasi oleh Otoritas Jasa Keuangan (OJK) dan Bank Indonesia (BI),<br/>serta merupakan peserta penjamin Lembaga Penjamin Simpanan (LPS)", ParagraphStyle('FootL', fontName='Helvetica', fontSize=5.5, leading=7, textColor=colors.HexColor("#94A3B8"))),
                Paragraph("Mandiri Call 14000", ParagraphStyle('FootR', fontName='Helvetica', fontSize=6, leading=7.5, alignment=2, textColor=colors.HexColor("#94A3B8")))
            ]
        ],
        colWidths=[435, 100]
    )
    footer_text_p1.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(footer_text_p1)

    # ================= PAGE 2 =================
    elements.append(PageBreak())
    elements.append(create_header_bar(2, 2))
    elements.append(Spacer(1, 10))

    meta_data_p2 = [
        [
            Paragraph("<b>Nama</b>/<i>Name</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("<b>I KETUT SUARNA</b>", val_bold),
            Paragraph("<b>Periode</b>/<i>Period</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("31 Jul 2026 - 08 Oct 2026", val_style),
            Paragraph("<b>2 dari 2</b><br/><i>2 of 2</i>", ParagraphStyle('Hal2', fontName='Helvetica', fontSize=7, leading=9, alignment=2))
        ],
        [
            Paragraph("<b>Cabang</b>/<i>Branch</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("KCP Denpasar Imam Bonjol", val_style),
            Paragraph("<b>Dicetak pada</b>/<i>Issued on</i>", lbl_style),
            Paragraph(":", lbl_style),
            Paragraph("20 Oct 2026", val_style),
            ""
        ]
    ]

    t_meta_p2 = Table(meta_data_p2, colWidths=[65, 8, 175, 85, 8, 140, 54])
    t_meta_p2.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('SPAN', (6, 0), (6, 1)),
        ('ALIGN', (6, 0), (6, 1), 'RIGHT'),
    ]))
    elements.append(t_meta_p2)
    elements.append(Spacer(1, 14))

    # Transactions Table Page 2 (No 11 to 17)
    tx_rows_p2 = [
        [
            Paragraph("11", td_no),
            Paragraph("09 Sep 2026<br/>16:04:47 WIB", td_tgl),
            Paragraph("Biaya administrasi kartu debit", td_desc),
            Paragraph("-4.000,00", td_nom_neg),
            Paragraph("7.236.360,00", td_saldo)
        ],
        [
            Paragraph("12", td_no),
            Paragraph("09 Sep 2026<br/>21:47:26 WIB", td_tgl),
            Paragraph("Pembayaran pinjaman<br/>1450101161582", td_desc),
            Paragraph("-1.075.857,09", td_nom_neg),
            Paragraph("6.160.502,91", td_saldo)
        ],
        [
            Paragraph("13", td_no),
            Paragraph("25 Sep 2026<br/>09:02:53 WIB", td_tgl),
            Paragraph("Transfer antar Mandiri DARI WIND OF CHANGE<br/>TRAVEL TL Fee - Aug 2026 & Transfer Fee", td_desc),
            Paragraph("+4.241.250,00", td_nom_pos),
            Paragraph("10.401.752,91", td_saldo)
        ],
        [
            Paragraph("14", td_no),
            Paragraph("06 Oct 2026<br/>18:28:20 WIB", td_tgl),
            Paragraph("Transfer BI Fast<br/>Dari BCA<br/>NI WAYAN SERIANI 7680754645<br/>Bayar hutang", td_desc),
            Paragraph("+2.000.000,00", td_nom_pos),
            Paragraph("12.401.752,91", td_saldo)
        ],
        [
            Paragraph("15", td_no),
            Paragraph("06 Oct 2026<br/>18:30:01 WIB", td_tgl),
            Paragraph("Biaya transfer BI Fast", td_desc),
            Paragraph("-2.500,00", td_nom_neg),
            Paragraph("12.399.252,91", td_saldo)
        ],
        [
            Paragraph("16", td_no),
            Paragraph("06 Oct 2026<br/>18:30:01 WIB", td_tgl),
            Paragraph("Transfer BI Fast<br/>Ke BRI<br/>I KETUT SUARNA 463101014215537", td_desc),
            Paragraph("-200.000,00", td_nom_neg),
            Paragraph("12.199.252,91", td_saldo)
        ],
        [
            Paragraph("17", td_no),
            Paragraph("07 Oct 2026<br/>05:06:53 WIB", td_tgl),
            Paragraph("Biaya administrasi kartu debit", td_desc),
            Paragraph("-4.000,00", td_nom_neg),
            Paragraph("12.195.252,91", td_saldo)
        ],
    ]

    t_table_p2 = Table([tx_headers] + tx_rows_p2, colWidths=[24, 76, 235, 100, 100])
    t_table_p2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F0F7FD")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor("#CBD5E1")),
        ('LINEBELOW', (0, 1), (-1, -1), 0.3, colors.HexColor("#F1F5F9")),
    ]))
    elements.append(t_table_p2)
    elements.append(Spacer(1, 10))

    # Batas Akhir Transaksi
    elements.append(Paragraph("<i>ini adalah batas akhir transaksi anda</i>", ParagraphStyle('EndTx', fontName='Helvetica-Oblique', fontSize=7.5, leading=10, alignment=1, textColor=colors.HexColor("#334155"))))
    elements.append(Spacer(1, 14))

    # Disclaimer Box
    disc_title = Paragraph("<b>Disclaimer</b>", ParagraphStyle('DiscTitle', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor("#0F172A")))
    disc_style = ParagraphStyle('DiscText', fontName='Helvetica', fontSize=5.8, leading=7.5, textColor=colors.HexColor("#334155"))
    
    disc_items = [
        [
            disc_title
        ],
        [
            Paragraph("1. e-Statement ini merupakan dokumen elektronik bersifat utuh yang dihasilkan oleh sistem Bank Mandiri dan sah digunakan tanpa tanda tangan dari pejabat Bank Mandri./<i>This e-Statement is an electronic document issued by Bank Mandiri system and is valid for use without an official signature from Bank Mandiri.</i>", disc_style)
        ],
        [
            Paragraph("2. Segala bentuk penggunaan e-Statement ini menjadi tanggung jawab Nasabah sepenuhnya./<i>All forms of usage of this e-Statement are the Customer's role responsibility.</i>", disc_style)
        ],
        [
            Paragraph("3. Nasabah dapat mengajukan keberatan atas ketidaksesuaian informasi di e-Statement dalam batas waktu 14 hari kalender. /<i>Customers can submit objections regarding information discrepancies in the e-Statement within 14 calendar days.</i>", disc_style)
        ],
        [
            Paragraph("4. Nasabah tunduk dan terikat pada Syarat dan Ketentuan Livin' yang dapat diakses melalui laman resmi Bank Mandiri./<i>Customers are subject to and bound by the Livin' Term and Conditions which can be accessed via the offical Bank Mandiri website.</i>", disc_style)
        ],
    ]

    t_disc = Table(disc_items, colWidths=[535])
    t_disc.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_disc)

    # Footer Page 2
    elements.append(Spacer(1, 20))
    elements.append(footer_text_p1)

    doc.build(elements)
    print(f"Sample PDF Bank Mandiri berhasil digenerate di: {output_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_backend = os.path.join(script_dir, "sample_rekening_mandiri.pdf")
    build_mandiri_pdf(out_backend)

    # Also copy to frontend public directory
    frontend_public = os.path.join(script_dir, "..", "..", "frontend", "public")
    if os.path.exists(frontend_public):
        out_frontend = os.path.join(frontend_public, "sample_rekening_mandiri.pdf")
        build_mandiri_pdf(out_frontend)

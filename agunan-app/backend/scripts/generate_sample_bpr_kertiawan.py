#!/usr/bin/env python3
"""
Generator Sample Rekening Koran PT. BPR BANK KERTIAWAN
=====================================================
Sesuai format resmi Rekening Koran PT. BPR Bank Kertiawan
Nasabah: I WAYAN ARDIKA
No. Rekening: 1140012990
Periode: 01/07/2026 S/D 12/10/2026
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_bpr_kertiawan_pdf(output_path: str = "sample_rekening_bpr_kertiawan.pdf"):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=25,
        bottomMargin=25
    )

    styles = getSampleStyleSheet()

    title_bank = ParagraphStyle(
        'TitleBank',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.black
    )

    header_meta = ParagraphStyle(
        'HeaderMeta',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.black
    )

    header_meta_right = ParagraphStyle(
        'HeaderMetaRight',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        alignment=2,
        textColor=colors.black
    )

    center_title = ParagraphStyle(
        'CenterTitle',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        alignment=1,
        textColor=colors.black
    )

    cell_text = ParagraphStyle(
        'CellText',
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.black
    )

    cell_desc = ParagraphStyle(
        'CellDesc',
        fontName='Helvetica',
        fontSize=7,
        leading=8.5,
        textColor=colors.black
    )

    cell_num = ParagraphStyle(
        'CellNum',
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        alignment=2,
        textColor=colors.black
    )

    story = []

    # --- Header Information ---
    left_meta = (
        "<b>PT. BPR BANK KERTIAWAN</b><br/>"
        "JL. DHARMA GIRI, BURUAN, BLAHBATUH GIANYAR<br/>"
        "NAMA NASABAH&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: I WAYAN ARDIKA<br/>"
        "ALAMAT NASABAH&nbsp;&nbsp;&nbsp;&nbsp;: BR. KANGINAN BAKBAKAN GIANYAR<br/>"
        "NOMOR REKENING&nbsp;&nbsp;&nbsp;&nbsp;: 1140012990"
    )

    right_meta = (
        "10/12/26 8:17 AM<br/>"
        "HAL&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 1<br/>"
        "OPR&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: DWITA<br/>"
        "KODE_TX&nbsp;&nbsp;&nbsp;: 03506<br/>"
        "&nbsp;"
    )

    header_table = Table(
        [[Paragraph(left_meta, header_meta), Paragraph(right_meta, header_meta_right)]],
        colWidths=[360, 175]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("REKENING KORAN PERIODE 01/07/2026 S/D 12/10/2026", center_title))
    story.append(Spacer(1, 4))

    # Table columns:
    # TANGGAL(55) | TGL_VAL(55) | KD_TX(38) | KETERANGAN(175) | DEBET(68) | KREDIT(68) | SALDO(76) = 535 pt
    col_widths = [54, 54, 36, 183, 68, 68, 72]

    # --- Page 1 Transactions ---
    table_p1_data = [
        [
            Paragraph("<b>TANGGAL</b>", cell_text),
            Paragraph("<b>TGL_VAL</b>", cell_text),
            Paragraph("<b>KD_TX</b>", cell_text),
            Paragraph("<b>KETERANGAN</b>", cell_text),
            Paragraph("<b>DEBET</b>", ParagraphStyle('HNum', parent=cell_num, fontName='Helvetica-Bold')),
            Paragraph("<b>KREDIT</b>", ParagraphStyle('HNum', parent=cell_num, fontName='Helvetica-Bold')),
            Paragraph("<b>SALDO</b>", ParagraphStyle('HNum', parent=cell_num, fontName='Helvetica-Bold')),
        ],
        [
            "", "", "",
            Paragraph("SALDO AWAL .........", cell_text),
            "", "",
            Paragraph("1,416,212.00", cell_num)
        ]
    ]

    p1_rows = [
        ("06/07/2026", "06/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "2,416,212.00"),
        ("07/07/2026", "07/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "3,416,212.00"),
        ("08/07/2026", "08/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "4,416,212.00"),
        ("09/07/2026", "09/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "5,416,212.00"),
        ("10/07/2026", "10/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "6,416,212.00"),
        ("13/07/2026", "13/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "7,416,212.00"),
        ("14/07/2026", "14/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "8,416,212.00"),
        ("15/07/2026", "15/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "9,416,212.00"),
        ("16/07/2026", "16/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "10,416,212.00"),
        ("17/07/2026", "17/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "11,416,212.00"),
        ("20/07/2026", "20/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "12,416,212.00"),
        ("20/07/2026", "20/07/2026", "05621", "BAYAR ANGSURAN PINJAMAN<br/>NOREK 4004004764", "11,000,000.00", "", "1,416,212.00"),
        ("24/07/2026", "24/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "1,516,212.00"),
        ("27/07/2026", "27/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "1,616,212.00"),
        ("28/07/2026", "28/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "1,716,212.00"),
        ("30/07/2026", "30/07/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "1,816,212.00"),
        ("31/07/2026", "31/07/2026", "03000", "Bunga Tabungan", "", "1,202.00", "1,817,414.00"),
        ("31/07/2026", "31/07/2026", "03000", "Pajak Bunga Tabungan", "0.00", "", "1,817,414.00"),
        ("03/08/2026", "03/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "2,817,414.00"),
        ("04/08/2026", "04/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "3,817,414.00"),
        ("05/08/2026", "05/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "4,817,414.00"),
        ("06/08/2026", "06/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "5,817,414.00"),
        ("07/08/2026", "07/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "6,817,414.00"),
        ("11/08/2026", "11/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "7,817,414.00"),
        ("14/08/2026", "14/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "8,817,414.00"),
        ("18/08/2026", "18/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "9,817,414.00"),
        ("24/08/2026", "24/08/2026", "05621", "BAYAR ANGSURAN PINJAMAN<br/>NOREK 4004004764", "2,499,219.00", "", "7,318,195.00"),
        ("24/08/2026", "24/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,200,000.00", "8,518,195.00"),
        ("26/08/2026", "26/08/2026", "05621", "BAYAR ANGSURAN PINJAMAN<br/>NOREK 4004004764", "8,270,835.00", "", "247,360.00"),
        ("26/08/2026", "26/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "347,360.00"),
        ("27/08/2026", "27/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "447,360.00"),
        ("31/08/2026", "31/08/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "1,447,360.00"),
        ("31/08/2026", "31/08/2026", "03000", "Bunga Tabungan", "", "295.00", "1,447,655.00"),
        ("31/08/2026", "31/08/2026", "03000", "Pajak Bunga Tabungan", "0.00", "", "1,447,655.00"),
        ("01/09/2026", "01/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "2,447,655.00"),
        ("07/09/2026", "07/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "3,447,655.00"),
        ("08/09/2026", "08/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "4,447,655.00"),
        ("10/09/2026", "10/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "5,447,655.00"),
        ("14/09/2026", "14/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "6,447,655.00"),
    ]

    for r in p1_rows:
        table_p1_data.append([
            Paragraph(r[0], cell_text),
            Paragraph(r[1], cell_text),
            Paragraph(r[2], cell_text),
            Paragraph(r[3], cell_desc),
            Paragraph(r[4], cell_num),
            Paragraph(r[5], cell_num),
            Paragraph(r[6], cell_num),
        ])

    t1 = Table(table_p1_data, colWidths=col_widths, repeatRows=1)
    t1.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.black),
        ('LINEBELOW', (0, 1), (-1, 1), 0.5, colors.HexColor('#CCCCCC')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 1.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.2),
    ]))
    story.append(t1)

    # --- Page Break to Page 2 ---
    story.append(PageBreak())

    # Header for Page 2
    right_meta_p2 = (
        "10/12/26 8:17 AM<br/>"
        "HAL&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 2<br/>"
        "OPR&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: DWITA<br/>"
        "KODE_TX&nbsp;&nbsp;&nbsp;: 03506<br/>"
        "&nbsp;"
    )
    header_table_p2 = Table(
        [[Paragraph(left_meta, header_meta), Paragraph(right_meta_p2, header_meta_right)]],
        colWidths=[360, 175]
    )
    header_table_p2.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table_p2)
    story.append(Spacer(1, 8))

    table_p2_data = [
        [
            Paragraph("<b>TANGGAL</b>", cell_text),
            Paragraph("<b>TGL_VAL</b>", cell_text),
            Paragraph("<b>KD_TX</b>", cell_text),
            Paragraph("<b>KETERANGAN</b>", cell_text),
            Paragraph("<b>DEBET</b>", ParagraphStyle('HNum2', parent=cell_num, fontName='Helvetica-Bold')),
            Paragraph("<b>KREDIT</b>", ParagraphStyle('HNum2', parent=cell_num, fontName='Helvetica-Bold')),
            Paragraph("<b>SALDO</b>", ParagraphStyle('HNum2', parent=cell_num, fontName='Helvetica-Bold')),
        ]
    ]

    p2_rows = [
        ("15/09/2026", "15/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "7,447,655.00"),
        ("17/09/2026", "17/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "8,447,655.00"),
        ("18/09/2026", "18/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "9,447,655.00"),
        ("21/09/2026", "21/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "10,447,655.00"),
        ("22/09/2026", "22/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "11,447,655.00"),
        ("23/09/2026", "23/09/2026", "05621", "BAYAR ANGSURAN PINJAMAN<br/>NOREK 4004004764", "10,729,168.00", "", "718,487.00"),
        ("23/09/2026", "23/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "818,487.00"),
        ("24/09/2026", "24/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "918,487.00"),
        ("25/09/2026", "25/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "1,018,487.00"),
        ("28/09/2026", "28/09/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "100,000.00", "1,118,487.00"),
        ("30/09/2026", "30/09/2026", "03000", "Bunga Tabungan", "", "672.00", "1,119,159.00"),
        ("30/09/2026", "30/09/2026", "03000", "Pajak Bunga Tabungan", "0.00", "", "1,119,159.00"),
        ("01/10/2026", "01/10/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "2,119,159.00"),
        ("02/10/2026", "02/10/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "3,119,159.00"),
        ("05/10/2026", "05/10/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "4,119,159.00"),
        ("06/10/2026", "06/10/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "5,119,159.00"),
        ("07/10/2026", "07/10/2026", "99700", "Setor Tunai Rekening: 1140012990<br/>[BMS]", "", "1,000,000.00", "6,119,159.00"),
    ]

    for r in p2_rows:
        table_p2_data.append([
            Paragraph(r[0], cell_text),
            Paragraph(r[1], cell_text),
            Paragraph(r[2], cell_text),
            Paragraph(r[3], cell_desc),
            Paragraph(r[4], cell_num),
            Paragraph(r[5], cell_num),
            Paragraph(r[6], cell_num),
        ])

    t2 = Table(table_p2_data, colWidths=col_widths, repeatRows=1)
    t2.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 1.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.2),
    ]))
    story.append(t2)
    story.append(Spacer(1, 10))

    # --- Summary Box at Bottom of Page 2 ---
    summary_data = [
        [
            "", "", "", "",
            Paragraph("<b>32,499,222.00</b>", cell_num),
            Paragraph("<b>37,202,169.00</b>", cell_num),
            Paragraph("<b>6,119,159.00</b>", cell_num)
        ],
        [
            "", "", "",
            Paragraph("Saldo Blokir :", ParagraphStyle('Lbl', parent=cell_num, fontName='Helvetica-Bold')),
            "", "",
            Paragraph("0.00", cell_num)
        ],
        [
            "", "", "",
            Paragraph("Saldo Min :", ParagraphStyle('Lbl', parent=cell_num, fontName='Helvetica-Bold')),
            "", "",
            Paragraph("50,000.00", cell_num)
        ],
        [
            "", "", "",
            Paragraph("Saldo Tersedia :", ParagraphStyle('Lbl', parent=cell_num, fontName='Helvetica-Bold')),
            "", "",
            Paragraph("6,069,159.00", cell_num)
        ]
    ]

    summary_table = Table(summary_data, colWidths=col_widths)
    summary_table.setStyle(TableStyle([
        ('LINEABOVE', (4, 0), (6, 0), 1, colors.black),
        ('LINEBELOW', (4, 0), (6, 0), 1, colors.black),
        ('LINEBELOW', (3, 1), (6, 1), 0.5, colors.HexColor('#888888')),
        ('LINEBELOW', (3, 2), (6, 2), 0.5, colors.HexColor('#888888')),
        ('LINEBELOW', (3, 3), (6, 3), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
    ]))
    story.append(summary_table)

    doc.build(story)
    print(f"Sample PDF BPR Bank Kertiawan berhasil dibuat: {output_path}")
    return True

if __name__ == "__main__":
    out = "sample_rekening_bpr_kertiawan.pdf"
    if len(os.sys.argv) > 1:
        out = os.sys.argv[1]
    generate_bpr_kertiawan_pdf(out)

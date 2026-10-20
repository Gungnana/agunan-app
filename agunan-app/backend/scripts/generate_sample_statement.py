#!/usr/bin/env python3
"""
Generator Dokumen Sampel Rekening Koran (Simulasi Scan)
======================================================
Script ini membuat dokumen PDF atau Gambar simulasi hasil scan rekening koran BCA / BRI
untuk digunakan dalam pengujian PaddleOCR.
"""

import os
import sys

def generate_sample_pdf(output_path: str = "sample_rekening_scan.pdf"):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        print("ReportLab belum terinstall. Silakan install dengan: pip install reportlab")
        return False

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'BankTitle',
        parent=styles['Heading1'],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#003399'),
        fontName='Helvetica-Bold'
    )
    
    header_info_style = ParagraphStyle(
        'HeaderInfo',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        fontName='Helvetica'
    )

    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        fontName='Helvetica'
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        fontName='Helvetica-Bold'
    )

    story = []

    # 1. Header Bank
    story.append(Paragraph("PT BANK CENTRAL ASIA TBK", title_style))
    story.append(Paragraph("REKENING TAHAPAN BCA", ParagraphStyle('Sub', parent=styles['Normal'], fontSize=11, fontName='Helvetica-Bold', textColor=colors.HexColor('#333333'))))
    story.append(Spacer(1, 10))

    # 2. Metadata Nasabah
    meta_data = [
        [
            Paragraph("<b>NAMA NASABAH</b> : I WAYAN SUDIRTA", header_info_style),
            Paragraph("<b>PERIODE</b> : MEI 2024", header_info_style)
        ],
        [
            Paragraph("<b>NO. REKENING</b> : 7720194821", header_info_style),
            Paragraph("<b>MATA UANG</b> : IDR", header_info_style)
        ],
        [
            Paragraph("<b>ALAMAT</b> : JL. GATOT SUBROTO NO. 88, DENPASAR", header_info_style),
            Paragraph("<b>SALDO AWAL</b> : Rp 15.000.000,00", header_info_style)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[300, 220])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))

    # 3. Tabel Mutasi Transaksi
    headers = ["TGL", "KETERANGAN", "CBG", "MUTASI (DB/CR)", "SALDO"]
    table_rows = [[Paragraph(h, cell_bold) for h in headers]]

    sample_txs = [
        ("02/05", "TRSF E-BANKING CR 0205/FTSCY/WS95051 DARI PT MAJU JAYA", "0145", "12.500.000,00 CR", "27.500.000,00"),
        ("04/05", "TARIKAN TUNAI ATM BCA GATSU DENPASAR", "0145", "2.000.000,00 DB", "25.500.000,00"),
        ("07/05", "BIAYA ADM BULANAN", "0145", "15.000,00 DB", "25.485.000,00"),
        ("10/05", "PEMBAYARAN QRIS TOKO BANGUNAN BALI", "0145", "750.000,00 DB", "24.735.000,00"),
        ("15/05", "TRSF KLIRING CR PEMBAYARAN PROYEK VILLA", "0145", "45.000.000,00 CR", "69.735.000,00"),
        ("18/05", "TRANSFER KE REK MANDIRI 1450098231", "0145", "15.000.000,00 DB", "54.735.000,00"),
        ("22/05", "SETORAN TUNAI CDM KCU KUTA", "0145", "5.000.000,00 CR", "59.735.000,00"),
        ("25/05", "DEBET OTOMATIS ANGSURAN PINJAMAN", "0145", "8.250.000,00 DB", "51.485.000,00"),
        ("28/05", "PEMBELIAN PERLENGKAPAN KANTOR VIA EDC", "0145", "1.200.000,00 DB", "50.285.000,00"),
        ("31/05", "BUNGA TABUNGAN & PAJAK BUNGA", "0145", "35.200,00 CR", "50.320.200,00")
    ]

    for tgl, ket, cbg, mutasi, saldo in sample_txs:
        table_rows.append([
            Paragraph(tgl, cell_style),
            Paragraph(ket, cell_style),
            Paragraph(cbg, cell_style),
            Paragraph(mutasi, cell_style),
            Paragraph(saldo, cell_style)
        ])

    col_widths = [45, 230, 40, 105, 100]
    t_tx = Table(table_rows, colWidths=col_widths)
    t_tx.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e6f0fa')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#003399')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('ALIGN', (3,0), (4,-1), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
    ]))
    story.append(t_tx)
    story.append(Spacer(1, 15))

    # 4. Ringkasan Saldo Akhir
    summary_data = [
        [
            Paragraph("<b>TOTAL MUTASI DEBET</b> : Rp 27.215.000,00", header_info_style),
            Paragraph("<b>TOTAL MUTASI KREDIT</b> : Rp 62.535.200,00", header_info_style),
            Paragraph("<b>SALDO AKHIR</b> : Rp 50.320.200,00", header_info_style),
        ]
    ]
    t_sum = Table(summary_data, colWidths=[170, 170, 180])
    t_sum.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f5f5f5')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#bbbbbb')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_sum)

    doc.build(story)
    print(f"✅ Berhasil membuat file PDF sampel: {os.path.abspath(output_path)}")
    return True

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "sample_rekening_scan.pdf"
    generate_sample_pdf(out)

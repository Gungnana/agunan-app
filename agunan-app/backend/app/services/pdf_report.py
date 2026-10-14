import io
from datetime import datetime
from typing import Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)


def format_rupiah(amount: float) -> str:
    """Format angka ke format mata uang Rupiah Indonesia."""
    if amount is None:
        return "Rp 0"
    return f"Rp {amount:,.0f}".replace(",", ".")


def generate_valuation_pdf(
    valuasi_dict: Dict[str, Any],
    agunan_dict: Dict[str, Any],
    pengajuan_dict: Dict[str, Any],
    analyst_name: str,
    reviewer_name: str = "Komite Kredit / Reviewer",
) -> bytes:
    """
    Menghasilkan dokumen PDF resmi 'Lampiran Penilaian Agunan Memorandum Analisa Kredit (MAK)'
    menggunakan ReportLab dengan tata letak profesional perbankan nasional.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,  # Center
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
        alignment=1,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=6,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
    )

    body_bold = ParagraphStyle(
        "BodyDarkBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.whitesmoke,
        alignment=1,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1e293b"),
    )

    table_cell_center = ParagraphStyle(
        "TableCellCenter",
        parent=table_cell_style,
        alignment=1,
    )

    table_cell_right = ParagraphStyle(
        "TableCellRight",
        parent=table_cell_style,
        alignment=2,
    )

    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#64748b"),
    )

    elements = []

    # 1. Header Bank
    bank_header = [
        [
            Paragraph("<b>PT BANK MANDIRI SYARIAH / NASIONAL INDONESIA</b><br/><font size=7 color='#64748b'>DIVISI MANAJEMEN RISIKO KREDIT & PENILAIAN AGUNAN</font>", body_style),
            Paragraph(f"<b>KODE VALUASI:</b> VAL-{valuasi_dict.get('id', 'N/A'):05d}<br/><b>TANGGAL CETAK:</b> {datetime.now().strftime('%d/%m/%Y %H:%M WIB')}", ParagraphStyle("HRight", parent=body_style, alignment=2)),
        ]
    ]
    t_header = Table(bank_header, colWidths=[110 * mm, 70 * mm])
    t_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(t_header)
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=6, spaceBefore=4))

    # 2. Judul Dokumen
    elements.append(Paragraph("LAMPIRAN MEMORANDUM ANALISA KREDIT (MAK)", title_style))
    elements.append(Paragraph("LEMBAR PENILAIAN AGUNAN TANAH BERBASIS DATA PASAR", subtitle_style))
    elements.append(Spacer(1, 4 * mm))

    # 3. Data Pengajuan & Agunan Grid
    pengajuan_data = [
        [
            Paragraph("<b>Nomor Pengajuan:</b>", body_style),
            Paragraph(str(pengajuan_dict.get("nomor_pengajuan", "-")), body_style),
            Paragraph("<b>Kode Agunan:</b>", body_style),
            Paragraph(str(agunan_dict.get("kode_agunan", "-")), body_style),
        ],
        [
            Paragraph("<b>Nama Debitur:</b>", body_style),
            Paragraph(str(pengajuan_dict.get("nama_debitur", "-")), body_bold),
            Paragraph("<b>Jenis Agunan:</b>", body_style),
            Paragraph(f"{agunan_dict.get('jenis_properti', 'TANAH')} ({agunan_dict.get('legalitas', 'SHM')})", body_style),
        ],
        [
            Paragraph("<b>CIF Debitur:</b>", body_style),
            Paragraph(str(pengajuan_dict.get("cif", "-")), body_style),
            Paragraph("<b>Luas Tanah:</b>", body_style),
            Paragraph(f"<b>{agunan_dict.get('luas_tanah', 0):,.0f} m²</b>", body_style),
        ],
        [
            Paragraph("<b>Fasilitas / Plafon:</b>", body_style),
            Paragraph(format_rupiah(pengajuan_dict.get("plafon_diajukan", 0)), body_style),
            Paragraph("<b>Lebar Jalan / Bentuk:</b>", body_style),
            Paragraph(f"{agunan_dict.get('lebar_jalan', 0)} m / {agunan_dict.get('bentuk_tanah', 'PERSEGI')}", body_style),
        ],
        [
            Paragraph("<b>Titik Koordinat:</b>", body_style),
            Paragraph(f"{agunan_dict.get('lat', 0):.6f}, {agunan_dict.get('lon', 0):.6f}", body_style),
            Paragraph("<b>Wilayah Administrasi:</b>", body_style),
            Paragraph(f"{agunan_dict.get('kota_kabupaten', '-')}, {agunan_dict.get('provinsi', '-')}", body_style),
        ],
        [
            Paragraph("<b>Alamat Agunan:</b>", body_style),
            Paragraph(str(agunan_dict.get("alamat", "-")), body_style),
            Paragraph("<b>Status Analisa:</b>", body_style),
            Paragraph(f"<b>{valuasi_dict.get('status', 'COMPLETED')}</b>", body_style),
        ]
    ]

    t_pengajuan = Table(pengajuan_data, colWidths=[38 * mm, 52 * mm, 42 * mm, 48 * mm])
    t_pengajuan.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(t_pengajuan)
    elements.append(Spacer(1, 4 * mm))

    # 4. Ringkasan Eksekutif Hasil Valuasi (Highlight Box)
    elements.append(Paragraph("RINGKASAN INDIKASI NILAI AGUNAN", section_heading))
    
    nilai_pasar = valuasi_dict.get("nilai_pasar", 0)
    nilai_likuidasi = valuasi_dict.get("nilai_likuidasi", 0)
    estimasi_per_m2 = valuasi_dict.get("estimasi_per_m2", 0)
    rentang_min = valuasi_dict.get("rentang_min", 0)
    rentang_max = valuasi_dict.get("rentang_max", 0)
    confidence = valuasi_dict.get("confidence_score", 0)
    haircut = valuasi_dict.get("haircut_persen", 30)

    summary_box_data = [
        [
            Paragraph("<font size=7 color='#64748b'>INDIKASI NILAI PASAR</font><br/><b><font size=11 color='#1e3a8a'>" + format_rupiah(nilai_pasar) + "</font></b>", ParagraphStyle("CBox1", parent=body_style, alignment=1)),
            Paragraph("<font size=7 color='#64748b'>INDIKASI NILAI LIKUIDASI (" + str(haircut) + "% Haircut)</font><br/><b><font size=11 color='#047857'>" + format_rupiah(nilai_likuidasi) + "</font></b>", ParagraphStyle("CBox2", parent=body_style, alignment=1)),
            Paragraph("<font size=7 color='#64748b'>ESTIMASI PER M²</font><br/><b><font size=10 color='#0f172a'>" + format_rupiah(estimasi_per_m2) + "/m²</font></b>", ParagraphStyle("CBox3", parent=body_style, alignment=1)),
            Paragraph("<font size=7 color='#64748b'>CONFIDENCE SCORE</font><br/><b><font size=11 color='#b45309'>" + f"{confidence:.1f} / 100" + "</font></b>", ParagraphStyle("CBox4", parent=body_style, alignment=1)),
        ],
        [
            Paragraph(f"Rentang Nilai Pasar: <b>{format_rupiah(rentang_min)}</b> s/d <b>{format_rupiah(rentang_max)}</b>", body_style),
            Paragraph(f"Radius Efektif: <b>{valuasi_dict.get('radius_efektif_meter', 500)} m</b>", body_style),
            Paragraph(f"Jumlah Pembanding Dipakai: <b>{valuasi_dict.get('jumlah_pembanding_dipakai', 0)}</b> data", body_style),
            Paragraph(f"Versi Engine: <b>{valuasi_dict.get('versi_algoritma', 'v1.0')}</b>", body_style),
        ]
    ]

    t_summary = Table(summary_box_data, colWidths=[45 * mm, 50 * mm, 45 * mm, 40 * mm])
    t_summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#e2e8f0")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(t_summary)
    elements.append(Spacer(1, 4 * mm))

    # 5. Tabel Pembanding Terpilih & Matriks Penyesuaian
    elements.append(Paragraph("DATA PEMBANDING DAN PENYESUAIAN (STANDAR PENILAIAN INDONESIA)", section_heading))

    table_comp_headers = [
        Paragraph("No", table_header_style),
        Paragraph("Sumber / Ref", table_header_style),
        Paragraph("Jarak", table_header_style),
        Paragraph("Harga Asli/m²", table_header_style),
        Paragraph("Diskon Penawaran", table_header_style),
        Paragraph("Net Adj (%)", table_header_style),
        Paragraph("Harga Adjusted/m²", table_header_style),
        Paragraph("Skor", table_header_style),
        Paragraph("Bobot", table_header_style),
    ]

    comp_rows = [table_comp_headers]
    selected_list = valuasi_dict.get("selected_pembanding", [])

    for idx, comp in enumerate(selected_list):
        sumber_text = f"<b>{comp.get('sumber', '-')}</b><br/><font size=6.5 color='#64748b'>{comp.get('kode_referensi', '-')}</font>"
        if comp.get("is_override"):
            sumber_text += "<br/><font size=6 color='#dc2626'>[OVERRIDDEN]</font>"

        jarak_text = f"{comp.get('jarak_meter', 0):.0f} m"
        harga_asli = format_rupiah(comp.get("harga_asli_per_m2", comp.get("harga_per_m2", 0)))
        
        diskon = comp.get("faktor_diskon_penawaran", 0)
        diskon_text = f"-{diskon * 100:.0f}%" if diskon > 0 else "0%"

        net_adj = comp.get("total_penyesuaian_pct", 0) * 100.0
        adj_sign = "+" if net_adj > 0 else ""
        net_adj_text = f"{adj_sign}{net_adj:.1f}%"

        harga_adj = format_rupiah(comp.get("harga_adjusted_per_m2", 0))
        skor = f"{comp.get('skor_akhir', 0):.1f}"
        bobot = f"{comp.get('bobot_kontribusi', 0) * 100:.1f}%"

        comp_rows.append([
            Paragraph(str(idx + 1), table_cell_center),
            Paragraph(sumber_text, table_cell_style),
            Paragraph(jarak_text, table_cell_center),
            Paragraph(harga_asli, table_cell_right),
            Paragraph(diskon_text, table_cell_center),
            Paragraph(net_adj_text, table_cell_center),
            Paragraph(harga_adj, table_cell_right),
            Paragraph(skor, table_cell_center),
            Paragraph(bobot, table_cell_center),
        ])

    t_comp = Table(comp_rows, colWidths=[8 * mm, 34 * mm, 16 * mm, 28 * mm, 18 * mm, 18 * mm, 30 * mm, 14 * mm, 14 * mm])
    t_comp.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    elements.append(t_comp)
    elements.append(Spacer(1, 4 * mm))

    # Catatan Override jika ada
    override_notes = [c.get("alasan_override") for c in selected_list if c.get("is_override") and c.get("alasan_override")]
    if override_notes:
        elements.append(Paragraph(f"<b>Catatan Override Analis:</b> {'; '.join(override_notes)}", ParagraphStyle("OvNote", parent=body_style, textColor=colors.HexColor("#b91c1c"))))
        elements.append(Spacer(1, 3 * mm))

    # 6. Tanda Tangan & Otorisasi
    sign_block = [
        [
            Paragraph("Dianalisa oleh:", table_cell_center),
            Paragraph("Ditinjau & Disetujui oleh:", table_cell_center),
        ],
        [
            Paragraph("<br/><br/><br/><b>" + analyst_name + "</b><br/>Analis Kredit / Penilai Internal", table_cell_center),
            Paragraph("<br/><br/><br/><b>" + reviewer_name + "</b><br/>Credit Reviewer / Pimpinan Unit", table_cell_center),
        ]
    ]
    t_sign = Table(sign_block, colWidths=[90 * mm, 90 * mm])
    t_sign.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("LINEBEFORE", (1, 0), (1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(KeepTogether(t_sign))
    elements.append(Spacer(1, 4 * mm))

    # 7. Disclaimer Wajib Kepatuhan Perbankan
    elements.append(Paragraph(
        "<b>DISCLAIMER HUKUM & KEPATUHAN:</b><br/>"
        "Hasil valuasi agunan ini merupakan indikasi awal nilai pasar yang dihasilkan melalui pemrosesan model "
        "analisa perbandingan data pasar (Market Data Approach) berbasis data internal bank dan data transaksi/penawaran eksternal. "
        "Dokumen ini diterbitkan sebagai alat bantu pengambilan keputusan kredit perbankan dan tidak menggantikan "
        "Laporan Penilaian resmi dari Kantor Jasa Penilai Publik (KJPP) terdaftar Otoritas Jasa Keuangan (OJK) "
        "apabila diwajibkan oleh ketentuan regulasi Bank Indonesia / OJK maupun kebijakan internal perkreditan bank.",
        disclaimer_style,
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.agunan import Agunan
from app.models.parameter import ParameterValuasi
from app.models.valuasi import Valuasi, ValuasiPembanding, ValuasiStatus
from app.schemas.valuasi import (
    ValuasiAnalisaRequest,
    ValuasiOverrideRequest,
    ValuasiResponse,
    ValuasiPembandingDetail,
)
from app.services.comparable_search import search_comparables_incremental
from app.services.valuation_engine import ValuationEngine
from app.services.audit import log_audit_event
from app.services.pdf_report import generate_valuation_pdf

router = APIRouter()


@router.post("/analisa", response_model=ValuasiResponse)
def execute_valuation_analysis(
    req: ValuasiAnalisaRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Eksekusi alur lengkap analisa valuasi agunan berbasis data pasar (Market Data Approach):
    1. Validasi batas geografis Indonesia
    2. Pencarian pembanding bertahap (500m -> 1km -> 2km -> 5km)
    3. Cleansing (deduplikasi, diskon penawaran, filter outlier IQR)
    4. Matriks penyesuaian berbasis parameter aktif
    5. Scoring kemiripan & pembobotan sumber
    6. Pemilihan 2-3 pembanding terbaik & kalkulasi nilai pasar, likuidasi, rentang, confidence score
    7. Penyimpanan snapshot_json untuk audit ulang
    """
    agunan = db.query(Agunan).filter(Agunan.id == req.agunan_id).first()
    if not agunan:
        raise HTTPException(status_code=404, detail="Data agunan tidak ditemukan.")

    # Ambil parameter valuasi aktif
    if req.parameter_id:
        param = db.query(ParameterValuasi).filter(ParameterValuasi.id == req.parameter_id).first()
    else:
        param = db.query(ParameterValuasi).filter(ParameterValuasi.aktif.is_(True)).order_by(ParameterValuasi.id.desc()).first()

    if not param:
        raise HTTPException(
            status_code=500,
            detail="Parameter valuasi aktif belum dikonfigurasi di sistem.",
        )

    ref_date = req.reference_date or date.today()

    # 1. Cari kandidat pembanding bertahap
    raw_candidates, effective_radius = search_comparables_incremental(
        db=db,
        target_lat=agunan.lat,
        target_lon=agunan.lon,
        target_luas=agunan.luas_tanah,
        target_jenis_properti=agunan.jenis_properti.value,
        reference_date=ref_date,
    )

    agunan_data = {
        "id": agunan.id,
        "kode_agunan": agunan.kode_agunan,
        "lat": agunan.lat,
        "lon": agunan.lon,
        "luas_tanah": agunan.luas_tanah,
        "legalitas": agunan.legalitas.value,
        "lebar_jalan": agunan.lebar_jalan,
        "bentuk_tanah": agunan.bentuk_tanah.value,
        "jenis_properti": agunan.jenis_properti.value,
        "alamat": agunan.alamat,
        "kota_kabupaten": agunan.kota_kabupaten,
        "provinsi": agunan.provinsi,
    }

    # 2. Jalankan mesin valuasi murni
    engine_result = ValuationEngine.run_valuation_pipeline(
        agunan_data=agunan_data,
        raw_candidates=raw_candidates,
        parameter_dict=param.parameter_json,
        effective_radius_meters=effective_radius,
        reference_date=ref_date,
    )

    if engine_result.get("status") == "ERROR_VALIDASI":
        raise HTTPException(status_code=400, detail=engine_result.get("pesan"))

    is_data_tidak_cukup = engine_result.get("status") == "DATA_TIDAK_CUKUP"

    # Simpan entitas Valuasi
    valuasi_record = Valuasi(
        agunan_id=agunan.id,
        user_id=current_user.id,
        parameter_id=param.id,
        status=ValuasiStatus.DATA_TIDAK_CUKUP if is_data_tidak_cukup else ValuasiStatus.COMPLETED,
        estimasi_per_m2=engine_result.get("estimasi_per_m2"),
        nilai_pasar=engine_result.get("nilai_pasar"),
        rentang_min=engine_result.get("rentang_min"),
        rentang_max=engine_result.get("rentang_max"),
        nilai_likuidasi=engine_result.get("nilai_likuidasi"),
        haircut_persen=engine_result.get("haircut_persen"),
        confidence_score=engine_result.get("confidence_score"),
        radius_efektif_meter=engine_result.get("radius_efektif_meter", effective_radius),
        jumlah_kandidat=engine_result.get("jumlah_kandidat", len(raw_candidates)),
        jumlah_pembanding_dipakai=engine_result.get("jumlah_pembanding_dipakai", 0),
        versi_algoritma=engine_result.get("versi_algoritma", "v1.2.0-SPI-2026"),
        catatan_analis="Analisa otomatis oleh sistem",
        snapshot_json=engine_result.get("snapshot_json", engine_result),
    )
    db.add(valuasi_record)
    db.commit()
    db.refresh(valuasi_record)

    # Simpan rincian pembanding terpilih jika data cukup
    selected_details = []
    if not is_data_tidak_cukup:
        for comp in engine_result.get("selected_pembanding", []):
            vp = ValuasiPembanding(
                valuasi_id=valuasi_record.id,
                pembanding_id=comp["id"],
                harga_asli_per_m2=comp.get("harga_asli_per_m2", comp["harga_per_m2"]),
                harga_cleansed_per_m2=comp["harga_cleansed_per_m2"],
                faktor_diskon_penawaran=comp.get("faktor_diskon_penawaran", 0.0),
                total_penyesuaian_pct=comp["total_penyesuaian_pct"],
                rincian_penyesuaian_json=comp.get("rincian_penyesuaian", {}),
                harga_adjusted_per_m2=comp["harga_adjusted_per_m2"],
                jarak_meter=comp["jarak_meter"],
                skor_kemiripan=comp["skor_kemiripan"],
                bobot_sumber=comp["bobot_sumber"],
                skor_akhir=comp["skor_akhir"],
                bobot_kontribusi=comp.get("bobot_kontribusi", 0.0),
                is_override=False,
                alasan_override=None,
                urutan=comp.get("urutan", 1),
            )
            db.add(vp)
            db.commit()
            db.refresh(vp)

            selected_details.append(
                ValuasiPembandingDetail(
                    id=vp.id,
                    pembanding_id=comp["id"],
                    kode_referensi=comp.get("kode_referensi"),
                    sumber=comp.get("sumber"),
                    jenis_harga=comp.get("jenis_harga"),
                    alamat=comp.get("alamat"),
                    luas_tanah=comp.get("luas_tanah"),
                    harga_asli_per_m2=vp.harga_asli_per_m2,
                    harga_cleansed_per_m2=vp.harga_cleansed_per_m2,
                    faktor_diskon_penawaran=vp.faktor_diskon_penawaran,
                    total_penyesuaian_pct=vp.total_penyesuaian_pct,
                    rincian_penyesuaian_json=vp.rincian_penyesuaian_json,
                    harga_adjusted_per_m2=vp.harga_adjusted_per_m2,
                    jarak_meter=vp.jarak_meter,
                    skor_kemiripan=vp.skor_kemiripan,
                    bobot_sumber=vp.bobot_sumber,
                    skor_akhir=vp.skor_akhir,
                    bobot_kontribusi=vp.bobot_kontribusi,
                    is_override=False,
                    alasan_override=None,
                    urutan=vp.urutan,
                )
            )

    log_audit_event(
        db,
        action="ANALISA_VALUASI",
        user_id=current_user.id,
        entity_type="valuasi",
        entity_id=valuasi_record.id,
        rincian={
            "agunan_id": agunan.id,
            "status": valuasi_record.status.value,
            "nilai_pasar": valuasi_record.nilai_pasar,
            "confidence_score": valuasi_record.confidence_score,
            "jumlah_pembanding": valuasi_record.jumlah_pembanding_dipakai,
        },
        request=request,
    )

    return ValuasiResponse(
        id=valuasi_record.id,
        agunan_id=valuasi_record.agunan_id,
        user_id=valuasi_record.user_id,
        parameter_id=valuasi_record.parameter_id,
        status=valuasi_record.status,
        estimasi_per_m2=valuasi_record.estimasi_per_m2,
        nilai_pasar=valuasi_record.nilai_pasar,
        rentang_min=valuasi_record.rentang_min,
        rentang_max=valuasi_record.rentang_max,
        nilai_likuidasi=valuasi_record.nilai_likuidasi,
        haircut_persen=valuasi_record.haircut_persen,
        confidence_score=valuasi_record.confidence_score,
        radius_efektif_meter=valuasi_record.radius_efektif_meter,
        jumlah_kandidat=valuasi_record.jumlah_kandidat,
        jumlah_pembanding_dipakai=valuasi_record.jumlah_pembanding_dipakai,
        versi_algoritma=valuasi_record.versi_algoritma,
        catatan_analis=valuasi_record.catatan_analis,
        snapshot_json=valuasi_record.snapshot_json,
        selected_pembanding=selected_details,
        created_at=valuasi_record.created_at,
        updated_at=valuasi_record.updated_at,
    )


@router.post("/{id}/override", response_model=ValuasiResponse)
def override_valuation_comparables(
    id: int,
    override_req: ValuasiOverrideRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengizinkan Analis Kredit mengganti pembanding terpilih dengan pembanding alternatif.
    Field alasan WAJIB (minimal 10 karakter) dan tersimpan di audit log secara permanen.
    """
    valuasi = db.query(Valuasi).filter(Valuasi.id == id).first()
    if not valuasi:
        raise HTTPException(status_code=404, detail="Data valuasi tidak ditemukan.")

    agunan = db.query(Agunan).filter(Agunan.id == valuasi.agunan_id).first()
    param = db.query(ParameterValuasi).filter(ParameterValuasi.id == valuasi.parameter_id).first()

    snapshot = valuasi.snapshot_json or {}
    kandidat_list = snapshot.get("semua_kandidat_terproses", [])

    if not kandidat_list:
        # Jika snapshot tidak memiliki kandidat terproses, cari ulang
        kandidat_list, _ = search_comparables_incremental(
            db=db,
            target_lat=agunan.lat,
            target_lon=agunan.lon,
            target_luas=agunan.luas_tanah,
            target_jenis_properti=agunan.jenis_properti.value,
        )

    agunan_data = {
        "id": agunan.id,
        "kode_agunan": agunan.kode_agunan,
        "lat": agunan.lat,
        "lon": agunan.lon,
        "luas_tanah": agunan.luas_tanah,
        "legalitas": agunan.legalitas.value,
        "lebar_jalan": agunan.lebar_jalan,
        "bentuk_tanah": agunan.bentuk_tanah.value,
        "jenis_properti": agunan.jenis_properti.value,
        "alamat": agunan.alamat,
        "kota_kabupaten": agunan.kota_kabupaten,
        "provinsi": agunan.provinsi,
    }

    # Jalankan engine dengan override
    engine_result = ValuationEngine.run_valuation_pipeline(
        agunan_data=agunan_data,
        raw_candidates=kandidat_list,
        parameter_dict=param.parameter_json,
        effective_radius_meters=valuasi.radius_efektif_meter or 1000,
        override_pembanding_ids=override_req.selected_pembanding_ids,
        override_reason=override_req.alasan,
    )

    if engine_result.get("status") in ["DATA_TIDAK_CUKUP", "ERROR_VALIDASI"]:
        raise HTTPException(status_code=400, detail=engine_result.get("pesan"))

    old_ids = [vp.pembanding_id for vp in valuasi.pembanding_list]

    # Update valuasi
    valuasi.status = ValuasiStatus.OVERRIDDEN
    valuasi.estimasi_per_m2 = engine_result.get("estimasi_per_m2")
    valuasi.nilai_pasar = engine_result.get("nilai_pasar")
    valuasi.rentang_min = engine_result.get("rentang_min")
    valuasi.rentang_max = engine_result.get("rentang_max")
    valuasi.nilai_likuidasi = engine_result.get("nilai_likuidasi")
    valuasi.confidence_score = engine_result.get("confidence_score")
    valuasi.jumlah_pembanding_dipakai = engine_result.get("jumlah_pembanding_dipakai")
    valuasi.catatan_analis = f"Override oleh {current_user.full_name}: {override_req.alasan}"
    valuasi.snapshot_json = engine_result.get("snapshot_json", engine_result)

    # Hapus pembanding lama
    db.query(ValuasiPembanding).filter(ValuasiPembanding.valuasi_id == valuasi.id).delete()

    # Masukkan pembanding baru
    selected_details = []
    for comp in engine_result.get("selected_pembanding", []):
        vp = ValuasiPembanding(
            valuasi_id=valuasi.id,
            pembanding_id=comp["id"],
            harga_asli_per_m2=comp.get("harga_asli_per_m2", comp["harga_per_m2"]),
            harga_cleansed_per_m2=comp["harga_cleansed_per_m2"],
            faktor_diskon_penawaran=comp.get("faktor_diskon_penawaran", 0.0),
            total_penyesuaian_pct=comp["total_penyesuaian_pct"],
            rincian_penyesuaian_json=comp.get("rincian_penyesuaian", {}),
            harga_adjusted_per_m2=comp["harga_adjusted_per_m2"],
            jarak_meter=comp["jarak_meter"],
            skor_kemiripan=comp["skor_kemiripan"],
            bobot_sumber=comp["bobot_sumber"],
            skor_akhir=comp["skor_akhir"],
            bobot_kontribusi=comp.get("bobot_kontribusi", 0.0),
            is_override=True,
            alasan_override=override_req.alasan,
            urutan=comp.get("urutan", 1),
        )
        db.add(vp)
        db.commit()
        db.refresh(vp)

        selected_details.append(
            ValuasiPembandingDetail(
                id=vp.id,
                pembanding_id=comp["id"],
                kode_referensi=comp.get("kode_referensi"),
                sumber=comp.get("sumber"),
                jenis_harga=comp.get("jenis_harga"),
                alamat=comp.get("alamat"),
                luas_tanah=comp.get("luas_tanah"),
                harga_asli_per_m2=vp.harga_asli_per_m2,
                harga_cleansed_per_m2=vp.harga_cleansed_per_m2,
                faktor_diskon_penawaran=vp.faktor_diskon_penawaran,
                total_penyesuaian_pct=vp.total_penyesuaian_pct,
                rincian_penyesuaian_json=vp.rincian_penyesuaian_json,
                harga_adjusted_per_m2=vp.harga_adjusted_per_m2,
                jarak_meter=vp.jarak_meter,
                skor_kemiripan=vp.skor_kemiripan,
                bobot_sumber=vp.bobot_sumber,
                skor_akhir=vp.skor_akhir,
                bobot_kontribusi=vp.bobot_kontribusi,
                is_override=True,
                alasan_override=override_req.alasan,
                urutan=vp.urutan,
            )
        )

    db.commit()
    db.refresh(valuasi)

    # Catat audit log dengan alasan wajib
    log_audit_event(
        db,
        action="OVERRIDE_PEMBANDING",
        user_id=current_user.id,
        entity_type="valuasi",
        entity_id=valuasi.id,
        rincian={
            "pembanding_lama": old_ids,
            "pembanding_baru": override_req.selected_pembanding_ids,
            "alasan": override_req.alasan,
            "nilai_pasar_baru": valuasi.nilai_pasar,
        },
        request=request,
    )

    return ValuasiResponse(
        id=valuasi.id,
        agunan_id=valuasi.agunan_id,
        user_id=valuasi.user_id,
        parameter_id=valuasi.parameter_id,
        status=valuasi.status,
        estimasi_per_m2=valuasi.estimasi_per_m2,
        nilai_pasar=valuasi.nilai_pasar,
        rentang_min=valuasi.rentang_min,
        rentang_max=valuasi.rentang_max,
        nilai_likuidasi=valuasi.nilai_likuidasi,
        haircut_persen=valuasi.haircut_persen,
        confidence_score=valuasi.confidence_score,
        radius_efektif_meter=valuasi.radius_efektif_meter,
        jumlah_kandidat=valuasi.jumlah_kandidat,
        jumlah_pembanding_dipakai=valuasi.jumlah_pembanding_dipakai,
        versi_algoritma=valuasi.versi_algoritma,
        catatan_analis=valuasi.catatan_analis,
        snapshot_json=valuasi.snapshot_json,
        selected_pembanding=selected_details,
        created_at=valuasi.created_at,
        updated_at=valuasi.updated_at,
    )


@router.get("/{id}", response_model=ValuasiResponse)
def get_valuation_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil rincian data hasil valuasi beserta pembanding terpilih dan snapshot audit."""
    valuasi = db.query(Valuasi).filter(Valuasi.id == id).first()
    if not valuasi:
        raise HTTPException(status_code=404, detail="Data valuasi tidak ditemukan.")

    comp_details = []
    for vp in valuasi.pembanding_list:
        comp_details.append(
            ValuasiPembandingDetail(
                id=vp.id,
                pembanding_id=vp.pembanding_id,
                kode_referensi=vp.pembanding.kode_referensi if vp.pembanding else None,
                sumber=vp.pembanding.sumber.value if vp.pembanding else None,
                jenis_harga=vp.pembanding.jenis_harga.value if vp.pembanding else None,
                alamat=vp.pembanding.alamat if vp.pembanding else None,
                luas_tanah=vp.pembanding.luas_tanah if vp.pembanding else None,
                harga_asli_per_m2=vp.harga_asli_per_m2,
                harga_cleansed_per_m2=vp.harga_cleansed_per_m2,
                faktor_diskon_penawaran=vp.faktor_diskon_penawaran,
                total_penyesuaian_pct=vp.total_penyesuaian_pct,
                rincian_penyesuaian_json=vp.rincian_penyesuaian_json,
                harga_adjusted_per_m2=vp.harga_adjusted_per_m2,
                jarak_meter=vp.jarak_meter,
                skor_kemiripan=vp.skor_kemiripan,
                bobot_sumber=vp.bobot_sumber,
                skor_akhir=vp.skor_akhir,
                bobot_kontribusi=vp.bobot_kontribusi,
                is_override=vp.is_override,
                alasan_override=vp.alasan_override,
                urutan=vp.urutan,
            )
        )

    return ValuasiResponse(
        id=valuasi.id,
        agunan_id=valuasi.agunan_id,
        user_id=valuasi.user_id,
        parameter_id=valuasi.parameter_id,
        status=valuasi.status,
        estimasi_per_m2=valuasi.estimasi_per_m2,
        nilai_pasar=valuasi.nilai_pasar,
        rentang_min=valuasi.rentang_min,
        rentang_max=valuasi.rentang_max,
        nilai_likuidasi=valuasi.nilai_likuidasi,
        haircut_persen=valuasi.haircut_persen,
        confidence_score=valuasi.confidence_score,
        radius_efektif_meter=valuasi.radius_efektif_meter,
        jumlah_kandidat=valuasi.jumlah_kandidat,
        jumlah_pembanding_dipakai=valuasi.jumlah_pembanding_dipakai,
        versi_algoritma=valuasi.versi_algoritma,
        catatan_analis=valuasi.catatan_analis,
        snapshot_json=valuasi.snapshot_json,
        selected_pembanding=comp_details,
        created_at=valuasi.created_at,
        updated_at=valuasi.updated_at,
    )


@router.get("/{id}/export-pdf")
def export_valuation_pdf_report(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Menghasilkan lampiran memorandum analisa kredit resmi format PDF
    dengan ReportLab yang berisi rincian agunan, indikasi nilai pasar,
    matriks penyesuaian pembanding, dan disclaimer legal.
    """
    valuasi = db.query(Valuasi).filter(Valuasi.id == id).first()
    if not valuasi:
        raise HTTPException(status_code=404, detail="Data valuasi tidak ditemukan.")

    agunan = valuasi.agunan
    pengajuan = agunan.pengajuan

    valuasi_dict = {
        "id": valuasi.id,
        "status": valuasi.status.value,
        "nilai_pasar": valuasi.nilai_pasar,
        "nilai_likuidasi": valuasi.nilai_likuidasi,
        "estimasi_per_m2": valuasi.estimasi_per_m2,
        "rentang_min": valuasi.rentang_min,
        "rentang_max": valuasi.rentang_max,
        "confidence_score": valuasi.confidence_score,
        "haircut_persen": valuasi.haircut_persen,
        "radius_efektif_meter": valuasi.radius_efektif_meter,
        "jumlah_pembanding_dipakai": valuasi.jumlah_pembanding_dipakai,
        "versi_algoritma": valuasi.versi_algoritma,
        "selected_pembanding": [
            {
                "kode_referensi": vp.pembanding.kode_referensi if vp.pembanding else "-",
                "sumber": vp.pembanding.sumber.value if vp.pembanding else "-",
                "jarak_meter": vp.jarak_meter,
                "harga_asli_per_m2": vp.harga_asli_per_m2,
                "faktor_diskon_penawaran": vp.faktor_diskon_penawaran,
                "total_penyesuaian_pct": vp.total_penyesuaian_pct,
                "harga_adjusted_per_m2": vp.harga_adjusted_per_m2,
                "skor_akhir": vp.skor_akhir,
                "bobot_kontribusi": vp.bobot_kontribusi,
                "is_override": vp.is_override,
                "alasan_override": vp.alasan_override,
            }
            for vp in valuasi.pembanding_list
        ],
    }

    agunan_dict = {
        "kode_agunan": agunan.kode_agunan,
        "jenis_properti": agunan.jenis_properti.value,
        "legalitas": agunan.legalitas.value,
        "luas_tanah": agunan.luas_tanah,
        "lebar_jalan": agunan.lebar_jalan,
        "bentuk_tanah": agunan.bentuk_tanah.value,
        "lat": agunan.lat,
        "lon": agunan.lon,
        "alamat": agunan.alamat,
        "kota_kabupaten": agunan.kota_kabupaten,
        "provinsi": agunan.provinsi,
    }

    pengajuan_dict = {
        "nomor_pengajuan": pengajuan.nomor_pengajuan,
        "nama_debitur": pengajuan.nama_debitur,
        "cif": pengajuan.cif,
        "plafon_diajukan": pengajuan.plafon_diajukan,
    }

    pdf_bytes = generate_valuation_pdf(
        valuasi_dict=valuasi_dict,
        agunan_dict=agunan_dict,
        pengajuan_dict=pengajuan_dict,
        analyst_name=current_user.full_name,
        reviewer_name=pengajuan.reviewer.full_name if pengajuan.reviewer else "Komite Kredit / Reviewer",
    )

    log_audit_event(
        db,
        action="EXPORT_PDF_VALUASI",
        user_id=current_user.id,
        entity_type="valuasi",
        entity_id=valuasi.id,
        rincian={"nomor_pengajuan": pengajuan.nomor_pengajuan},
        request=request,
    )

    filename = f"Lampiran_MAK_Valuasi_{agunan.kode_agunan}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

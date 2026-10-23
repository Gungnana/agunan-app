from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
import logging

from app.schemas.rekap_rekening import RekapRekeningDataSchema
from app.services.ocr_service import process_bank_statement_ocr

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/ocr-parse",
    response_model=RekapRekeningDataSchema,
    summary="Ekstraksi Rekap Rekening Koran dengan PaddleOCR",
    description="Menerima berkas PDF rekening koran (termasuk hasil scan/foto) atau gambar JPG/PNG, memprosesnya dengan model PaddleOCR, dan mengembalikan data rekap 3 bulan terstruktur."
)
async def ocr_parse_bank_statement(
    file: UploadFile = File(..., description="Berkas PDF atau Gambar Rekening Koran"),
    password: Optional[str] = Form(None, description="Password berkas PDF jika terenkripsi")
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Berkas yang diunggah kosong."
            )

        logger.info(f"Menerima berkas untuk OCR: {file.filename} ({len(content)} bytes)")
        result = process_bank_statement_ocr(
            file_bytes=content,
            filename=file.filename or "statement.pdf",
            password=password
        )
        return result
    except ValueError as ve:
        err_msg = str(ve)
        if "PDF_PASSWORD_REQUIRED" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="PDF_PASSWORD_REQUIRED"
            )
        elif "PDF_PASSWORD_INCORRECT" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password PDF yang dimasukkan salah."
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except Exception as e:
        logger.error(f"Error memproses OCR rekening koran: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan saat memproses OCR rekening: {str(e)}"
        )

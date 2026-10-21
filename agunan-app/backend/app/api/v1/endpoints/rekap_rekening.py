import base64
import json
import logging
from typing import Optional
from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile, status
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

GEMINI_PROMPT = """
Anda adalah sistem analis kredit perbankan berakurasi tinggi. 
Tugas Anda adalah membaca dan mengekstrak seluruh data mutasi rekening koran (bank statement) pada dokumen ini secara lengkap, presisi, dan terstruktur.

Ekstrak informasi berikut dalam format JSON:
1. "namaDebitur": Nama lengkap pemilik rekening / nasabah (huruf kapital).
2. "tabBank": Nama bank penerbit (misal: "MANDIRI", "BCA", "BRI", "BNI", "BPD BALI", "BPR BANK KERTIAWAN", dll).
3. "noRek": Nomor rekening tanpa tanda petik atau spasi.
4. "monthsData": Array bulan transaksi (urut kronologis). Tiap elemen berisi:
   - "monthName": Nama bulan dan tahun (misal: "Agustus 2026")
   - "monthNumber": Angka bulan (1-12)
   - "year": Tahun 4 digit (misal: 2026)
   - "saldoAwal": Saldo awal bulan tersebut (angka murni tanpa titik/koma)
   - "saldoAkhir": Saldo akhir bulan tersebut
   - "txs": Array seluruh transaksi pada bulan tersebut. Tiap transaksi memuat:
     * "date": Format "DD/MM" (misal: "04/08")
     * "day": Tanggal 1-31 (integer)
     * "month": Bulan 1-12 (integer)
     * "year": Tahun (integer)
     * "desc": Keterangan transaksi / remarks
     * "isDb": Boolean (true jika uang keluar / debet / penarikan / biaya / tanda minus; false jika uang masuk / kredit / setoran / tanda plus)
     * "amount": Nilai nominal mutasi murni (angka positif, contoh: 200000)
     * "saldo": Saldo setelah transaksi tersebut berjalan

PASTIKAN SEMUA TRANSAKSI TERBACA LENGKAP TANPA ADA YANG TERLEWAT.
HANYA KEMBALIKAN OUTPUT DALAM FORMAT JSON VALID.
"""

@router.post("/extract-ai", summary="Ekstraksi Mutasi Rekening Koran dengan Google Gemini AI")
async def extract_rekening_with_ai(
    file: UploadFile = File(..., description="File PDF atau Gambar Rekening Koran"),
    api_key: Optional[str] = Form(None, description="Google AI Studio API Key (opsional jika sudah disetel di server)"),
    x_gemini_api_key: Optional[str] = Header(None, alias="x-gemini-api-key"),
):
    """
    Mengekstrak data mutasi rekening koran menggunakan Google Gemini Multimodal Vision API.
    Mendukung file e-statement PDF asli maupun gambar/scan foto rekening koran.
    """
    resolved_api_key = api_key or x_gemini_api_key or settings.GEMINI_API_KEY
    if not resolved_api_key or not resolved_api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Google AI Studio API Key belum ditentukan. Silakan masukkan API Key Anda "
                "(Gratis didapatkan di https://aistudio.google.com/) atau setel variabel GEMINI_API_KEY pada environment server."
            ),
        )

    resolved_api_key = resolved_api_key.strip()

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File kosong.")

    # Tentukan mime type
    filename = (file.filename or "").lower()
    if filename.endswith(".pdf"):
        mime_type = "application/pdf"
    elif filename.endswith(".png"):
        mime_type = "image/png"
    elif filename.endswith((".jpg", ".jpeg")):
        mime_type = "image/jpeg"
    elif filename.endswith(".webp"):
        mime_type = "image/webp"
    else:
        # Default PDF
        mime_type = "application/pdf"

    b64_data = base64.b64encode(file_bytes).decode("utf-8")

    # Payload untuk Gemini API
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": b64_data
                        }
                    },
                    {
                        "text": GEMINI_PROMPT
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json"
        }
    }

    last_error = ""

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Dynamic discovery of models supported by this API key
        candidate_models = []
        try:
            list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={resolved_api_key}"
            list_res = await client.get(list_url)
            if list_res.status_code == 200:
                models_data = list_res.json().get("models", [])
                supported = [
                    m["name"].replace("models/", "")
                    for m in models_data
                    if "generateContent" in m.get("supportedGenerationMethods", [])
                ]
                flash_models = [m for m in supported if "flash" in m.lower()]
                other_models = [m for m in supported if "flash" not in m.lower()]
                candidate_models = flash_models + other_models
        except Exception as e:
            logger.warning(f"Gagal mengambil daftar model: {e}")

        if not candidate_models:
            candidate_models = [
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-2.0-flash-exp",
                "gemini-1.5-flash-latest",
                "gemini-1.5-flash",
                "gemini-1.5-pro-latest",
            ]

        for model_name in candidate_models:
            clean_name = model_name.replace("models/", "")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_name}:generateContent?key={resolved_api_key}"
            try:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    resp_json = res.json()
                    candidates = resp_json.get("candidates", [])
                    if not candidates:
                        raise ValueError("Tidak ada kandidat teks yang dikembalikan oleh Gemini.")

                    raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    
                    # Parse JSON
                    clean_json_str = raw_text.strip()
                    if clean_json_str.startswith("```json"):
                        clean_json_str = clean_json_str[7:]
                    if clean_json_str.startswith("```"):
                        clean_json_str = clean_json_str[3:]
                    if clean_json_str.endswith("```"):
                        clean_json_str = clean_json_str[:-3]
                    clean_json_str = clean_json_str.strip()

                    parsed_data = json.loads(clean_json_str)
                    return {
                        "status": "SUCCESS",
                        "model_used": clean_name,
                        "data": parsed_data
                    }
                else:
                    err_msg = res.text
                    last_error = f"{clean_name} error ({res.status_code}): {err_msg}"
                    logger.warning(last_error)
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Gagal memanggil {clean_name}: {last_error}")

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Gagal memproses rekening koran dengan Google Gemini AI. Detail: {last_error}"
    )

from typing import List, Optional
from pydantic import BaseModel, Field

class DailyRecordSchema(BaseModel):
    no: int
    dateStr: str
    day: int
    month: int
    year: int
    debet: Optional[float] = None
    kredit: Optional[float] = None
    saldo: float

class MonthRekapSchema(BaseModel):
    monthIndex: int
    monthName: str
    year: int
    monthNumber: int
    saldoAwal: float
    records: List[DailyRecordSchema] = []

class RekapRekeningDataSchema(BaseModel):
    namaDebitur: str
    tabBank: str
    noRek: str
    months: List[MonthRekapSchema]

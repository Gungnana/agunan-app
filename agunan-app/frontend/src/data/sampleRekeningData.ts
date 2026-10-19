import { RekapRekeningData, MonthStats } from '../types/rekening';

export const SAMPLE_REKAP_DATA: RekapRekeningData = {
  namaDebitur: 'Heriyanto',
  tabBank: 'BCA',
  noRek: '4160641164',
  months: [
    {
      monthIndex: 1,
      monthName: 'Mei 2026',
      year: 2026,
      monthNumber: 5,
      saldoAwal: 1047751,
      records: [
        { no: 1, dateStr: '01-May-26', day: 1, month: 5, year: 2026, debet: null, kredit: 22000, saldo: 1069751 },
        { no: 2, dateStr: '02-May-26', day: 2, month: 5, year: 2026, debet: 5403000, kredit: 4385000, saldo: 51751 },
        { no: 3, dateStr: '03-May-26', day: 3, month: 5, year: 2026, debet: 40000, kredit: 592000, saldo: 603751 },
        { no: 4, dateStr: '04-May-26', day: 4, month: 5, year: 2026, debet: 800000, kredit: 209000, saldo: 12751 },
        { no: 5, dateStr: '05-May-26', day: 5, month: 5, year: 2026, debet: 2502500, kredit: 3176000, saldo: 686251 },
        { no: 6, dateStr: '06-May-26', day: 6, month: 5, year: 2026, debet: 650000, kredit: 201000, saldo: 237251 },
        { no: 7, dateStr: '07-May-26', day: 7, month: 5, year: 2026, debet: 200000, kredit: null, saldo: 37251 },
        { no: 8, dateStr: '08-May-26', day: 8, month: 5, year: 2026, debet: 200000, kredit: 192000, saldo: 29251 },
        { no: 9, dateStr: '09-May-26', day: 9, month: 5, year: 2026, debet: 790000, kredit: 772000, saldo: 11251 },
        { no: 10, dateStr: '10-May-26', day: 10, month: 5, year: 2026, debet: null, kredit: 40000, saldo: 51251 },
        { no: 11, dateStr: '11-May-26', day: 11, month: 5, year: 2026, debet: 15000, kredit: null, saldo: 36251 },
        { no: 12, dateStr: '12-May-26', day: 12, month: 5, year: 2026, debet: null, kredit: null, saldo: 36251 },
        { no: 13, dateStr: '13-May-26', day: 13, month: 5, year: 2026, debet: 4369975, kredit: 4350000, saldo: 16276 },
        { no: 14, dateStr: '14-May-26', day: 14, month: 5, year: 2026, debet: 650000, kredit: 650000, saldo: 16276 },
        { no: 15, dateStr: '15-May-26', day: 15, month: 5, year: 2026, debet: 90000, kredit: 80000, saldo: 6276 },
        { no: 16, dateStr: '16-May-26', day: 16, month: 5, year: 2026, debet: 500000, kredit: 1400000, saldo: 906276 },
        { no: 17, dateStr: '17-May-26', day: 17, month: 5, year: 2026, debet: null, kredit: null, saldo: 906276 },
        { no: 18, dateStr: '18-May-26', day: 18, month: 5, year: 2026, debet: 230000, kredit: 185000, saldo: 861276 },
        { no: 19, dateStr: '19-May-26', day: 19, month: 5, year: 2026, debet: 1345000, kredit: 500000, saldo: 16276 },
        { no: 20, dateStr: '20-May-26', day: 20, month: 5, year: 2026, debet: 150000, kredit: 150000, saldo: 16276 },
        { no: 21, dateStr: '21-May-26', day: 21, month: 5, year: 2026, debet: 1100000, kredit: 1140000, saldo: 56276 },
        { no: 22, dateStr: '22-May-26', day: 22, month: 5, year: 2026, debet: 890000, kredit: 850000, saldo: 16276 },
        { no: 23, dateStr: '23-May-26', day: 23, month: 5, year: 2026, debet: 500000, kredit: 500000, saldo: 16276 },
        { no: 24, dateStr: '24-May-26', day: 24, month: 5, year: 2026, debet: null, kredit: null, saldo: 16276 },
        { no: 25, dateStr: '25-May-26', day: 25, month: 5, year: 2026, debet: 500000, kredit: 500000, saldo: 16276 },
        { no: 26, dateStr: '26-May-26', day: 26, month: 5, year: 2026, debet: 500000, kredit: 500000, saldo: 16276 },
        { no: 27, dateStr: '27-May-26', day: 27, month: 5, year: 2026, debet: 1145939, kredit: 1200000, saldo: 70337 },
        { no: 28, dateStr: '28-May-26', day: 28, month: 5, year: 2026, debet: 750000, kredit: 700000, saldo: 20337 },
        { no: 29, dateStr: '29-May-26', day: 29, month: 5, year: 2026, debet: 170000, kredit: 165000, saldo: 15337 },
        { no: 30, dateStr: '30-May-26', day: 30, month: 5, year: 2026, debet: 120000, kredit: 115000, saldo: 10337 },
        { no: 31, dateStr: '31-May-26', day: 31, month: 5, year: 2026, debet: 2000000, kredit: 2000000, saldo: 10337 },
      ],
    },
    {
      monthIndex: 2,
      monthName: 'Juni 2026',
      year: 2026,
      monthNumber: 6,
      saldoAwal: 10337,
      records: [
        { no: 1, dateStr: '01-Jun-26', day: 1, month: 6, year: 2026, debet: 10000, kredit: null, saldo: 337 },
        { no: 2, dateStr: '02-Jun-26', day: 2, month: 6, year: 2026, debet: null, kredit: 200000, saldo: 200337 },
        { no: 3, dateStr: '03-Jun-26', day: 3, month: 6, year: 2026, debet: 190000, kredit: null, saldo: 10337 },
        { no: 4, dateStr: '04-Jun-26', day: 4, month: 6, year: 2026, debet: 1010000, kredit: 1350000, saldo: 350337 },
        { no: 5, dateStr: '05-Jun-26', day: 5, month: 6, year: 2026, debet: 410000, kredit: 70000, saldo: 10337 },
        { no: 6, dateStr: '06-Jun-26', day: 6, month: 6, year: 2026, debet: 195000, kredit: 195000, saldo: 10337 },
        { no: 7, dateStr: '07-Jun-26', day: 7, month: 6, year: 2026, debet: null, kredit: 195000, saldo: 205337 },
        { no: 8, dateStr: '08-Jun-26', day: 8, month: 6, year: 2026, debet: null, kredit: null, saldo: 205337 },
        { no: 9, dateStr: '09-Jun-26', day: 9, month: 6, year: 2026, debet: 450000, kredit: 300000, saldo: 55337 },
        { no: 10, dateStr: '10-Jun-26', day: 10, month: 6, year: 2026, debet: 400000, kredit: 400000, saldo: 55337 },
        { no: 11, dateStr: '11-Jun-26', day: 11, month: 6, year: 2026, debet: 475000, kredit: 430000, saldo: 10337 },
        { no: 12, dateStr: '12-Jun-26', day: 12, month: 6, year: 2026, debet: 4670000, kredit: 4700000, saldo: 40337 },
        { no: 13, dateStr: '13-Jun-26', day: 13, month: 6, year: 2026, debet: 255000, kredit: 225000, saldo: 10337 },
        { no: 14, dateStr: '14-Jun-26', day: 14, month: 6, year: 2026, debet: 545000, kredit: 545000, saldo: 10337 },
        { no: 15, dateStr: '15-Jun-26', day: 15, month: 6, year: 2026, debet: 1250000, kredit: 1250000, saldo: 10337 },
        { no: 16, dateStr: '16-Jun-26', day: 16, month: 6, year: 2026, debet: 285000, kredit: 285000, saldo: 10337 },
        { no: 17, dateStr: '17-Jun-26', day: 17, month: 6, year: 2026, debet: 800000, kredit: 3600000, saldo: 2810337 },
        { no: 18, dateStr: '18-Jun-26', day: 18, month: 6, year: 2026, debet: 2800000, kredit: null, saldo: 10337 },
        { no: 19, dateStr: '19-Jun-26', day: 19, month: 6, year: 2026, debet: 649000, kredit: 650000, saldo: 11337 },
        { no: 20, dateStr: '20-Jun-26', day: 20, month: 6, year: 2026, debet: 5000000, kredit: 5300000, saldo: 311337 },
        { no: 21, dateStr: '21-Jun-26', day: 21, month: 6, year: 2026, debet: null, kredit: null, saldo: 311337 },
        { no: 22, dateStr: '22-Jun-26', day: 22, month: 6, year: 2026, debet: null, kredit: null, saldo: 311337 },
        { no: 23, dateStr: '23-Jun-26', day: 23, month: 6, year: 2026, debet: null, kredit: null, saldo: 311337 },
        { no: 24, dateStr: '24-Jun-26', day: 24, month: 6, year: 2026, debet: 250000, kredit: 250000, saldo: 311337 },
        { no: 25, dateStr: '25-Jun-26', day: 25, month: 6, year: 2026, debet: null, kredit: null, saldo: 311337 },
        { no: 26, dateStr: '26-Jun-26', day: 26, month: 6, year: 2026, debet: null, kredit: null, saldo: 311337 },
        { no: 27, dateStr: '27-Jun-26', day: 27, month: 6, year: 2026, debet: null, kredit: null, saldo: 311337 },
        { no: 28, dateStr: '28-Jun-26', day: 28, month: 6, year: 2026, debet: null, kredit: null, saldo: 311337 },
        { no: 29, dateStr: '29-Jun-26', day: 29, month: 6, year: 2026, debet: null, kredit: null, saldo: 311337 },
        { no: 30, dateStr: '30-Jun-26', day: 30, month: 6, year: 2026, debet: 1190000, kredit: 890000, saldo: 11337 },
      ],
    },
    {
      monthIndex: 3,
      monthName: 'Juli 2026',
      year: 2026,
      monthNumber: 7,
      saldoAwal: 11337,
      records: [
        { no: 1, dateStr: '01-Jul-26', day: 1, month: 7, year: 2026, debet: 10000, kredit: null, saldo: 1337 },
        { no: 2, dateStr: '02-Jul-26', day: 2, month: 7, year: 2026, debet: 75000, kredit: 85000, saldo: 11337 },
        { no: 3, dateStr: '03-Jul-26', day: 3, month: 7, year: 2026, debet: 1800000, kredit: 1800000, saldo: 11337 },
        { no: 4, dateStr: '04-Jul-26', day: 4, month: 7, year: 2026, debet: null, kredit: 540000, saldo: 551337 },
        { no: 5, dateStr: '05-Jul-26', day: 5, month: 7, year: 2026, debet: 1858660, kredit: 11845000, saldo: 10537677 },
        { no: 6, dateStr: '06-Jul-26', day: 6, month: 7, year: 2026, debet: null, kredit: null, saldo: 10537677 },
        { no: 7, dateStr: '07-Jul-26', day: 7, month: 7, year: 2026, debet: 302500, kredit: null, saldo: 10235177 },
        { no: 8, dateStr: '08-Jul-26', day: 8, month: 7, year: 2026, debet: 222500, kredit: 170000, saldo: 10182677 },
        { no: 9, dateStr: '09-Jul-26', day: 9, month: 7, year: 2026, debet: null, kredit: null, saldo: 10182677 },
        { no: 10, dateStr: '10-Jul-26', day: 10, month: 7, year: 2026, debet: 150000, kredit: null, saldo: 10032677 },
        { no: 11, dateStr: '11-Jul-26', day: 11, month: 7, year: 2026, debet: null, kredit: null, saldo: 10032677 },
        { no: 12, dateStr: '12-Jul-26', day: 12, month: 7, year: 2026, debet: null, kredit: null, saldo: 10032677 },
        { no: 13, dateStr: '13-Jul-26', day: 13, month: 7, year: 2026, debet: 5182500, kredit: null, saldo: 4850177 },
        { no: 14, dateStr: '14-Jul-26', day: 14, month: 7, year: 2026, debet: null, kredit: null, saldo: 4850177 },
        { no: 15, dateStr: '15-Jul-26', day: 15, month: 7, year: 2026, debet: null, kredit: null, saldo: 4850177 },
        { no: 16, dateStr: '16-Jul-26', day: 16, month: 7, year: 2026, debet: 2615000, kredit: 2000000, saldo: 4235177 },
        { no: 17, dateStr: '17-Jul-26', day: 17, month: 7, year: 2026, debet: null, kredit: null, saldo: 4235177 },
        { no: 18, dateStr: '18-Jul-26', day: 18, month: 7, year: 2026, debet: null, kredit: null, saldo: 4235177 },
        { no: 19, dateStr: '19-Jul-26', day: 19, month: 7, year: 2026, debet: null, kredit: null, saldo: 4235177 },
        { no: 20, dateStr: '20-Jul-26', day: 20, month: 7, year: 2026, debet: 2031583, kredit: null, saldo: 2203594 },
        { no: 21, dateStr: '21-Jul-26', day: 21, month: 7, year: 2026, debet: 350000, kredit: null, saldo: 1853594 },
        { no: 22, dateStr: '22-Jul-26', day: 22, month: 7, year: 2026, debet: null, kredit: null, saldo: 1853594 },
        { no: 23, dateStr: '23-Jul-26', day: 23, month: 7, year: 2026, debet: 405000, kredit: null, saldo: 1448594 },
        { no: 24, dateStr: '24-Jul-26', day: 24, month: 7, year: 2026, debet: null, kredit: null, saldo: 1448594 },
        { no: 25, dateStr: '25-Jul-26', day: 25, month: 7, year: 2026, debet: 2417500, kredit: 2000000, saldo: 1031094 },
        { no: 26, dateStr: '26-Jul-26', day: 26, month: 7, year: 2026, debet: 100000, kredit: null, saldo: 931094 },
        { no: 27, dateStr: '27-Jul-26', day: 27, month: 7, year: 2026, debet: 410000, kredit: null, saldo: 521094 },
        { no: 28, dateStr: '28-Jul-26', day: 28, month: 7, year: 2026, debet: 400000, kredit: 1000000, saldo: 1121094 },
        { no: 29, dateStr: '29-Jul-26', day: 29, month: 7, year: 2026, debet: 1000000, kredit: 1600000, saldo: 1721094 },
        { no: 30, dateStr: '30-Jul-26', day: 30, month: 7, year: 2026, debet: 1150000, kredit: null, saldo: 571094 },
        { no: 31, dateStr: '31-Jul-26', day: 31, month: 7, year: 2026, debet: null, kredit: 105, saldo: 571199 },
      ],
    },
  ],
};

export function calculateMonthStats(records: RekapRekeningData['months'][0]['records']): MonthStats {
  let totalMutasiKredit = 0;
  let totalMutasiDebet = 0;
  let jumlahMutasiKredit = 0;
  let jumlahMutasiDebet = 0;
  let saldoTertinggi = -Infinity;
  let saldoTerendah = Infinity;
  let sumSaldo = 0;

  records.forEach((r) => {
    if (r.kredit && r.kredit > 0) {
      totalMutasiKredit += r.kredit;
      jumlahMutasiKredit += 1;
    }
    if (r.debet && r.debet > 0) {
      totalMutasiDebet += r.debet;
      jumlahMutasiDebet += 1;
    }
    if (r.saldo > saldoTertinggi) saldoTertinggi = r.saldo;
    if (r.saldo < saldoTerendah) saldoTerendah = r.saldo;
    sumSaldo += r.saldo;
  });

  const count = records.length;
  const rataRataSaldo = count > 0 ? Math.round(sumSaldo / count) : 0;

  return {
    totalMutasiKredit,
    totalMutasiDebet,
    jumlahMutasiKredit,
    jumlahMutasiDebet,
    saldoTertinggi: saldoTertinggi === -Infinity ? 0 : saldoTertinggi,
    saldoTerendah: saldoTerendah === Infinity ? 0 : saldoTerendah,
    rataRataSaldo,
  };
}

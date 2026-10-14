"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-12 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('ANALIS', 'REVIEWER', 'ADMIN', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. Pengajuan Table
    op.create_table(
        'pengajuan',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nomor_pengajuan', sa.String(length=50), nullable=False),
        sa.Column('nama_debitur', sa.String(length=150), nullable=False),
        sa.Column('cif', sa.String(length=30), nullable=False),
        sa.Column('plafon_diajukan', sa.Float(), nullable=False),
        sa.Column('jenis_kredit', sa.String(length=50), nullable=False),
        sa.Column('status', sa.Enum('DRAFT', 'PROSES_ANALISA', 'MENUNGGU_REVIEW', 'DISETUJUI', 'DITOLAK', name='pengajuanstatus'), nullable=False),
        sa.Column('analyst_id', sa.Integer(), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['analyst_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_pengajuan_id'), 'pengajuan', ['id'], unique=False)
    op.create_index(op.f('ix_pengajuan_nomor_pengajuan'), 'pengajuan', ['nomor_pengajuan'], unique=True)

    # 3. Agunan Table
    op.create_table(
        'agunan',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pengajuan_id', sa.Integer(), nullable=False),
        sa.Column('kode_agunan', sa.String(length=50), nullable=False),
        sa.Column('jenis_properti', sa.Enum('TANAH', 'TANAH_BANGUNAN', name='jenisproperti'), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lon', sa.Float(), nullable=False),
        sa.Column('alamat', sa.Text(), nullable=False),
        sa.Column('kelurahan', sa.String(length=100), nullable=True),
        sa.Column('kecamatan', sa.String(length=100), nullable=True),
        sa.Column('kota_kabupaten', sa.String(length=100), nullable=False),
        sa.Column('provinsi', sa.String(length=100), nullable=False),
        sa.Column('luas_tanah', sa.Float(), nullable=False),
        sa.Column('legalitas', sa.Enum('SHM', 'HGB', 'GIRIK', 'LAINNYA', name='legalitastanah'), nullable=False),
        sa.Column('lebar_jalan', sa.Float(), nullable=False),
        sa.Column('bentuk_tanah', sa.Enum('PERSEGI', 'PERSEGI_PANJANG', 'KANTONG_SEMAR', 'TIDAK_BERATURAN', 'L', name='bentuktanah'), nullable=False),
        sa.Column('nilai_perolehan', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pengajuan_id'], ['pengajuan.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_agunan_id'), 'agunan', ['id'], unique=False)
    op.create_index(op.f('ix_agunan_kode_agunan'), 'agunan', ['kode_agunan'], unique=True)
    op.create_index(op.f('ix_agunan_lat'), 'agunan', ['lat'], unique=False)
    op.create_index(op.f('ix_agunan_lon'), 'agunan', ['lon'], unique=False)

    # 4. Parameter Valuasi Table
    op.create_table(
        'parameter_valuasi',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('versi', sa.String(length=50), nullable=False),
        sa.Column('judul', sa.String(length=150), nullable=False),
        sa.Column('berlaku_dari', sa.Date(), nullable=False),
        sa.Column('aktif', sa.Boolean(), nullable=False, default=True),
        sa.Column('parameter_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_parameter_valuasi_id'), 'parameter_valuasi', ['id'], unique=False)
    op.create_index(op.f('ix_parameter_valuasi_versi'), 'parameter_valuasi', ['versi'], unique=True)

    # 5. Pembanding Table (Canonical)
    op.create_table(
        'pembanding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('kode_referensi', sa.String(length=50), nullable=False),
        sa.Column('sumber', sa.Enum('LELANG', 'APPRAISAL_KJPP', 'APPRAISAL_INTERNAL', 'SURVEI', 'LISTING', name='sumberdata'), nullable=False),
        sa.Column('jenis_harga', sa.Enum('TRANSAKSI', 'PENAWARAN', 'LIKUIDASI', 'NILAI_PASAR', name='jenisharga'), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lon', sa.Float(), nullable=False),
        sa.Column('alamat', sa.Text(), nullable=False),
        sa.Column('kota_kabupaten', sa.String(length=100), nullable=False),
        sa.Column('provinsi', sa.String(length=100), nullable=False),
        sa.Column('luas_tanah', sa.Float(), nullable=False),
        sa.Column('harga_total', sa.Float(), nullable=False),
        sa.Column('harga_per_m2', sa.Float(), nullable=False),
        sa.Column('tanggal_data', sa.Date(), nullable=False),
        sa.Column('legalitas', sa.Enum('SHM', 'HGB', 'GIRIK', 'LAINNYA', name='legalitastanah'), nullable=False),
        sa.Column('lebar_jalan', sa.Float(), nullable=False),
        sa.Column('bentuk_tanah', sa.Enum('PERSEGI', 'PERSEGI_PANJANG', 'KANTONG_SEMAR', 'TIDAK_BERATURAN', 'L', name='bentuktanah'), nullable=False),
        sa.Column('jenis_properti', sa.Enum('TANAH', 'TANAH_BANGUNAN', name='jenisproperti'), nullable=False),
        sa.Column('kualitas_geocode', sa.Enum('SANGAT_AKURAT', 'AKURAT', 'ESTIMASI', 'KELURAHAN', name='kualitasgeocode'), nullable=False),
        sa.Column('status_valid', sa.Boolean(), nullable=False, default=True),
        sa.Column('catatan', sa.Text(), nullable=True),
        sa.Column('atribut_lain', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_pembanding_id'), 'pembanding', ['id'], unique=False)
    op.create_index(op.f('ix_pembanding_kode_referensi'), 'pembanding', ['kode_referensi'], unique=True)
    # Composite Indexes
    op.create_index('idx_pembanding_lat_lon', 'pembanding', ['lat', 'lon'], unique=False)
    op.create_index('idx_pembanding_filter', 'pembanding', ['jenis_properti', 'status_valid', 'tanggal_data'], unique=False)

    # 6. Valuasi Table
    op.create_table(
        'valuasi',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agunan_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('parameter_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('COMPLETED', 'OVERRIDDEN', 'DATA_TIDAK_CUKUP', 'DRAFT', name='valuasistatus'), nullable=False),
        sa.Column('estimasi_per_m2', sa.Float(), nullable=True),
        sa.Column('nilai_pasar', sa.Float(), nullable=True),
        sa.Column('rentang_min', sa.Float(), nullable=True),
        sa.Column('rentang_max', sa.Float(), nullable=True),
        sa.Column('nilai_likuidasi', sa.Float(), nullable=True),
        sa.Column('haircut_persen', sa.Float(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('radius_efektif_meter', sa.Integer(), nullable=True),
        sa.Column('jumlah_kandidat', sa.Integer(), nullable=False, default=0),
        sa.Column('jumlah_pembanding_dipakai', sa.Integer(), nullable=False, default=0),
        sa.Column('versi_algoritma', sa.String(length=50), nullable=False),
        sa.Column('catatan_analis', sa.Text(), nullable=True),
        sa.Column('snapshot_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['agunan_id'], ['agunan.id'], ),
        sa.ForeignKeyConstraint(['parameter_id'], ['parameter_valuasi.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_valuasi_id'), 'valuasi', ['id'], unique=False)

    # 7. Valuasi Pembanding Table
    op.create_table(
        'valuasi_pembanding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('valuasi_id', sa.Integer(), nullable=False),
        sa.Column('pembanding_id', sa.Integer(), nullable=False),
        sa.Column('harga_asli_per_m2', sa.Float(), nullable=False),
        sa.Column('harga_cleansed_per_m2', sa.Float(), nullable=False),
        sa.Column('faktor_diskon_penawaran', sa.Float(), nullable=False, default=0.0),
        sa.Column('total_penyesuaian_pct', sa.Float(), nullable=False),
        sa.Column('rincian_penyesuaian_json', sa.JSON(), nullable=False),
        sa.Column('harga_adjusted_per_m2', sa.Float(), nullable=False),
        sa.Column('jarak_meter', sa.Float(), nullable=False),
        sa.Column('skor_kemiripan', sa.Float(), nullable=False),
        sa.Column('bobot_sumber', sa.Float(), nullable=False),
        sa.Column('skor_akhir', sa.Float(), nullable=False),
        sa.Column('bobot_kontribusi', sa.Float(), nullable=False),
        sa.Column('is_override', sa.Boolean(), nullable=False, default=False),
        sa.Column('alasan_override', sa.Text(), nullable=True),
        sa.Column('urutan', sa.Integer(), nullable=False, default=1),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['pembanding_id'], ['pembanding.id'], ),
        sa.ForeignKeyConstraint(['valuasi_id'], ['valuasi.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_valuasi_pembanding_id'), 'valuasi_pembanding', ['id'], unique=False)

    # 8. Audit Log Table
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('rincian_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_log_id'), 'audit_log', ['id'], unique=False)
    op.create_index(op.f('ix_audit_log_action'), 'audit_log', ['action'], unique=False)


def downgrade() -> None:
    op.drop_table('audit_log')
    op.drop_table('valuasi_pembanding')
    op.drop_table('valuasi')
    op.drop_table('pembanding')
    op.drop_table('parameter_valuasi')
    op.drop_table('agunan')
    op.drop_table('pengajuan')
    op.drop_table('users')

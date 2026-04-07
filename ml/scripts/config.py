"""
config.py — Shared configuration for all ML pipeline scripts.

Set USE_DATABASE = True and provide CONNECTION_STRING once
the Azure SQL connection is available from the backend team.
"""

import os
from pathlib import Path

# ------------------------------------------------------------------ #
# Paths
# ------------------------------------------------------------------ #

# Root of the ML Pipelines folder (one level up from scripts/)
ROOT_DIR    = Path(__file__).resolve().parent.parent

DATA_DIR    = ROOT_DIR / "data"         # local CSV copies (fallback)
ARTIFACT_DIR = ROOT_DIR / "artifacts"   # .sav files + JSON metadata

ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

# Model filenames
SOCIAL_MEDIA_MODEL  = str(ARTIFACT_DIR / "social_media_model.sav")
RESIDENT_RISK_MODEL = str(ARTIFACT_DIR / "resident_risk_model.sav")
DONOR_CHURN_MODEL   = str(ARTIFACT_DIR / "donor_churn_model.sav")

# ------------------------------------------------------------------ #
# Database flag
# ------------------------------------------------------------------ #

# Flip to True once the Azure SQL connection string is set.
# When False, all scripts load CSVs from DATA_DIR instead.
USE_DATABASE: bool = os.getenv("USE_DATABASE", "false").lower() == "true"

# Connection string — set via environment variable (never hard-code).
#
# GitHub Actions: stored as repo secret AZURE_SQL_CONNECTION_STRING.
#
# Local test (Terminal):
#   export AZURE_SQL_CONNECTION_STRING="mssql+pyodbc://intex44:Group44intexdatabase@4-4intexdb.database.windows.net:1433/free-sql-db-8222201?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no"
#   export USE_DATABASE=true
#   python train_social_media.py
#
# NOTE: The ODBC driver name must match what is installed on the machine.
#   GitHub Actions ubuntu-latest uses: ODBC+Driver+18+for+SQL+Server
#   macOS: check with `odbcinst -q -d` — may need brew install msodbcsql18
CONNECTION_STRING: str = os.getenv("AZURE_SQL_CONNECTION_STRING", "")

# ------------------------------------------------------------------ #
# CSV filenames (used when USE_DATABASE = False)
# ------------------------------------------------------------------ #

CSV = {
    "social_media_posts":        DATA_DIR / "social_media_posts.csv",
    "residents":                 DATA_DIR / "residents.csv",
    "supporters":                DATA_DIR / "supporters.csv",
    "donations":                 DATA_DIR / "donations.csv",
    "process_recordings":        DATA_DIR / "process_recordings.csv",
    "health_wellbeing_records":  DATA_DIR / "health_wellbeing_records.csv",
    "education_records":         DATA_DIR / "education_records.csv",
    "incident_reports":          DATA_DIR / "incident_reports.csv",
    "intervention_plans":        DATA_DIR / "intervention_plans.csv",
}

# ------------------------------------------------------------------ #
# Shared modelling constants
# ------------------------------------------------------------------ #

SEED = 42
CHURN_THRESHOLD_DAYS = 180  # donor "at risk" definition

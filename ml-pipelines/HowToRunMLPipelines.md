# How to Run the ML Pipelines Locally

This guide walks you through setting up and running the three ML pipeline notebooks on your local machine using VS Code.
---

## What's in This Folder

| File | Description |
|---|---|
| `donor-churn-classifier.ipynb` | Predicts which donors are at risk of lapsing (binary classification) |
| `resident-incident-risk-predictor.ipynb` | Predicts which residents are at risk of serious incidents (binary classification) |
| `social-media-performance-predictor.ipynb` | Predicts donation referrals per social media post (regression) |
| `requirements.txt` | Python package dependencies for all three notebooks |
| `data/` | CSV data files (9 tables from the Faro Safehouse database) |

Each notebook is self-contained and follows the full ML lifecycle: data loading, EDA, feature engineering, model training with cross-validation and hyperparameter tuning, evaluation, explanatory modeling, and batch inference. All data is included — no database connection required.

---

## Prerequisites

Before you begin, make sure you have the following installed:

### 1. Python 3.9 or higher

Check your version:

```bash
python3 --version
```

If you don't have Python installed:
- **Mac:** `brew install python` (via Homebrew) or download from [python.org](https://www.python.org/downloads/)
- **Windows:** Download from [python.org](https://www.python.org/downloads/) — during installation, check **"Add Python to PATH"**
- **Linux:** `sudo apt install python3 python3-venv python3-pip`


### 3. VS Code Extensions

Open VS Code and install these two extensions (search in the Extensions sidebar, `Ctrl+Shift+X` / `Cmd+Shift+X`):

- **Python** (by Microsoft) — provides Python language support, linting, and virtual environment detection
- **Jupyter** (by Microsoft) — provides notebook rendering, cell execution, and kernel selection

Both extensions are free and published by Microsoft. You may be prompted to install them automatically when you first open a `.ipynb` file.

---

## Step-by-Step Setup

### Step 1: Clone the Repository

### Step 2: Navigate to the ML Pipelines Folder

```bash
cd ml-pipelines
```

Everything you need is already here — notebooks, data, and requirements. Your folder structure looks like this:

```
ml-pipelines/
  data/
    donations.csv
    education_records.csv
    health_wellbeing_records.csv
    incident_reports.csv
    intervention_plans.csv
    process_recordings.csv
    residents.csv
    social_media_posts.csv
    supporters.csv
  donor-churn-classifier.ipynb
  resident-incident-risk-predictor.ipynb
  social-media-performance-predictor.ipynb
  requirements.txt
  HowToRunMLPipelines.md
```

### Step 3: Create a Virtual Environment

A virtual environment isolates the Python packages for this project from your system Python. This prevents version conflicts with other projects.

```bash
cd ml-pipelines
python3 -m venv .venv
```

This creates a `.venv/` directory inside `ml-pipelines/`. It is listed in `.gitignore` and will not be committed to the repository.

### Step 4: Activate the Virtual Environment

**Mac / Linux:**

```bash
source .venv/bin/activate
```

**Windows (Command Prompt):**

```cmd
.venv\Scripts\activate
```

**Windows (PowerShell):**

```powershell
.venv\Scripts\Activate.ps1
```

You should see `(.venv)` appear at the beginning of your terminal prompt. This confirms the virtual environment is active.

### Step 5: Install Dependencies

```bash
pip install -r requirements.txt
```

This installs all required packages:

| Package | Purpose |
|---|---|
| `pandas` | Data manipulation and analysis |
| `numpy` | Numerical computing |
| `scikit-learn` | Machine learning models, pipelines, metrics, cross-validation |
| `joblib` | Model serialization (save/load `.sav` files) |
| `statsmodels` | Explanatory modeling (OLS, Logit), diagnostics (VIF, Durbin-Watson) |
| `scipy` | Statistical tests (bivariate EDA, Q-Q plots) |
| `sqlalchemy` | Database connectivity (used in production scripts, not in notebooks) |
| `pyodbc` | Azure SQL driver (used in production scripts, not in notebooks) |
| `matplotlib` | Visualizations (charts, plots, confusion matrices) |
| `seaborn` | Statistical visualizations (heatmaps, distribution plots) |

**Note:** `sqlalchemy` and `pyodbc` are included for completeness (the production scripts use them to connect to Azure SQL). The notebooks themselves only use CSV files and do not require a database connection.

### Step 6: Open the Folder in VS Code

```bash
code .
```

Or open VS Code manually and use **File > Open Folder** to open the `ml-pipelines/` directory.

### Step 7: Open a Notebook

In the VS Code file explorer (left sidebar), click on any of the three `.ipynb` files to open it. VS Code will render it as an interactive notebook with executable code cells and formatted markdown.

### Step 8: Select the Python Kernel

When you first open a notebook, VS Code will show **"Select Kernel"** in the top-right corner of the notebook editor.

1. Click **"Select Kernel"**
2. Choose **"Python Environments..."**
3. Select the `.venv` environment you created — it will appear as something like:
   - `Python 3.x.x ('.venv': venv)` or
   - `Python 3.x.x (~/.../ml-pipelines/.venv/bin/python)`

If you don't see it, try:
- Closing and reopening VS Code
- Running `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows) > **"Python: Select Interpreter"** > choose the `.venv` Python

### Step 9: Run the Notebook

Click the **"Run All"** button (double-play icon ⏩) at the top of the notebook. All cells execute sequentially from top to bottom.

Each notebook takes approximately 1-3 minutes to run fully, depending on your machine. The hyperparameter tuning cells (GridSearchCV) are the most time-intensive.

---

## What Each Notebook Produces

### Donor Churn Classifier (`donor-churn-classifier.ipynb`)

- **Target:** `is_at_risk` — binary label based on the 75th percentile of donation recency
- **Models compared:** Logistic Regression, Decision Tree, Random Forest, Bagging, AdaBoost, Gradient Boosting
- **Tuning:** GridSearchCV on Random Forest and Gradient Boosting
- **Primary metric:** ROC-AUC (cross-validated)
- **Explanatory model:** statsmodels Logit with odds ratios
- **Output artifacts** (written to `artifacts/` on completion):
  - `donor_churn_model.sav` — serialized sklearn Pipeline
  - `donor_churn_metadata.json` — model version, features, training info
  - `donor_churn_metrics.json` — test-set accuracy, F1, ROC-AUC, baseline
  - `donor_risk_scores.csv` — per-supporter churn probability and risk label

### Resident Incident Risk Predictor (`resident-incident-risk-predictor.ipynb`)

- **Target:** `has_serious_incident` — binary label for RunawayAttempt or SelfHarm incidents
- **Data:** 6 tables joined (residents, process recordings, health, education, incidents, intervention plans) into 48 engineered features
- **Models compared:** Same 6 as donor churn
- **Tuning:** GridSearchCV on Random Forest and Gradient Boosting
- **Primary metric:** ROC-AUC (cross-validated with 5x5 RepeatedStratifiedKFold)
- **Explanatory model:** statsmodels Logit with odds ratios (graceful fallback if matrix is near-singular)
- **Special feature:** Per-row top-3 risk factors for each resident
- **Output artifacts:**
  - `resident_risk_model.sav`
  - `resident_risk_metadata.json`
  - `resident_risk_metrics.json`
  - `resident_risk_scores.csv`

### Social Media Performance Predictor (`social-media-performance-predictor.ipynb`)

- **Target:** `donation_referrals` (primary), `engagement_rate` (secondary)
- **Models compared:** Decision Tree, Linear Regression, Random Forest, Bagging, AdaBoost, Gradient Boosting
- **Tuning:** GridSearchCV on Random Forest and Gradient Boosting
- **Primary metric:** MAE (mean absolute error)
- **Explanatory model:** statsmodels OLS with coefficient table and significance testing
- **Diagnostics:** Q-Q plot, residuals-vs-fitted, Durbin-Watson, Breusch-Pagan
- **Special feature:** Generates a recommendation grid of ~12,000 posting strategy combinations ranked by predicted donation referrals
- **Output artifacts:**
  - `social_media_model.sav`
  - `social_media_engagement_model.sav`
  - `social_media_metadata.json`
  - `social_media_metrics.json`
  - `social_media_recommendations.csv`

---
## Troubleshooting:

### "ModuleNotFoundError: No module named 'sklearn'"
You forgot to activate the virtual environment or didn't install dependencies. Run:
```bash
source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

### "FileNotFoundError: data/supporters.csv"
The `data/` directory may be missing or empty. Verify that `ml-pipelines/data/` contains 9 CSV files (donations, education_records, health_wellbeing_records, incident_reports, intervention_plans, process_recordings, residents, social_media_posts, supporters). If missing, copy them from `ml/data/`.

### "No kernel selected" or cells won't execute
Click **"Select Kernel"** in the top-right of the notebook and choose the `.venv` Python environment. See **Step 8**.

### Kernel dies or runs out of memory
The GridSearchCV cells can be memory-intensive. If your machine has limited RAM (<8GB), try closing other applications. The notebooks should run fine on any modern laptop.

### Charts or plots don't render
Make sure you have the **Jupyter** VS Code extension installed. If plots still don't show, add `%matplotlib inline` to the first code cell and re-run.

### "Python was not found" (Windows)
Python may not be on your PATH. Reinstall Python from [python.org](https://www.python.org/downloads/) and check **"Add Python to PATH"** during installation.

---

## Production Scripts (For Reference)

The production versions of these pipelines live in `ml/scripts/` and run nightly via GitHub Actions. They contain the same modeling logic as the notebooks but connect to Azure SQL instead of local CSVs. You do **not** need to run the production scripts to evaluate the notebooks — the notebooks are fully self-contained.

| Production Script | Notebook Equivalent |
|---|---|
| `ml/scripts/train_donor_churn.py` | `donor-churn-classifier.ipynb` |
| `ml/scripts/train_resident_risk.py` | `resident-incident-risk-predictor.ipynb` |
| `ml/scripts/train_social_media.py` | `social-media-performance-predictor.ipynb` |
| `ml/scripts/run_inference_all.py` | Batch inference (runs all 3 models) |
| `ml/scripts/config.py` | Shared configuration (paths, constants) |
| `ml/scripts/utils_db.py` | Database utilities (Azure SQL connection) |

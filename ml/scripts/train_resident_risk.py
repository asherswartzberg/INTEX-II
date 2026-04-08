"""
train_resident_risk.py — Train the Resident Incident Risk Predictor.

Predicts which residents are likely to experience serious behavioural
incidents (RunawayAttempt or SelfHarm) based on their clinical trajectory
data (health, education, counselling sessions, intervention plans).

Mirrors the logic from notebooks/resident-incident-risk-predictor.ipynb.
Run from the scripts/ directory:

    python train_resident_risk.py

Output artifacts written to ../artifacts/:
    resident_risk_model.sav
    resident_risk_metadata.json
    resident_risk_metrics.json
"""

import json
import re
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report,
                             f1_score, roc_auc_score)
from sklearn.model_selection import (RepeatedStratifiedKFold,
                                     cross_val_score, train_test_split)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

import config
import utils_db


# ------------------------------------------------------------------ #
# 1. Load data
# ------------------------------------------------------------------ #

def load_data():
    if config.USE_DATABASE:
        residents    = utils_db.load_table("residents")
        process_recs = utils_db.load_table("process_recordings")
        health       = utils_db.load_table("health_wellbeing_records")
        education    = utils_db.load_table("education_records")
        incidents    = utils_db.load_table("incident_reports")
        plans        = utils_db.load_table("intervention_plans")
    else:
        residents    = pd.read_csv(config.CSV["residents"])
        process_recs = pd.read_csv(config.CSV["process_recordings"])
        health       = pd.read_csv(config.CSV["health_wellbeing_records"])
        education    = pd.read_csv(config.CSV["education_records"])
        incidents    = pd.read_csv(config.CSV["incident_reports"])
        plans        = pd.read_csv(config.CSV["intervention_plans"])
    print(f"Loaded: residents={len(residents)}, process_recs={len(process_recs)}, "
          f"health={len(health)}, education={len(education)}, "
          f"incidents={len(incidents)}, plans={len(plans)}")
    return residents, process_recs, health, education, incidents, plans


# ------------------------------------------------------------------ #
# 2. Feature engineering
# ------------------------------------------------------------------ #

def parse_duration_to_months(s) -> float:
    """Convert '15 Years 9 months' → total months as float. NaN if unparseable."""
    s = str(s)
    years_match  = re.search(r"(\d+)\s*[Yy]ear",  s)
    months_match = re.search(r"(\d+)\s*[Mm]onth", s)
    total = 0
    if years_match:  total += int(years_match.group(1))  * 12
    if months_match: total += int(months_match.group(1))
    return float(total) if total > 0 else np.nan


EMOTION_MAP = {
    "Angry": 1, "Distressed": 1,
    "Sad": 2, "Anxious": 2, "Withdrawn": 2,
    "Calm": 3,
    "Hopeful": 4,
    "Happy": 5,
}

RISK_MAP = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}

SEVERITY_MAP = {"Low": 1, "Medium": 2, "High": 3}

# Columns to drop before modelling
DROP_COLS = [
    "resident_id", "case_control_no", "internal_code", "safehouse_id",
    "reintegration_status", "reintegration_type", "current_risk_level", "case_status",
    "age_upon_admission", "present_age", "length_of_stay",
    "initial_risk_level",
    "date_of_birth", "date_of_admission", "date_colb_registered",
    "date_colb_obtained", "date_case_study_prepared", "date_enrolled",
    "date_closed", "created_at",
    "referring_agency_person", "notes_restricted", "assigned_social_worker",
    "initial_case_assessment", "sex",
    # Target + incident-derived columns (leakage — can't predict incidents from incidents)
    "has_serious_incident", "serious_incident_count",
    "total_incidents", "avg_severity_score", "high_severity_count", "pct_resolved",
]

LEAKAGE_COLS = [
    "has_serious_incident", "serious_incident_count",
    "total_incidents", "avg_severity_score", "high_severity_count", "pct_resolved",
]


def build_model_dataframe(residents, process_recs, health, education, incidents, plans):
    # ---- Parse string duration fields ----
    residents = residents.copy()
    residents["age_at_admission_months"] = residents["age_upon_admission"].apply(parse_duration_to_months)
    residents["length_of_stay_months"]   = residents["length_of_stay"].apply(parse_duration_to_months)

    # ---- Encode initial risk level ----
    residents["initial_risk_encoded"] = residents["initial_risk_level"].map(RISK_MAP)

    # ---- Process recordings aggregation ----
    process_recs = process_recs.copy()
    process_recs["emotion_start_score"] = process_recs["emotional_state_observed"].map(EMOTION_MAP)
    process_recs["emotion_end_score"]   = process_recs["emotional_state_end"].map(EMOTION_MAP)
    process_recs["emotion_improvement"] = (
        process_recs["emotion_end_score"] - process_recs["emotion_start_score"]
    )
    proc_agg = (
        process_recs
        .groupby("resident_id")
        .agg(
            total_sessions          = ("recording_id",              "count"),
            avg_session_duration    = ("session_duration_minutes",  "mean"),
            pct_progress_noted      = ("progress_noted",            "mean"),
            pct_concerns_flagged    = ("concerns_flagged",          "mean"),
            pct_referral_made       = ("referral_made",             "mean"),
            avg_emotion_start       = ("emotion_start_score",       "mean"),
            avg_emotion_end         = ("emotion_end_score",         "mean"),
            avg_emotion_improvement = ("emotion_improvement",       "mean"),
        )
        .reset_index()
    )

    # ---- Health aggregation ----
    health_agg = (
        health
        .groupby("resident_id")
        .agg(
            avg_health_score    = ("general_health_score",        "mean"),
            avg_nutrition_score = ("nutrition_score",             "mean"),
            avg_sleep_score     = ("sleep_quality_score",         "mean"),
            avg_energy_score    = ("energy_level_score",          "mean"),
            avg_bmi             = ("bmi",                         "mean"),
            pct_medical_checkup = ("medical_checkup_done",        "mean"),
            pct_dental_checkup  = ("dental_checkup_done",         "mean"),
            pct_psych_checkup   = ("psychological_checkup_done",  "mean"),
        )
        .reset_index()
    )

    # ---- Education aggregation ----
    education_agg = (
        education
        .groupby("resident_id")
        .agg(
            avg_attendance_rate   = ("attendance_rate",  "mean"),
            avg_progress_percent  = ("progress_percent", "mean"),
        )
        .reset_index()
    )

    # ---- Incident aggregation ----
    incidents = incidents.copy()
    incidents["severity_score"] = incidents["severity"].map(SEVERITY_MAP)
    incident_agg = (
        incidents
        .groupby("resident_id")
        .agg(
            total_incidents     = ("incident_id",    "count"),
            avg_severity_score  = ("severity_score", "mean"),
            high_severity_count = ("severity",       lambda x: (x == "High").sum()),
            pct_resolved        = ("resolved",       "mean"),
        )
        .reset_index()
    )

    # ---- Intervention plan aggregation ----
    plans = plans.copy()
    plans["is_achieved"] = (plans["status"] == "Achieved").astype(int)
    plan_agg = (
        plans
        .groupby("resident_id")
        .agg(
            total_plans          = ("plan_id",    "count"),
            plans_achieved_count = ("is_achieved", "sum"),
            plans_achieved_pct   = ("is_achieved", "mean"),
        )
        .reset_index()
    )

    # ---- Serious incident aggregation (for TARGET only) ----
    serious_agg = (
        incidents[incidents["incident_type"].isin(["RunawayAttempt", "SelfHarm"])]
        .groupby("resident_id")
        .agg(serious_incident_count=("incident_id", "count"))
        .reset_index()
    )

    # ---- Join everything ----
    df_model = (
        residents
        .merge(proc_agg,      on="resident_id", how="left")
        .merge(health_agg,    on="resident_id", how="left")
        .merge(education_agg, on="resident_id", how="left")
        .merge(incident_agg,  on="resident_id", how="left")
        .merge(plan_agg,      on="resident_id", how="left")
        .merge(serious_agg,   on="resident_id", how="left")
    )

    # Fill 0 for residents with no incidents
    for col in ["total_incidents", "high_severity_count", "serious_incident_count"]:
        df_model[col] = df_model[col].fillna(0)

    # ---- Target variable ----
    # Has the resident ever had a RunawayAttempt or SelfHarm incident?
    df_model["has_serious_incident"] = (df_model["serious_incident_count"] > 0).astype(int)

    print(f"Class balance: {df_model['has_serious_incident'].mean():.1%} with serious incidents "
          f"({df_model['has_serious_incident'].sum()} / {len(df_model)})")
    return df_model


def prepare_features(df_model: pd.DataFrame):
    feature_cols = [c for c in df_model.columns if c not in DROP_COLS]

    # Leakage check
    leaked = [c for c in feature_cols if c in LEAKAGE_COLS]
    if leaked:
        raise ValueError(f"DATA LEAKAGE DETECTED: {leaked}")

    X = df_model[feature_cols].copy()
    y = df_model["has_serious_incident"].copy()
    return X, y, feature_cols


# ------------------------------------------------------------------ #
# 3. Build preprocessor
# ------------------------------------------------------------------ #

def build_preprocessor(X_train: pd.DataFrame):
    num_cols = X_train.select_dtypes(include=["int64", "float64", "bool"]).columns.tolist()
    cat_cols = X_train.select_dtypes(include=["object"]).columns.tolist()

    numeric_pipe = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical_pipe = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", drop="first", sparse_output=False)),
    ])
    preprocessor = ColumnTransformer(transformers=[
        ("num", numeric_pipe, num_cols),
        ("cat", categorical_pipe, cat_cols),
    ])
    return preprocessor, num_cols, cat_cols


# ------------------------------------------------------------------ #
# 4. Train and evaluate
# ------------------------------------------------------------------ #

def train(df_model: pd.DataFrame):
    X, y, feature_cols = prepare_features(df_model)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=config.SEED, stratify=y
    )
    print(f"Train: {X_train.shape}  |  Test: {X_test.shape}")
    print(f"Class balance — train: {y_train.mean():.1%}  test: {y_test.mean():.1%}")

    preprocessor, _, _ = build_preprocessor(X_train)

    models = {
        "Logistic Regression": Pipeline(steps=[
            ("prep", preprocessor),
            ("clf", LogisticRegression(max_iter=1000, random_state=config.SEED)),
        ]),
        "Decision Tree": Pipeline(steps=[
            ("prep", preprocessor),
            ("clf", DecisionTreeClassifier(max_depth=3, min_samples_leaf=5, random_state=config.SEED)),
        ]),
        "Random Forest": Pipeline(steps=[
            ("prep", preprocessor),
            ("clf", RandomForestClassifier(n_estimators=200, max_depth=4, min_samples_leaf=5, max_features="sqrt", random_state=config.SEED)),
        ]),
        "Gradient Boosting": Pipeline(steps=[
            ("prep", preprocessor),
            ("clf", GradientBoostingClassifier(n_estimators=200, max_depth=3, learning_rate=0.05, min_samples_leaf=5, subsample=0.8, random_state=config.SEED)),
        ]),
    }

    # Cross-validation — RepeatedStratifiedKFold for small dataset (48 train rows)
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=config.SEED)
    cv_results = []
    for name, model in models.items():
        scores = cross_val_score(
            model, X_train, y_train, cv=cv, scoring="roc_auc"
        )
        cv_results.append({
            "Model": name,
            "CV ROC-AUC Mean": scores.mean(),
            "CV ROC-AUC Std":  scores.std(),
        })
        print(f"{name}: CV ROC-AUC = {scores.mean():.3f} (+/- {scores.std():.3f})")

    cv_df = pd.DataFrame(cv_results).sort_values("CV ROC-AUC Mean", ascending=False)

    # Select and refit best model
    best_model_name = cv_df.iloc[0]["Model"]
    best_model = models[best_model_name]
    best_model.fit(X_train, y_train)
    print(f"\nSelected model: {best_model_name}")

    # Baseline: always predict majority class
    majority = int(y_train.mode()[0])
    baseline_acc = float((y_test == majority).mean())

    # Final test-set evaluation
    y_pred_final = best_model.predict(X_test)
    y_prob_final = best_model.predict_proba(X_test)[:, 1]

    final_acc     = accuracy_score(y_test, y_pred_final)
    final_f1      = f1_score(y_test, y_pred_final, zero_division=0)
    final_roc_auc = roc_auc_score(y_test, y_prob_final)

    print(f"\nTest set — Accuracy: {final_acc:.3f} | F1: {final_f1:.3f} | ROC-AUC: {final_roc_auc:.3f}")
    print(f"Baseline accuracy: {baseline_acc:.3f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred_final,
                                target_names=["No Incident", "Has Incident"],
                                zero_division=0))

    return (best_model, best_model_name, feature_cols,
            X_train, X_test, y_train, y_test,
            final_acc, final_f1, final_roc_auc, baseline_acc, cv_df)


# ------------------------------------------------------------------ #
# 5. Save artifacts
# ------------------------------------------------------------------ #

def save_artifacts(best_model, best_model_name, feature_cols,
                   X_train, X_test,
                   final_acc, final_f1, final_roc_auc, baseline_acc, cv_df):

    joblib.dump(best_model, config.RESIDENT_RISK_MODEL)
    print(f"Model saved: {config.RESIDENT_RISK_MODEL}")

    metadata = {
        "model_name":         "resident_incident_risk_predictor",
        "model_version":      "2.0.0",
        "trained_at_utc":     datetime.now(timezone.utc).isoformat(),
        "best_algorithm":     best_model_name,
        "features":           feature_cols,
        "target":             "has_serious_incident",
        "target_definition":  "resident has RunawayAttempt or SelfHarm incident",
        "num_training_rows":  int(X_train.shape[0]),
        "num_test_rows":      int(X_test.shape[0]),
        "cv_strategy":        "RepeatedStratifiedKFold(n_splits=5, n_repeats=3)",
    }
    metrics = {
        "test_accuracy":     float(final_acc),
        "test_f1":           float(final_f1),
        "test_roc_auc":      float(final_roc_auc),
        "baseline_accuracy": float(baseline_acc),
        "cv_roc_auc_mean":   float(cv_df.iloc[0]["CV ROC-AUC Mean"]),
        "cv_roc_auc_std":    float(cv_df.iloc[0]["CV ROC-AUC Std"]),
    }

    meta_path    = config.ARTIFACT_DIR / "resident_risk_metadata.json"
    metrics_path = config.ARTIFACT_DIR / "resident_risk_metrics.json"

    with open(meta_path,    "w") as f: json.dump(metadata, f, indent=2)
    with open(metrics_path, "w") as f: json.dump(metrics,  f, indent=2)
    print(f"Metadata: {meta_path}")
    print(f"Metrics:  {metrics_path}")
    print(json.dumps(metrics, indent=2))


# ------------------------------------------------------------------ #
# 6. Top factors helper
# ------------------------------------------------------------------ #

def _clean_feature_name(name: str) -> str:
    """Strip sklearn ColumnTransformer prefixes from a feature name."""
    for prefix in ("num__", "cat__"):
        if name.startswith(prefix):
            return name[len(prefix):]
    return name


def get_top_factors_per_row(best_model, X_all: pd.DataFrame, top_n: int = 3) -> list[str]:
    """Return a list of comma-separated top-factor strings, one per row in X_all.

    For each resident, multiply the model coefficients (or feature importances)
    by that resident's transformed feature values to get per-resident contributions,
    then pick the top-N contributing features.
    """
    clf = best_model.named_steps["clf"]
    prep = best_model.named_steps["prep"]
    try:
        transformed_names = list(prep.get_feature_names_out())
    except Exception:
        return [""] * len(X_all)

    X_transformed = prep.transform(X_all)

    if hasattr(clf, "coef_"):
        weights = np.abs(clf.coef_[0])
    elif hasattr(clf, "feature_importances_"):
        weights = clf.feature_importances_
    else:
        return [""] * len(X_all)

    results = []
    for row in X_transformed:
        contributions = np.abs(row) * weights
        top_idx = np.argsort(contributions)[::-1][:top_n]
        names = [_clean_feature_name(transformed_names[i]) for i in top_idx]
        results.append(", ".join(names))
    return results


# ------------------------------------------------------------------ #
# 7. Batch inference
# ------------------------------------------------------------------ #

def run_batch_inference(df_model: pd.DataFrame, best_model, feature_cols: list) -> pd.DataFrame:
    """Score every current resident and return a scores DataFrame."""
    X_all      = df_model[feature_cols].copy()
    risk_probs = best_model.predict_proba(X_all)[:, 1]
    risk_preds = best_model.predict(X_all)

    top_factors_list = get_top_factors_per_row(best_model, X_all)

    scores_df = pd.DataFrame({
        "resident_id":          df_model["resident_id"],
        "incident_risk_score":  risk_probs.round(3),
        "risk_label":           pd.cut(
            risk_probs,
            bins=[0, 0.33, 0.66, 1.01],
            labels=["Low Risk", "Moderate Risk", "High Risk"],
            include_lowest=True,
        ).astype(str),
        "predicted_high_risk":  risk_preds,
        "top_factors":          top_factors_list,
        "prediction_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    scores_df = scores_df.sort_values("incident_risk_score", ascending=False)

    print(f"\nScored {len(scores_df)} residents.")
    print("Risk distribution:")
    print(scores_df["risk_label"].value_counts().to_string())
    return scores_df


def write_scores(scores_df: pd.DataFrame) -> None:
    if config.USE_DATABASE:
        utils_db.write_table(scores_df, "resident_risk_scores", if_exists="replace")
    else:
        out = config.ARTIFACT_DIR / "resident_risk_scores.csv"
        scores_df.to_csv(out, index=False)
        print(f"Saved scores CSV: {out}")


# ------------------------------------------------------------------ #
# Entry point
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    print("=" * 60)
    print("Resident Incident Risk Predictor — Training")
    print("=" * 60)

    residents, process_recs, health, education, incidents, plans = load_data()
    df_model = build_model_dataframe(residents, process_recs, health, education, incidents, plans)

    (best_model, best_model_name, feature_cols,
     X_train, X_test, y_train, y_test,
     final_acc, final_f1, final_roc_auc, baseline_acc, cv_df) = train(df_model)

    save_artifacts(best_model, best_model_name, feature_cols,
                   X_train, X_test,
                   final_acc, final_f1, final_roc_auc, baseline_acc, cv_df)

    scores_df = run_batch_inference(df_model, best_model, feature_cols)
    write_scores(scores_df)

    print("\nResident risk pipeline complete.")

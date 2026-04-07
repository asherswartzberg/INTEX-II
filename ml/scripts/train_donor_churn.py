"""
train_donor_churn.py — Train the Donor Churn / Lapse Risk Classifier.

Mirrors the logic from notebooks/donor-churn-classifier.ipynb.
Run from the scripts/ directory:

    python train_donor_churn.py

Output artifacts written to ../artifacts/:
    donor_churn_model.sav
    donor_churn_metadata.json
    donor_churn_metrics.json
"""

import json
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
        supporters = utils_db.load_table("supporters")
        donations  = utils_db.load_table("donations")
    else:
        supporters = pd.read_csv(config.CSV["supporters"])
        donations  = pd.read_csv(config.CSV["donations"])

    donations["donation_date"] = pd.to_datetime(donations["donation_date"])
    print(f"Loaded: supporters={len(supporters)}, donations={len(donations)}")
    return supporters, donations


# ------------------------------------------------------------------ #
# 2. Feature engineering
# ------------------------------------------------------------------ #

DROP_COLS = [
    "supporter_id",
    "display_name", "first_name", "last_name", "email", "phone",
    "organization_name",
    "status",
    "created_at", "first_donation_date", "last_donation_date",
    "first_donation_date_x", "first_donation_date_y",
    "is_at_risk",
]

LEAKAGE_COLS = ["is_at_risk"]


def avg_gap_days(dates) -> float:
    """Mean days between consecutive donations. NaN if fewer than 2 donations."""
    sorted_dates = pd.to_datetime(dates).sort_values()
    gaps = sorted_dates.diff().dt.days.dropna()
    return gaps.mean() if len(gaps) > 0 else np.nan


def build_model_dataframe(supporters: pd.DataFrame, donations: pd.DataFrame) -> pd.DataFrame:
    reference_date = donations["donation_date"].max()
    print(f"Reference date: {reference_date.date()}")

    # ---- RFM aggregation ----
    rfm = (
        donations
        .groupby("supporter_id")
        .agg(
            recency_days          = ("donation_date",   lambda x: (reference_date - pd.to_datetime(x).max()).days),
            frequency             = ("donation_id",     "count"),
            total_value           = ("estimated_value", "sum"),
            avg_donation_value    = ("estimated_value", "mean"),
            max_donation_value    = ("estimated_value", "max"),
            has_recurring         = ("is_recurring",    "max"),
            pct_recurring         = ("is_recurring",    "mean"),
            donation_type_variety = ("donation_type",   "nunique"),
            channel_variety       = ("channel_source",  "nunique"),
            campaigns_donated_to  = ("campaign_name",   lambda x: x.dropna().nunique()),
            first_donation_date   = ("donation_date",   "min"),
            last_donation_date    = ("donation_date",   "max"),
        )
        .reset_index()
    )

    # Avg gap between donations (separate apply to avoid lambda nesting)
    gap_series = (
        donations
        .groupby("supporter_id")["donation_date"]
        .apply(avg_gap_days)
        .rename("avg_gap_days")
        .reset_index()
    )
    rfm = rfm.merge(gap_series, on="supporter_id", how="left")

    # Tenure = days from first donation to reference date
    rfm["tenure_days"] = (reference_date - pd.to_datetime(rfm["first_donation_date"])).dt.days

    # ---- Join to supporters ----
    df_model = supporters.merge(rfm, on="supporter_id", how="left")

    # Supporters with zero donations: fill recency with large value (max at-risk)
    NO_DONATION_RECENCY = int((reference_date - pd.Timestamp("2020-01-01")).days)
    df_model["recency_days"] = df_model["recency_days"].fillna(NO_DONATION_RECENCY)
    df_model["frequency"]    = df_model["frequency"].fillna(0)
    df_model["total_value"]  = df_model["total_value"].fillna(0)
    df_model["tenure_days"]  = df_model["tenure_days"].fillna(0)

    # ---- Target variable ----
    # Use the 75th-percentile of recency as the threshold so the target
    # reflects relative lapse risk rather than a hard 180-day cutoff.
    churn_threshold = df_model["recency_days"].quantile(0.75)
    df_model["is_at_risk"] = (df_model["recency_days"] > churn_threshold).astype(int)

    print(f"Churn threshold (75th pctl): {churn_threshold:.0f} days")
    print(f"Class balance: {df_model['is_at_risk'].mean():.1%} at risk "
          f"({df_model['is_at_risk'].sum()} / {len(df_model)})")
    return df_model


def prepare_features(df_model: pd.DataFrame):
    feature_cols = [c for c in df_model.columns if c not in DROP_COLS]

    # Leakage check
    leaked = [c for c in feature_cols if c in LEAKAGE_COLS]
    if leaked:
        raise ValueError(f"DATA LEAKAGE DETECTED: {leaked}")

    X = df_model[feature_cols].copy()
    y = df_model["is_at_risk"].copy()
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
            ("clf", DecisionTreeClassifier(max_depth=5, random_state=config.SEED)),
        ]),
        "Random Forest": Pipeline(steps=[
            ("prep", preprocessor),
            ("clf", RandomForestClassifier(n_estimators=100, random_state=config.SEED)),
        ]),
        "Gradient Boosting": Pipeline(steps=[
            ("prep", preprocessor),
            ("clf", GradientBoostingClassifier(n_estimators=100, random_state=config.SEED)),
        ]),
    }

    # Cross-validation — RepeatedStratifiedKFold for small dataset (48 train rows)
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=config.SEED)
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
    majority     = int(y_train.mode()[0])
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
                                target_names=["Active", "At Risk"],
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

    joblib.dump(best_model, config.DONOR_CHURN_MODEL)
    print(f"Model saved: {config.DONOR_CHURN_MODEL}")

    metadata = {
        "model_name":           "donor_churn_classifier",
        "model_version":        "1.0.0",
        "trained_at_utc":       datetime.now(timezone.utc).isoformat(),
        "best_algorithm":       best_model_name,
        "features":             feature_cols,
        "target":               "is_at_risk",
        "target_definition":    "recency_days > 75th percentile of donor recency",
        "num_training_rows":    int(X_train.shape[0]),
        "num_test_rows":        int(X_test.shape[0]),
        "cv_strategy":          "RepeatedStratifiedKFold(n_splits=5, n_repeats=3)",
    }
    metrics = {
        "test_accuracy":     float(final_acc),
        "test_f1":           float(final_f1),
        "test_roc_auc":      float(final_roc_auc),
        "baseline_accuracy": float(baseline_acc),
        "cv_roc_auc_mean":   float(cv_df.iloc[0]["CV ROC-AUC Mean"]),
        "cv_roc_auc_std":    float(cv_df.iloc[0]["CV ROC-AUC Std"]),
    }

    meta_path    = config.ARTIFACT_DIR / "donor_churn_metadata.json"
    metrics_path = config.ARTIFACT_DIR / "donor_churn_metrics.json"

    with open(meta_path,    "w") as f: json.dump(metadata, f, indent=2)
    with open(metrics_path, "w") as f: json.dump(metrics,  f, indent=2)
    print(f"Metadata: {meta_path}")
    print(f"Metrics:  {metrics_path}")
    print(json.dumps(metrics, indent=2))


# ------------------------------------------------------------------ #
# 6. Top factors helper
# ------------------------------------------------------------------ #

def get_top_factors(best_model, top_n: int = 3) -> str:
    """Return comma-separated string of the model's global top feature names."""
    clf = best_model.named_steps["clf"]
    prep = best_model.named_steps["prep"]
    try:
        transformed_names = prep.get_feature_names_out()
    except Exception:
        return ""

    if hasattr(clf, "feature_importances_"):
        importances = clf.feature_importances_
    elif hasattr(clf, "coef_"):
        importances = np.abs(clf.coef_[0])
    else:
        return ""

    top_idx = np.argsort(importances)[::-1][:top_n]
    names = []
    for i in top_idx:
        name = str(transformed_names[i])
        for prefix in ("num__", "cat__"):
            if name.startswith(prefix):
                name = name[len(prefix):]
        names.append(name)
    return ", ".join(names)


# ------------------------------------------------------------------ #
# 7. Batch inference
# ------------------------------------------------------------------ #

def run_batch_inference(df_model: pd.DataFrame, feature_cols: list,
                        best_model=None) -> pd.DataFrame:
    """Score all current supporters and return a scores DataFrame."""
    if best_model is None:
        best_model = joblib.load(config.DONOR_CHURN_MODEL)
    X_all      = df_model[feature_cols].copy()
    risk_probs = best_model.predict_proba(X_all)[:, 1]

    top_factors = get_top_factors(best_model)

    scores_df = pd.DataFrame({
        "supporter_id":         df_model["supporter_id"],
        "display_name":         df_model["display_name"],
        "supporter_type":       df_model["supporter_type"],
        "churn_risk_score":     risk_probs.round(3),
        "risk_label":           pd.cut(
            risk_probs,
            bins=[0, 0.40, 0.70, 1.01],
            labels=["Low Risk", "Moderate Risk", "High Risk"],
            include_lowest=True,
        ),
        "recency_days":         df_model["recency_days"].astype(int),
        "frequency":            df_model["frequency"].astype(int),
        "top_factors":          top_factors,
        "prediction_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    scores_df["risk_label"] = scores_df["risk_label"].astype(str)
    scores_df = scores_df.sort_values("churn_risk_score", ascending=False)

    print(f"\nScored {len(scores_df)} supporters.")
    print(f"Top factors: {top_factors}")
    print("Risk label distribution:")
    print(scores_df["risk_label"].value_counts().to_string())
    return scores_df


def write_scores(scores_df: pd.DataFrame) -> None:
    if config.USE_DATABASE:
        utils_db.write_table(scores_df, "donor_risk_scores", if_exists="replace")
    else:
        out = config.ARTIFACT_DIR / "donor_risk_scores.csv"
        scores_df.to_csv(out, index=False)
        print(f"Saved scores CSV: {out}")


# ------------------------------------------------------------------ #
# Entry point
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    print("=" * 60)
    print("Donor Churn Classifier — Training")
    print("=" * 60)

    supporters, donations = load_data()
    df_model = build_model_dataframe(supporters, donations)

    (best_model, best_model_name, feature_cols,
     X_train, X_test, y_train, y_test,
     final_acc, final_f1, final_roc_auc, baseline_acc, cv_df) = train(df_model)

    save_artifacts(best_model, best_model_name, feature_cols,
                   X_train, X_test,
                   final_acc, final_f1, final_roc_auc, baseline_acc, cv_df)

    scores_df = run_batch_inference(df_model, feature_cols, best_model)
    write_scores(scores_df)

    print("\nDonor churn pipeline complete.")

"""
run_inference_all.py — Batch inference for all three ML pipelines.

Loads each saved model from ../artifacts/, scores the current data,
and writes results to Azure SQL (or CSV when USE_DATABASE=False).

Run from the scripts/ directory:

    python run_inference_all.py

This is the script called by GitHub Actions after training completes.
It can also be run standalone to refresh predictions without retraining.
"""

import sys
from datetime import datetime, timezone

import joblib

import config
from train_donor_churn import (
    load_data as load_donor_data,
    build_model_dataframe as build_donor_df,
    prepare_features as prepare_donor_features,
    run_batch_inference as run_donor_batch,
    write_scores as write_donor_scores,
)
from train_resident_risk import (
    load_data as load_resident_data,
    build_model_dataframe as build_resident_df,
    prepare_features as prepare_resident_features,
    run_batch_inference as run_resident_batch,
    write_scores as write_resident_scores,
)
from train_social_media import (
    load_data as load_social_media_data,
    prepare_features as prepare_social_media_features,
    run_batch_inference as run_social_media_inference,
    write_recommendations,
)


def run_donor_inference():
    print("\n--- Donor Churn Inference ---")
    try:
        loaded_model = joblib.load(config.DONOR_CHURN_MODEL)
    except FileNotFoundError:
        print(f"ERROR: model not found at {config.DONOR_CHURN_MODEL}. "
              f"Run train_donor_churn.py first.")
        return

    supporters, donations = load_donor_data()
    df_model = build_donor_df(supporters, donations)
    _, _, feature_cols = prepare_donor_features(df_model)

    scores_df = run_donor_batch(df_model, feature_cols, loaded_model)
    write_donor_scores(scores_df)
    print(f"Donor inference complete. {len(scores_df)} supporters scored.")


def run_resident_inference():
    print("\n--- Resident Incident Risk Inference ---")
    try:
        loaded_model = joblib.load(config.RESIDENT_RISK_MODEL)
    except FileNotFoundError:
        print(f"ERROR: model not found at {config.RESIDENT_RISK_MODEL}. "
              f"Run train_resident_risk.py first.")
        return

    (residents, process_recs, health,
     education, incidents, plans) = load_resident_data()
    df_model = build_resident_df(residents, process_recs, health, education, incidents, plans)
    _, _, feature_cols = prepare_resident_features(df_model)

    scores_df = run_resident_batch(df_model, loaded_model, feature_cols)
    write_resident_scores(scores_df)
    print(f"Resident inference complete. {len(scores_df)} residents scored.")


def run_social_media_inference_step():
    print("\n--- Social Media Inference ---")
    try:
        loaded_model = joblib.load(config.SOCIAL_MEDIA_MODEL)
    except FileNotFoundError:
        print(f"ERROR: model not found at {config.SOCIAL_MEDIA_MODEL}. "
              f"Run train_social_media.py first.")
        return

    try:
        engagement_model = joblib.load(config.SOCIAL_MEDIA_ENGAGEMENT_MODEL)
    except FileNotFoundError:
        print("WARNING: engagement model not found, skipping engagement predictions")
        engagement_model = None

    df = load_social_media_data()
    _, _, feature_cols = prepare_social_media_features(df)

    recommendations = run_social_media_inference(
        df, loaded_model, feature_cols, engagement_model
    )
    write_recommendations(recommendations)
    print(f"Social media inference complete. {len(recommendations)} combos scored.")


# ------------------------------------------------------------------ #
# Entry point
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    print("=" * 60)
    print("Run Inference — All Pipelines")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print(f"USE_DATABASE: {config.USE_DATABASE}")
    print("=" * 60)

    errors = []

    try:
        run_donor_inference()
    except Exception as e:
        print(f"[DONOR CHURN] FAILED: {e}")
        errors.append(("donor_churn", e))

    try:
        run_resident_inference()
    except Exception as e:
        print(f"[RESIDENT RISK] FAILED: {e}")
        errors.append(("resident_risk", e))

    try:
        run_social_media_inference_step()
    except Exception as e:
        print(f"[SOCIAL MEDIA] FAILED: {e}")
        errors.append(("social_media", e))

    print("\n" + "=" * 60)
    if errors:
        print(f"Inference finished with {len(errors)} error(s):")
        for name, err in errors:
            print(f"  [{name}] {err}")
        sys.exit(1)
    else:
        print("All inference pipelines completed successfully.")

"""
train_social_media.py — Train the Social Media Performance Predictor.

Mirrors the logic from notebooks/social-media-performance-predictor.ipynb.
Run this script from the scripts/ directory:

    python train_social_media.py

Output artifacts written to ../artifacts/:
    social_media_model.sav
    social_media_metadata.json
    social_media_metrics.json
"""

import json
from datetime import datetime, timezone
from itertools import product

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeRegressor  # noqa: F401 — kept for notebook parity

import config
import utils_db


# ------------------------------------------------------------------ #
# 1. Load data
# ------------------------------------------------------------------ #

def load_data() -> pd.DataFrame:
    if config.USE_DATABASE:
        df = utils_db.load_table("social_media_posts")
    else:
        df = pd.read_csv(config.CSV["social_media_posts"])
    print(f"Loaded social_media_posts: {df.shape}")
    return df


# ------------------------------------------------------------------ #
# 2. Feature engineering
# ------------------------------------------------------------------ #

TARGET = "donation_referrals"
TARGET_ENGAGEMENT = "engagement_rate"

FEATURE_COLS = [
    "platform",
    "post_type",
    "media_type",
    "content_topic",
    "sentiment_tone",
    "day_of_week",
    "post_hour",
    "has_call_to_action",
    "is_boosted",
    "num_hashtags",
    "caption_length",
    "features_resident_story",
    "mentions_count",
    "boost_budget_php",
]

LEAKAGE_COLS = [
    "impressions", "reach", "likes", "comments", "shares", "saves",
    "click_throughs", "video_views", "engagement_rate", "profile_visits",
    "follower_count_at_post", "watch_time_seconds", "avg_view_duration_seconds",
    "subscriber_count_at_post", "forwards", "estimated_donation_value_php",
]


def prepare_features(df: pd.DataFrame):
    # Keep only columns that exist in this dataset
    feature_cols = [c for c in FEATURE_COLS if c in df.columns]

    # Fill NaN boost budget (un-boosted posts) with 0
    if "boost_budget_php" in df.columns:
        df = df.copy()
        df["boost_budget_php"] = df["boost_budget_php"].fillna(0)

    # Leakage check
    leaked = [c for c in feature_cols if c in LEAKAGE_COLS]
    if leaked:
        raise ValueError(f"DATA LEAKAGE DETECTED: {leaked}")

    X = df[feature_cols].copy()
    y = df[TARGET].copy()
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

def train(df: pd.DataFrame):
    X, y, feature_cols = prepare_features(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=config.SEED
    )
    print(f"Train: {X_train.shape}  |  Test: {X_test.shape}")

    preprocessor, num_cols, cat_cols = build_preprocessor(X_train)

    models = {
        "Linear Regression": Pipeline(steps=[
            ("prep", preprocessor),
            ("reg", LinearRegression()),
        ]),
        "Random Forest": Pipeline(steps=[
            ("prep", preprocessor),
            ("reg", RandomForestRegressor(n_estimators=200, max_depth=6, min_samples_leaf=10, max_features="sqrt", random_state=config.SEED)),
        ]),
        "Gradient Boosting": Pipeline(steps=[
            ("prep", preprocessor),
            ("reg", GradientBoostingRegressor(n_estimators=200, max_depth=3, learning_rate=0.05, min_samples_leaf=10, subsample=0.8, random_state=config.SEED)),
        ]),
    }

    # Cross-validation on training data (5-fold)
    cv = KFold(n_splits=5, shuffle=True, random_state=config.SEED)
    cv_results = []
    for name, model in models.items():
        scores = cross_val_score(
            model, X_train, y_train,
            cv=cv, scoring="neg_mean_absolute_error"
        )
        cv_results.append({
            "Model": name,
            "CV MAE Mean": -scores.mean(),
            "CV MAE Std":  scores.std(),
        })
        print(f"{name}: CV MAE = {-scores.mean():.2f} (+/- {scores.std():.2f})")

    cv_df = pd.DataFrame(cv_results).sort_values("CV MAE Mean")

    # Select and refit best model
    best_model_name = cv_df.iloc[0]["Model"]
    best_model = models[best_model_name]
    best_model.fit(X_train, y_train)
    print(f"\nSelected model: {best_model_name}")

    # Baseline: predict the training mean
    baseline_pred = np.full(len(y_test), y_train.mean())
    baseline_mae  = mean_absolute_error(y_test, baseline_pred)

    # Final test-set evaluation
    y_pred_final = best_model.predict(X_test)
    final_mae  = mean_absolute_error(y_test, y_pred_final)
    final_rmse = np.sqrt(mean_squared_error(y_test, y_pred_final))
    final_r2   = r2_score(y_test, y_pred_final)

    # Train metrics (to check overfitting gap)
    y_pred_train = best_model.predict(X_train)
    train_r2 = r2_score(y_train, y_pred_train)

    print(f"\nTrain set — R²: {train_r2:.4f}")
    print(f"Test set  — MAE: {final_mae:.2f} | RMSE: {final_rmse:.2f} | R²: {final_r2:.4f}")
    print(f"Overfitting gap (R²): {train_r2 - final_r2:.4f}")
    print(f"Baseline MAE: {baseline_mae:.2f}")

    return best_model, best_model_name, feature_cols, X_train, X_test, y_train, y_test, \
           final_mae, final_rmse, final_r2, baseline_mae, cv_df


# ------------------------------------------------------------------ #
# 5. Save artifacts
# ------------------------------------------------------------------ #

def save_artifacts(best_model, best_model_name, feature_cols,
                   X_train, X_test, final_mae, final_rmse, final_r2, baseline_mae, cv_df):

    joblib.dump(best_model, config.SOCIAL_MEDIA_MODEL)
    print(f"Model saved: {config.SOCIAL_MEDIA_MODEL}")

    metadata = {
        "model_name":    "social_media_performance_predictor",
        "model_version": "1.0.0",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "best_algorithm": best_model_name,
        "features":       feature_cols,
        "target":         TARGET,
        "num_training_rows": int(X_train.shape[0]),
        "num_test_rows":     int(X_test.shape[0]),
    }
    metrics = {
        "test_mae":  float(final_mae),
        "test_rmse": float(final_rmse),
        "test_r2":   float(final_r2),
        "baseline_mae": float(baseline_mae),
        "improvement_over_baseline_pct": float(
            (baseline_mae - final_mae) / baseline_mae * 100
        ),
        "cv_mae_mean": float(cv_df.iloc[0]["CV MAE Mean"]),
        "cv_mae_std":  float(cv_df.iloc[0]["CV MAE Std"]),
    }

    meta_path    = config.ARTIFACT_DIR / "social_media_metadata.json"
    metrics_path = config.ARTIFACT_DIR / "social_media_metrics.json"

    with open(meta_path,    "w") as f: json.dump(metadata, f, indent=2)
    with open(metrics_path, "w") as f: json.dump(metrics,  f, indent=2)
    print(f"Metadata: {meta_path}")
    print(f"Metrics:  {metrics_path}")
    print(json.dumps(metrics, indent=2))


# ------------------------------------------------------------------ #
# 6. Train engagement model (second metric)
# ------------------------------------------------------------------ #

def train_engagement_model(df: pd.DataFrame):
    """Train a GradientBoosting regressor predicting engagement_rate."""
    feature_cols = [c for c in FEATURE_COLS if c in df.columns]
    df = df.copy()
    if "boost_budget_php" in df.columns:
        df["boost_budget_php"] = df["boost_budget_php"].fillna(0)

    X = df[feature_cols].copy()
    y = df[TARGET_ENGAGEMENT].copy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=config.SEED
    )
    preprocessor, _, _ = build_preprocessor(X_train)

    model = Pipeline(steps=[
        ("prep", preprocessor),
        ("reg", GradientBoostingRegressor(n_estimators=200, max_depth=3, learning_rate=0.05, min_samples_leaf=10, subsample=0.8, random_state=config.SEED)),
    ])
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    eng_mae = mean_absolute_error(y_test, y_pred)
    eng_r2 = r2_score(y_test, y_pred)
    train_r2 = r2_score(y_train, model.predict(X_train))
    print(f"\nEngagement model — MAE: {eng_mae:.4f} | Test R²: {eng_r2:.4f} | Train R²: {train_r2:.4f} | Gap: {train_r2 - eng_r2:.4f}")

    joblib.dump(model, config.SOCIAL_MEDIA_ENGAGEMENT_MODEL)
    print(f"Engagement model saved: {config.SOCIAL_MEDIA_ENGAGEMENT_MODEL}")
    return model, feature_cols


# ------------------------------------------------------------------ #
# 7. Batch inference — generate recommendation grid
# ------------------------------------------------------------------ #

def run_batch_inference(df_raw: pd.DataFrame, best_model, feature_cols: list,
                        engagement_model=None) -> pd.DataFrame:
    """Score realistic platform × post_type × media_type × content_topic × day combos.

    Only generates combinations where the platform–media_type pair has
    actually been observed in the training data (e.g., no YouTube+Photo).
    """
    # Discover which media types are valid for each platform
    valid_platform_media = (
        df_raw.groupby(["platform", "media_type"])
        .size()
        .reset_index(name="count")
        [["platform", "media_type"]]
    )
    valid_pairs = set(zip(valid_platform_media["platform"], valid_platform_media["media_type"]))

    post_types     = sorted(df_raw["post_type"].unique())
    content_topics = sorted(df_raw["content_topic"].unique())
    days = ["Monday", "Tuesday", "Wednesday", "Thursday",
            "Friday", "Saturday", "Sunday"]

    # Fixed values for features not being varied
    mode_sentiment  = df_raw["sentiment_tone"].mode()[0]
    median_hour     = int(df_raw["post_hour"].median())
    median_hashtags = int(df_raw["num_hashtags"].median())
    median_caption  = int(df_raw["caption_length"].median())

    combos = []
    for plat, mt in valid_pairs:
        for pt, topic, day in product(post_types, content_topics, days):
            combos.append({
                "platform":               plat,
                "post_type":              pt,
                "media_type":             mt,
                "content_topic":          topic,
                "sentiment_tone":         mode_sentiment,
                "day_of_week":            day,
                "post_hour":              median_hour,
                "has_call_to_action":     True,
                "is_boosted":             False,
                "num_hashtags":           median_hashtags,
                "caption_length":         median_caption,
                "features_resident_story": False,
                "mentions_count":         1,
                "boost_budget_php":       0,
            })

    combos_df = pd.DataFrame(combos)
    combos_df["predicted_donation_referrals"] = (
        best_model.predict(combos_df[feature_cols]).clip(min=0).round(1)
    )

    if engagement_model is not None:
        combos_df["predicted_engagement_rate"] = (
            engagement_model.predict(combos_df[feature_cols]).clip(min=0).round(4)
        )
    else:
        combos_df["predicted_engagement_rate"] = None

    combos_df["prediction_timestamp"] = datetime.now(timezone.utc).isoformat()

    # Keep only the varying columns + predictions
    output_cols = [
        "platform", "post_type", "media_type", "content_topic", "day_of_week",
        "predicted_donation_referrals", "predicted_engagement_rate",
        "prediction_timestamp",
    ]
    recommendations = combos_df[output_cols].sort_values(
        "predicted_donation_referrals", ascending=False
    )

    print(f"Scored {len(recommendations):,} posting-strategy combinations.")
    print("Top 5 recommendations:")
    print(recommendations.head(5).to_string(index=False))
    return recommendations


def write_recommendations(recommendations: pd.DataFrame) -> None:
    if config.USE_DATABASE:
        utils_db.write_table(recommendations, "social_media_recommendations", if_exists="replace")
    else:
        out = config.ARTIFACT_DIR / "social_media_recommendations.csv"
        recommendations.to_csv(out, index=False)
        print(f"Saved recommendations CSV: {out}")


# ------------------------------------------------------------------ #
# Entry point
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    print("=" * 60)
    print("Social Media Performance Predictor — Training")
    print("=" * 60)

    df = load_data()

    (best_model, best_model_name, feature_cols,
     X_train, X_test, y_train, y_test,
     final_mae, final_rmse, final_r2, baseline_mae, cv_df) = train(df)

    save_artifacts(best_model, best_model_name, feature_cols,
                   X_train, X_test, final_mae, final_rmse, final_r2, baseline_mae, cv_df)

    engagement_model, _ = train_engagement_model(df)

    recommendations = run_batch_inference(df, best_model, feature_cols, engagement_model)
    write_recommendations(recommendations)

    print("\nSocial media pipeline complete.")

"""
utils_db.py — Azure SQL connection helpers for all ML pipeline scripts.

Provides:
  - get_engine()        : returns a SQLAlchemy engine
  - load_table(name)    : read a table into a DataFrame
  - write_table(df, name, if_exists) : write a DataFrame back to the DB

Handles Azure SQL free-tier cold starts by retrying on connection timeout.
"""

import time

import pandas as pd
from sqlalchemy import create_engine, text

from config import CONNECTION_STRING, USE_DATABASE

# Azure SQL free tier pauses after ~60 min of inactivity.
# First connection wakes it up (takes 30-60 sec), so we retry.
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 30
CONNECTION_TIMEOUT = 120  # seconds


def get_engine():
    """
    Return a SQLAlchemy engine for Azure SQL with a longer
    connection timeout to handle cold starts.

    Raises RuntimeError if USE_DATABASE is False or the
    connection string is not set.
    """
    if not USE_DATABASE:
        raise RuntimeError(
            "USE_DATABASE is False. Set it to True and provide "
            "AZURE_SQL_CONNECTION_STRING before using the database."
        )
    if not CONNECTION_STRING:
        raise RuntimeError(
            "AZURE_SQL_CONNECTION_STRING environment variable is not set."
        )

    # Append connection timeout if not already in the string
    conn_str = CONNECTION_STRING
    if "Connection Timeout" not in conn_str and "connect_timeout" not in conn_str.lower():
        separator = "&" if "?" in conn_str else "?"
        conn_str = f"{conn_str}{separator}Connection+Timeout={CONNECTION_TIMEOUT}"

    return create_engine(conn_str, fast_executemany=True)


def _connect_with_retry(engine):
    """
    Attempt to connect to the database with retries.
    Azure SQL free tier may be paused and needs time to wake up.
    """
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            conn = engine.connect()
            if attempt > 1:
                print(f"  Connected on attempt {attempt}.")
            return conn
        except Exception as e:
            if attempt == MAX_RETRIES:
                raise
            print(f"  Connection attempt {attempt}/{MAX_RETRIES} failed: {e}")
            print(f"  Retrying in {RETRY_DELAY_SECONDS}s (database may be waking up)...")
            time.sleep(RETRY_DELAY_SECONDS)


def load_table(table_name: str) -> pd.DataFrame:
    """
    Read a full Azure SQL table into a DataFrame.

    Args:
        table_name: SQL table name (no schema prefix needed if using dbo).

    Returns:
        pd.DataFrame with all rows from the table.
    """
    engine = get_engine()
    with _connect_with_retry(engine) as conn:
        df = pd.read_sql(text(f"SELECT * FROM {table_name}"), conn)
    print(f"Loaded {len(df):,} rows from [{table_name}].")
    return df


def write_table(
    df: pd.DataFrame,
    table_name: str,
    if_exists: str = "replace",
    index: bool = False,
) -> None:
    """
    Write a DataFrame to an Azure SQL table.

    Args:
        df:         DataFrame to write.
        table_name: Destination table name.
        if_exists:  'replace' (drop + recreate) or 'append'.
        index:      Whether to write the DataFrame index as a column.
    """
    engine = get_engine()
    # Verify connection is alive before writing (handles cold start)
    with _connect_with_retry(engine) as conn:
        conn.execute(text("SELECT 1"))
    df.to_sql(table_name, engine, if_exists=if_exists, index=index)
    print(f"Wrote {len(df):,} rows to [{table_name}] (if_exists='{if_exists}').")

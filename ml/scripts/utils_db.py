"""
utils_db.py — Azure SQL connection helpers for all ML pipeline scripts.

Provides:
  - get_engine()        : returns a SQLAlchemy engine
  - load_table(name)    : read a table into a DataFrame
  - write_table(df, name, if_exists) : write a DataFrame back to the DB
"""

import pandas as pd
from sqlalchemy import create_engine, text

from config import CONNECTION_STRING, USE_DATABASE


def get_engine():
    """
    Return a SQLAlchemy engine for Azure SQL.

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
    return create_engine(CONNECTION_STRING, fast_executemany=True)


def load_table(table_name: str) -> pd.DataFrame:
    """
    Read a full Azure SQL table into a DataFrame.

    Args:
        table_name: SQL table name (no schema prefix needed if using dbo).

    Returns:
        pd.DataFrame with all rows from the table.
    """
    engine = get_engine()
    with engine.connect() as conn:
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
    df.to_sql(table_name, engine, if_exists=if_exists, index=index)
    print(f"Wrote {len(df):,} rows to [{table_name}] (if_exists='{if_exists}').")

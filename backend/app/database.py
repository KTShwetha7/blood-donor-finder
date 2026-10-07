"""
Database Configuration & Session Management
--------------------------------------------
Configures SQLAlchemy to connect to the SQLite database.
Provides a database session generator (get_db) for FastAPI route dependencies.
"""

from typing import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

# SQLite requires 'check_same_thread: False' so multiple requests/threads can access the connection
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Create the SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,  # Logs generated SQL queries to terminal in debug mode
)

# Create a session factory to generate database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all database models
Base = declarative_base()


def migrate_sqlite_user_location_columns() -> None:
    """Add nullable location columns to existing SQLite user tables without losing rows."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    location_columns = {
        "address": "TEXT",
        "city": "VARCHAR(100)",
        "state": "VARCHAR(100)",
        "pincode": "VARCHAR(20)",
    }
    with engine.begin() as connection:
        for column_name, column_type in location_columns.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"))


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI Dependency:
    Yields a database session per request and automatically closes it when the request is done.
    
    Usage in FastAPI route:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

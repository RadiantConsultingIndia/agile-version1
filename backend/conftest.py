import os

# database.py creates a SQLAlchemy engine at import time. create_engine() is lazy —
# it doesn't actually connect until a query runs — so a syntactically valid but fake
# URL is enough to let every model file import cleanly in CI with no real database.
# Must stay a postgres-style URL, not sqlite: database.py passes pool_size/max_overflow/
# pool_timeout to create_engine(), which only Postgres-style (QueuePool) engines accept —
# SQLite's default pool rejects those kwargs immediately at creation time.
os.environ.setdefault("DATABASE_URL", "postgresql://ci:ci@localhost/ci_fake_db")

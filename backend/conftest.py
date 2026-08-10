import os

# database.py creates a SQLAlchemy engine at import time. create_engine() is lazy —
# it doesn't actually connect until a query runs — so a syntactically valid but fake
# URL is enough to let every model file import cleanly in CI with no real database.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

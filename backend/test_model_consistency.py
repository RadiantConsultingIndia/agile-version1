"""
Regression check for the bug class that hit AgileHire repeatedly in production:
a model field (or the model file itself) is added/renamed in main.py's route code,
but the actual SQLAlchemy model class is never updated or never deployed — surfacing
as a TypeError or ModuleNotFoundError only when a real user hits that code path.

Examples this would have caught before they shipped: paste_count, require_id_upload,
logo_url, id_photo_url, transcript_json all being passed to model constructors that
didn't yet declare those columns; and models.employer_jd being imported before the
file existed in the deployed repo.

This test needs no database connection and no live server — it statically parses
main.py's source and cross-checks it against the actual model classes.
"""
import ast
import importlib
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

MAIN_PY = BACKEND_DIR / "main.py"
_SOURCE = MAIN_PY.read_text(encoding="utf-8")
_TREE = ast.parse(_SOURCE)


def _parse_model_imports():
    """{ClassName: 'models.module_name'} for every `from models.X import Y[, Z...]` line."""
    imports = {}
    for node in ast.walk(_TREE):
        if isinstance(node, ast.ImportFrom) and node.module and node.module.startswith("models."):
            for alias in node.names:
                imports[alias.asname or alias.name] = node.module
    return imports


MODEL_IMPORTS = _parse_model_imports()


def _model_classes():
    """Best-effort import of every model class. Failures are swallowed here so one
    broken model doesn't hide the results for every other model — the import-failure
    test below is what's supposed to surface that specific failure clearly."""
    classes = {}
    for class_name, module_name in MODEL_IMPORTS.items():
        try:
            module = importlib.import_module(module_name)
            cls = getattr(module, class_name, None)
        except Exception:
            cls = None
        if cls is not None and hasattr(cls, "__table__"):
            classes[class_name] = cls
    return classes


MODEL_CLASSES = _model_classes()


def _find_model_constructor_calls():
    """Every `ModelClass(kw1=..., kw2=...)` call site in main.py, as (class_name, lineno, [kwarg names])."""
    model_names = set(MODEL_IMPORTS.keys())
    calls = []
    for node in ast.walk(_TREE):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in model_names:
            kwarg_names = [kw.arg for kw in node.keywords if kw.arg is not None]
            if kwarg_names:
                calls.append((node.func.id, node.lineno, tuple(kwarg_names)))
    return calls


CONSTRUCTOR_CALLS = _find_model_constructor_calls()


@pytest.mark.parametrize(
    "class_name,module_name",
    sorted(MODEL_IMPORTS.items()),
    ids=[f"{c}<-{m}" for c, m in sorted(MODEL_IMPORTS.items())],
)
def test_every_imported_model_file_exists_and_exports_its_class(class_name, module_name):
    module = importlib.import_module(module_name)
    assert hasattr(module, class_name), (
        f"main.py imports `{class_name}` from `{module_name}`, but that module has no such attribute. "
        f"Either the model file wasn't deployed, or the class was renamed."
    )


@pytest.mark.parametrize(
    "class_name,lineno,kwargs",
    CONSTRUCTOR_CALLS,
    ids=[f"{c}:L{l}" for c, l, _ in CONSTRUCTOR_CALLS],
)
def test_constructor_kwargs_match_model_columns(class_name, lineno, kwargs):
    if class_name not in MODEL_CLASSES:
        pytest.skip(f"{class_name} failed to import — see test_every_imported_model_file_exists_and_exports_its_class")
    valid_columns = set(MODEL_CLASSES[class_name].__table__.columns.keys())
    invalid = [k for k in kwargs if k not in valid_columns]
    assert not invalid, (
        f"main.py:{lineno} constructs {class_name}(...) with invalid field(s) {invalid}. "
        f"Valid columns on {class_name}: {sorted(valid_columns)}"
    )

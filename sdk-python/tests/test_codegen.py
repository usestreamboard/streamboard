from __future__ import annotations

from streamboard.codegen import generate

SCHEMA_DOC = {
    "streamboardId": "abcd",
    "version": "3.0.0",
    "fields": [],
    "jsonSchema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "StreamboardState_abcd",
        "type": "object",
        "properties": {
            # dotted path → folded into nested TypedDicts
            "kpis.mrr.value": {"type": "string"},
            "kpis.mrr.trend": {"enum": ["up", "down", "flat"]},
            "rows": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string"},
                        "count": {"type": "integer"},
                    },
                },
            },
            "ratio": {"type": "number"},
        },
    },
}


def test_generate_emits_typeddicts() -> None:
    code = generate(SCHEMA_DOC)
    assert "from typing import Any, Literal, TypedDict" in code
    assert "class StreamboardState(TypedDict, total=False):" in code
    # dotted path folded
    assert "kpis:" in code
    assert "value: str" in code
    assert "Literal['up', 'down', 'flat']" in code
    assert "ratio: float" in code
    assert "list[" in code
    assert "count: int" in code


def test_generated_code_is_importable(tmp_path) -> None:
    code = generate(SCHEMA_DOC)
    f = tmp_path / "gen_state.py"
    f.write_text(code)
    ns: dict = {}
    exec(compile(code, str(f), "exec"), ns)  # noqa: S102
    assert "StreamboardState" in ns
    # TypedDict is constructible from a matching dict at runtime.
    sd = ns["StreamboardState"]
    assert sd(ratio=0.5) == {"ratio": 0.5}


def test_empty_schema() -> None:
    code = generate({"streamboardId": "x", "version": "1.0.0", "jsonSchema": {}})
    assert "class StreamboardState(TypedDict, total=False):" in code
    assert "pass" in code

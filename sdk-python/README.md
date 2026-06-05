# streamboard (Python)

Push live data to a [streamboard](https://usestreamboard.com) — keep KPI
tiles, charts, and tables fresh from a cron, agent, or any process,
without re-asking an LLM. Mirrors the TypeScript `@streamboard/sdk`.

```bash
uv add streamboard          # or: pip install streamboard
```

```python
import os
from streamboard import Streamboard

board = Streamboard(token=os.environ["STREAMBOARD_TOKEN"])

board.push({"kpis": {"mrr": {"value": "$48.2k", "delta": "+4%", "trend": "up"}}})

snap = board.pull()
print(snap.version, snap.updated_at, snap.state)
```

Auth is a per-streamboard bearer token (`sb_d_<id>_<secret>`) minted at
`/app/s/:id/tokens`. Each token belongs to one board, so the server
resolves the target board from the token — you pass nothing but the
bearer. (Set `streamboard_id=` only to address a board explicitly.)
`push()` is last-write-wins — send the full envelope the spec expects.
429 / 5xx / network failures retry with jittered backoff honouring
`Retry-After`.

## Typed state

Generate `TypedDict`s for a board's state envelope from its live schema:

```bash
streamboard-codegen --token "$STREAMBOARD_TOKEN" -o state_types.py
```

```python
from state_types import StreamboardState
state: StreamboardState = {"kpis": {"mrr": {"value": "$48.2k"}}}
board.push(state)
```

## Develop

```bash
uv sync
uv run ruff check . && uv run ruff format --check .
uv run ty check
uv run pytest
```

> Will move into the public `streamboard-sdks` monorepo (ts / go / python
> / cli) — tracked separately; built in-tree here first.

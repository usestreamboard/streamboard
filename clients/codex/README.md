# MemCard Integration for OpenAI Codex

A Codex integration that connects to the MemCard MCP server for spaced-repetition flashcard management.

## Prerequisites

- [Codex CLI](https://github.com/openai/codex) installed
- A deployed MemCard MCP server (see `apps/mcp/`)
- A MemCard account (email/password)

## Installation

1. Copy the config into your project (or merge with your existing config):

```bash
cp -r integrations/codex/.codex .codex
```

2. Copy the skills into your project:

```bash
cp -r integrations/codex/skills/* .codex/skills/
```

3. Trust the project when Codex prompts you, so it picks up `.codex/config.toml`.

4. Authenticate with the MemCard MCP server on first use — Codex will handle the OAuth flow.

## Skills

| Skill | Description |
|---|---|
| `review [deck-slug]` | Start an interactive review session for due cards |
| `create-deck <topic>` | Create a new deck and optionally generate cards |
| `generate-cards <file> [deck-slug]` | Generate flashcards from source files or docs |
| `study-summary` | Show study progress across all decks |

The `memcard-context` skill is loaded automatically when you ask about the Leitner system or spaced repetition.

## Project Instructions

Copy `AGENTS.md` to your project root to give Codex context about the MemCard system:

```bash
cp integrations/codex/AGENTS.md AGENTS.md
```

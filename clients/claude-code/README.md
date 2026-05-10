# MemCard Plugin for Claude Code

A Claude Code plugin that connects to the MemCard MCP server for spaced-repetition flashcard management.

## Prerequisites

- A deployed MemCard MCP server (see `apps/mcp/`)
- A MemCard account (email/password)

## Installation

**Local development:**

```bash
claude --plugin-dir ./plugins/memcard
```

**First-time setup:** Run `/mcp` in Claude Code to authenticate with the MemCard server via OAuth.

## Skills

| Skill | Description |
|---|---|
| `/memcard:review [deck-slug]` | Start an interactive review session for due cards |
| `/memcard:create-deck <topic>` | Create a new deck and optionally generate cards |
| `/memcard:generate-cards <file> [deck-slug]` | Generate flashcards from source files or docs |
| `/memcard:study-summary` | Show study progress across all decks |

The `memcard-context` skill is loaded automatically when you ask about the Leitner system or spaced repetition.
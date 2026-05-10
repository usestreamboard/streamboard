# Streamboard Plugin for Claude Code

A Claude Code plugin that connects to the Streamboard MCP server for spaced-repetition flashcard management.

## Prerequisites

- A deployed Streamboard MCP server (see `apps/mcp/`)
- A Streamboard account (email/password)

## Installation

**Local development:**

```bash
claude --plugin-dir ./plugins/streamboard
```

**First-time setup:** Run `/mcp` in Claude Code to authenticate with the Streamboard server via OAuth.

## Skills

| Skill | Description |
|---|---|
| `/streamboard:review [deck-slug]` | Start an interactive review session for due cards |
| `/streamboard:create-deck <topic>` | Create a new deck and optionally generate cards |
| `/streamboard:generate-cards <file> [deck-slug]` | Generate flashcards from source files or docs |
| `/streamboard:study-summary` | Show study progress across all decks |

The `streamboard-context` skill is loaded automatically when you ask about the Leitner system or spaced repetition.
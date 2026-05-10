---
name: memcard-context
description: Background knowledge about the MemCard spaced-repetition system, Leitner boxes, and available MCP tools. Use when the user asks about flashcards, spaced repetition, Leitner system, or MemCard.
---

# MemCard System Context

MemCard is a spaced-repetition flashcard app using the Leitner box system.

## Leitner Box System

Cards progress through 5 boxes with increasing review intervals:
- **Box 1**: Review daily (new or failed cards)
- **Box 2**: Review every 3 days
- **Box 3**: Review every 7 days
- **Box 4**: Review every 14 days
- **Box 5**: Review every 30 days

**Pass**: card moves to the next box. **Fail**: card drops back to box 1.
Users can customize intervals globally or per-deck via scheduling settings.

## Available MCP Tools

### Decks
- `list_decks` — List all decks with card and due counts. No parameters.
- `get_deck` — Get deck details and all cards. Params: `slug` (string).
- `create_deck` — Create a deck. Params: `title` (string), `description` (string, optional).
- `update_deck` — Update deck. Params: `id` (string), `title` (string, optional), `description` (string, optional).
- `delete_deck` — Delete deck and all cards. Params: `id` (string).

### Cards
- `create_card` — Create a card. Params: `deckId` (string), `front` (string), `back` (string), `tags` (string[], optional), `sourceNote` (string, optional).
- `update_card` — Update a card. Params: `id` (string), `front` (string, optional), `back` (string, optional), `tags` (string[], optional).
- `delete_card` — Delete a card. Params: `id` (string).

### Review
- `get_due_cards` — Get cards due for review. Params: `deckId` (string, optional).
- `submit_review` — Submit pass/fail. Params: `cardId` (string), `result` ("pass" | "fail").
- `reset_card` — Reset card to box 1. Params: `cardId` (string).

## Data Model

- **Decks** have a title, description, slug, and belong to a user
- **Cards** have front/back text, optional tags (string array), and optional sourceNote
- **Review state** tracks box number and next review date per user per card

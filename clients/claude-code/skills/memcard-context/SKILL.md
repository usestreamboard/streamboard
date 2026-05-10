---
name: memcard-context
description: Background knowledge about the MemCard spaced-repetition system, Leitner boxes, and available CLI commands. Use when the user asks about flashcards, spaced repetition, Leitner system, or MemCard.
user-invocable: false
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

## CLI Commands

All commands output compact JSON to stdout. Use `--pretty` for human-readable output.

### Decks
- `memcard decks ls` — List all decks with card and due counts. Optional: `--folder <id|none|all>`
- `memcard decks get <slug>` — Get deck details and all cards.
- `memcard decks create <title>` — Create a deck. Optional: `--desc <d>`, `--folder <id>`
- `memcard decks update <id>` — Update deck. Optional: `--title <t>`, `--desc <d>`
- `memcard decks rm <id>` — Delete deck and all cards.

### Cards
- `memcard cards create <deck-id> <front> <back>` — Create a card. Optional: `--tags t1,t2`, `--source <s>`, `--type classic|cloze`
- `memcard cards update <id>` — Update a card. Optional: `--front <f>`, `--back <b>`, `--tags t1,t2`
- `memcard cards rm <id>` — Delete a card.
- `echo '<json>' | memcard cards batch-create <deck-id> --stdin` — Batch create cards from JSON array.
- `echo '<json>' | memcard cards batch-update --stdin` — Batch update cards from JSON array.

### Review
- `memcard review due [deck-id]` — Get cards due for review.
- `memcard review submit <card-id> <pass|fail>` — Submit review result.
- `memcard review reset <card-id>` — Reset card to box 1.

### Courses
- `memcard courses ls` — List all courses.
- `memcard courses get <slug>` — Get course details and sections.
- `memcard courses create <title>` — Create a course. Optional: `--desc <d>`
- `memcard courses update <id>` — Update course. Optional: `--title <t>`, `--desc <d>`
- `memcard courses rm <id>` — Delete a course.
- `echo '<json>' | memcard courses create-full --stdin` — Create full course with sections and cards.

## Data Model

- **Decks** have a title, description, slug, and belong to a user
- **Cards** have front/back text, optional tags (string array), and optional sourceNote
- **Review state** tracks box number and next review date per user per card

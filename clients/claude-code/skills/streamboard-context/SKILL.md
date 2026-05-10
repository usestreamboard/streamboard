---
name: streamboard-context
description: Background knowledge about the Streamboard spaced-repetition system, Leitner boxes, and available CLI commands. Use when the user asks about flashcards, spaced repetition, Leitner system, or Streamboard.
user-invocable: false
---

# Streamboard System Context

Streamboard is a spaced-repetition flashcard app using the Leitner box system.

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
- `streamboard decks ls` — List all decks with card and due counts. Optional: `--folder <id|none|all>`
- `streamboard decks get <slug>` — Get deck details and all cards.
- `streamboard decks create <title>` — Create a deck. Optional: `--desc <d>`, `--folder <id>`
- `streamboard decks update <id>` — Update deck. Optional: `--title <t>`, `--desc <d>`
- `streamboard decks rm <id>` — Delete deck and all cards.

### Cards
- `streamboard cards create <deck-id> <front> <back>` — Create a card. Optional: `--tags t1,t2`, `--source <s>`, `--type classic|cloze`
- `streamboard cards update <id>` — Update a card. Optional: `--front <f>`, `--back <b>`, `--tags t1,t2`
- `streamboard cards rm <id>` — Delete a card.
- `echo '<json>' | streamboard cards batch-create <deck-id> --stdin` — Batch create cards from JSON array.
- `echo '<json>' | streamboard cards batch-update --stdin` — Batch update cards from JSON array.

### Review
- `streamboard review due [deck-id]` — Get cards due for review.
- `streamboard review submit <card-id> <pass|fail>` — Submit review result.
- `streamboard review reset <card-id>` — Reset card to box 1.

### Courses
- `streamboard courses ls` — List all courses.
- `streamboard courses get <slug>` — Get course details and sections.
- `streamboard courses create <title>` — Create a course. Optional: `--desc <d>`
- `streamboard courses update <id>` — Update course. Optional: `--title <t>`, `--desc <d>`
- `streamboard courses rm <id>` — Delete a course.
- `echo '<json>' | streamboard courses create-full --stdin` — Create full course with sections and cards.

## Data Model

- **Decks** have a title, description, slug, and belong to a user
- **Cards** have front/back text, optional tags (string array), and optional sourceNote
- **Review state** tracks box number and next review date per user per card

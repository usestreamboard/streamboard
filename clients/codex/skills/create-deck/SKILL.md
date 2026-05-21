---
name: create-deck
description: Create a new Streamboard deck and optionally populate it with flashcards from a topic
argument-hint: "<topic-or-title>"
---

# Create Deck

Create a new flashcard deck and optionally generate cards for it.

## Steps

1. Use "$ARGUMENTS" as the deck topic or title.

2. Create the deck with `create_deck`. Derive a clear, concise title and description from the topic.

3. Ask the user if they want to generate cards for this deck now.
   - If yes, generate 10-15 high-quality flashcards covering the topic.
   - Create all cards in one call with `batch_create_cards` using the new deck's `id` as `deckId`.
   - Add relevant `tags` to each card for categorization.

4. Show the user a summary: deck title, slug, and a list of created cards.

## Card Quality Guidelines

- One concept per card
- Prefer "what", "how", "why" questions over yes/no
- Keep answers concise but complete
- Use tags to categorize cards by subtopic
- For code topics, include code snippets in markdown format

---
name: create-deck
description: Create a new Streamboard deck and optionally populate it with flashcards from a topic
disable-model-invocation: true
allowed-tools: Bash(streamboard *)
argument-hint: "<topic-or-title>"
---

# Create Deck

Create a new flashcard deck and optionally generate cards for it.

## Steps

1. Use "$ARGUMENTS" as the deck topic or title.

2. Create the deck: `streamboard decks create "<title>" --desc "<description>"`

3. Ask the user if they want to generate cards for this deck now.
   - If yes, generate 10-15 high-quality flashcards covering the topic.
   - Create all cards in one call by piping JSON to stdin:
     ```bash
     echo '[{"front":"Q","back":"A","tags":["topic"]}]' | streamboard cards batch-create <deck-id> --stdin
     ```
   - Add relevant `tags` to each card for categorization.

4. Show the user a summary: deck title, slug, and a list of created cards.

## Card Quality Guidelines

- One concept per card
- Prefer "what", "how", "why" questions over yes/no
- Keep answers concise but complete
- Use tags to categorize cards by subtopic
- For code topics, include code snippets in markdown format

## Card Formatting

- Card backs are rendered as **markdown** — use formatting appropriately
- Use **real newlines** in strings, never escaped `\n` sequences
- Wrap code snippets in fenced code blocks with language tags (```js, ```py, etc.)
- Use bullet points or numbered lists for multi-point answers
- Bold key terms with **double asterisks**
- Keep answers concise: aim for 1-4 short paragraphs or a short list

---
name: generate-cards
description: Generate flashcards from source material (files, notes, documentation) and add them to a Streamboard deck
disable-model-invocation: true
allowed-tools: Bash(streamboard *), Read, Glob, Grep
argument-hint: "<file-or-topic> [deck-slug]"
---

# Generate Cards from Source Material

Create flashcards from files, code, or documentation and add them to a deck.

## Steps

1. Parse "$ARGUMENTS":
   - If a file path is provided, read it with the Read tool.
   - If a deck slug is provided as the second argument, use that deck.
   - Otherwise, run `streamboard decks ls` and ask which deck to add cards to.

2. Analyze the source material and generate flashcards:
   - For code: create cards about functions, patterns, APIs, and key concepts
   - For documentation: extract key facts, definitions, and procedures
   - For notes: identify core concepts and relationships

3. Present the proposed cards to the user for approval before creating them. Show each card's front and back.

4. Create approved cards by piping JSON to stdin:
   ```bash
   echo '[{"front":"Q1","back":"A1","tags":["topic"],"sourceNote":"source.ts"}]' | streamboard cards batch-create <deck-id> --stdin
   ```
   Add relevant `tags` and set `sourceNote` to reference the original source.

5. Show a summary of cards created.

## Card Generation Principles

- Extract the most important concepts, not every detail
- Frame questions to test understanding, not just recall
- Include context in questions to avoid ambiguity
- For code: test understanding of why, not just what
- Tag cards with the source file or topic

## Card Formatting

- Card backs are rendered as **markdown** — use formatting appropriately
- Use **real newlines** in strings, never escaped `\n` sequences
- Wrap code snippets in fenced code blocks with language tags (```js, ```py, etc.)
- Use bullet points or numbered lists for multi-point answers
- Bold key terms with **double asterisks**
- Keep answers concise: aim for 1-4 short paragraphs or a short list

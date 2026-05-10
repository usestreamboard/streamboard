---
name: study-summary
description: Show a summary of your Streamboard study progress across all decks
disable-model-invocation: true
allowed-tools: Bash(streamboard *)
---

# Study Summary

Provide an overview of the user's study progress.

## Steps

1. Run `streamboard decks ls` to get all decks with card counts and due counts.

2. Run `streamboard review due` to get all due cards across decks.

3. Present a formatted summary:
   - Total decks, total cards, total due cards
   - Per-deck breakdown as a table: deck title, card count, due count
   - Which deck has the most due cards (suggest reviewing it)

4. Offer actionable suggestions:
   - If there are due cards, suggest starting a review with `/streamboard:review`
   - If a deck has many cards in box 1, suggest focused study
   - If no cards are due, congratulate the user and mention when the next cards will be due

---
name: review
description: Start a spaced-repetition review session for your Streamboard flashcards
argument-hint: "[deck-slug]"
---

# Review Session

Start a flashcard review session using the Leitner box system.

## Steps

1. If "$ARGUMENTS" is provided, treat it as a deck slug. Call `list_decks` to find the
   matching deck's ID, then call `get_due_cards` with that `deckId`. If no argument is
   provided, call `list_decks` to show all decks with due counts and ask which deck to
   review (or offer to review all due cards).

2. Fetch due cards with `get_due_cards`.

3. If no cards are due, tell the user and stop.

4. Review up to 20 cards per session. For each due card:
   - Show the **front** of the card and the deck it belongs to
   - Wait for the user to respond (they will attempt to answer or say "show answer")
   - Show the **back** of the card
   - Ask: "Did you get it right? (pass/fail)"
   - Submit the result with `submit_review` using the `cardId` and `result` ("pass" or "fail")
   - Report the new box number and next review date

5. After all cards are reviewed, show a summary:
   - Total cards reviewed
   - Pass/fail breakdown
   - Cards that moved up vs down in boxes

Keep the tone encouraging. For failed cards, briefly suggest a mnemonic or memory aid based on the card content.

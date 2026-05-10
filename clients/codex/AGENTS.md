# MemCard

MemCard is a spaced-repetition flashcard app using the Leitner box system. This project connects to a remote MCP server at `mcp.memcard.dev` for all flashcard operations.

## Available MCP Tools

### Decks
- `list_decks` — List all decks with card and due counts
- `get_deck` — Get deck details and all cards. Params: `slug`
- `create_deck` — Create a deck. Params: `title`, `description` (optional)
- `update_deck` — Update deck. Params: `id`, `title` (optional), `description` (optional)
- `delete_deck` — Delete deck and all cards. Params: `id`

### Cards
- `create_card` — Create a card. Params: `deckId`, `front`, `back`, `tags` (optional), `sourceNote` (optional)
- `update_card` — Update a card. Params: `id`, `front` (optional), `back` (optional), `tags` (optional)
- `delete_card` — Delete a card. Params: `id`

### Review
- `get_due_cards` — Get cards due for review. Params: `deckId` (optional)
- `submit_review` — Submit pass/fail. Params: `cardId`, `result` ("pass" | "fail")
- `reset_card` — Reset card to box 1. Params: `cardId`

# Methodology

Each record preserves source fields and adds `due_state`, `computed_reason`, and `as_of_date`. Required fields and enums are validated first. Invalid material data routes to `REVIEW`; nothing is guessed. Closed `WON/LOST/WITHDRAWN` records route to `CLOSED` before date logic. Valid open records compare `next_follow_up_date` to the explicit as-of date: before → `OVERDUE`; equal → `DUE_TODAY`; after → `UPCOMING`.

CSV and JSON serializers operate on the same current visible row array used by the UI after filter/search/sort. Tests use explicit dates; no hidden wall-clock date controls classification.

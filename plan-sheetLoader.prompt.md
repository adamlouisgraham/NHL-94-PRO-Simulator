## Plan: Sheet Loader Persistence and Connection Testing

TL;DR - Add localStorage persistence for custom sheet URLs, a button to test each sheet connection, and page-load restore for saved URL settings.

**Steps**
1. Update `index.html`
   - Add a new button in the existing start-screen sheet panel with `onclick="testSheetConnection()"`.
   - Keep the existing `APPLY CUSTOM SHEETS` button and message UI.

2. Update `script.js`
   - Add a new `SHEET_URL_STORAGE_KEY` constant for localStorage.
   - Add `saveSheetUrlPreferences(teamValue, playerValue, scheduleValue)` to persist the raw input values.
   - Add `loadSheetUrlPreferences()` to read stored sheet URLs on page load, populate the URL inputs, and call `applyCustomSheetUrls()`.
   - Modify `applyCustomSheetUrls()` to call `saveSheetUrlPreferences(...)` after setting `teamUrl`, `playerUrl`, and `scheduleUrl`.
   - Modify `resetSheetUrlsToDefault()` to clear the storage key when the user returns to default sheets.
   - Add `testSheetConnection()` with these behaviors:
     - Display a temporary status message like `Testing sheet connection...`.
     - Fetch each sheet URL via the existing `fetchCSV(url)` helper.
     - Parse each response with `parseCSV(text)`.
     - Confirm each sheet has at least one data row and produce a per-sheet result message.
     - Update `sheetUrlMessage` with either success statuses or error details.
   - Add a small helper such as `formatSheetStatus(statuses)` to format messages cleanly.
   - Register `document.addEventListener('DOMContentLoaded', loadSheetUrlPreferences)` so saved custom URLs are restored when the page loads.

3. Verify behavior
   - On page refresh, saved custom sheet URLs should reappear in the inputs and the message should indicate they were loaded.
   - Clicking `APPLY CUSTOM SHEETS` should persist the current values and set `teamUrl`, `playerUrl`, and `scheduleUrl`.
   - Clicking `TEST SHEET CONNECTION` should validate each sheet and show clear OK/error text.
   - Resetting to default via `resetSheetUrlsToDefault()` or existing workflow should clear persisted values.

**Relevant files**
- `script.js` — implement persistence helpers, test connection helper, and page-load restore
- `index.html` — add a dedicated test button for sheet validation

**Verification**
1. Reload the start screen after entering custom URLs; verify the fields still contain the URLs.
2. Confirm localStorage stores `nhl94CustomSheetUrls` with the raw input values.
3. Use valid and invalid URLs to confirm `TEST SHEET CONNECTION` returns expected status messages.
4. Confirm resetting defaults clears persisted values and resets inputs.

**Decisions**
- Persist raw input URLs instead of computed final URLs so defaults can still be applied when inputs are empty.
- Keep the existing sheet message element for status updates.
- Use the existing `fetchCSV()`/`parseCSV()` flow so validation matches actual load behavior.
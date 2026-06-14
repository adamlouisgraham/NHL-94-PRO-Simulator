## Plan: Fix Default Google Sheet URL Normalization

TL;DR - Adjust `script.js` so `normalizeSheetUrl()` accepts Google Sheets URLs using both `/spreadsheets/d/{id}` and `/spreadsheets/d/e/{id}` forms, allowing the app to load default published sheet URLs correctly.

**Steps**
1. Inspect `script.js` around `normalizeSheetUrl()`.
2. Update the internal regex from `/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/` to `/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/`.
3. Keep the existing logic for extracting `gid` from query or hash.
4. Test the app with default Google sheet URLs that contain `/d/e/` and verify CSV export targeting.

**Relevant files**
- `c:\Users\Justin\Downloads\Javascripts\NHL '94 PRO Simulator\script.js`

**Verification**
1. Load the app and confirm default Google sheets now load instead of failing.
2. Confirm custom sheet URLs still normalize correctly to CSV export links.
3. Validate no console errors arise from the `normalizeSheetUrl()` logic.

**Decisions**
- Only the regex path matching is changed; no other URL normalization or sheet-loading code needs adjustment.

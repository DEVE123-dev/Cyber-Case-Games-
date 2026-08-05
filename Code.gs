/**
 * Cyber Case: live leaderboard backend.
 *
 * This is a Google Apps Script bound to a Google Sheet. It gives the static
 * Cyber Case site a tiny REST style endpoint: POST a finished team's results
 * to it, GET the live leaderboard back from it. The Sheet itself is the
 * database, there is no other server and no accounts or API keys needed on
 * the frontend.
 *
 * HOW TO DEPLOY:
 * 1. Create (or open) the Google Sheet you want to hold the results.
 * 2. In the Sheet, go to Extensions > Apps Script.
 * 3. Delete anything in the default Code.gs file and paste this entire file in.
 * 4. Click Deploy > New deployment.
 * 5. Click the gear icon next to "Select type" and choose "Web app".
 * 6. Set "Execute as" to "Me" (your account).
 * 7. Set "Who has access" to "Anyone". This step matters: any other setting
 *    causes Google to redirect requests to a login page instead of running
 *    this script, which will make the site silently show "not connected".
 * 8. Click Deploy, then authorize the script when Google prompts you.
 * 9. Copy the Web app URL you are given.
 * 10. Paste that URL as the value of APPS_SCRIPT_URL in js/config.js in the
 *     Cyber Case project, then republish the static site.
 *
 * The "Results" sheet is created automatically, with headers, the first time
 * a result is posted or read. You do not need to create it by hand.
 *
 * A note on the header row: doGet keys each returned row by the literal
 * header text in row 1 (Timestamp, Team Name, Participants, ...). If you
 * rename a header cell in the Sheet UI later, the leaderboard admin page
 * will stop finding that column. Edit the HEADERS array below instead of
 * editing the Sheet directly if you need to change a column name.
 *
 * WIPE_SECRET below guards the "Wipe all leaderboard data" button on
 * admin.html, used while testing to clear out practice runs before the
 * real event. It must match WIPE_SECRET in js/admin-config.js exactly, or
 * wipe requests are rejected. Change it from the default before deploying.
 */

const SHEET_NAME = "Results";
const WIPE_SECRET = "kn1a8yKEfBma";
const HEADERS = [
  "Timestamp",
  "Team Name",
  "Participants",
  "Fake News Score",
  "Fake News Time",
  "AI Images Score",
  "AI Images Time",
  "Phishing Score",
  "Phishing Time",
  "Combined Score",
  "Combined Time",
];

function getResultsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function wipeResults_() {
  const sheet = getResultsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === "wipeAll") {
      if (data.secret !== WIPE_SECRET) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Wrong wipe secret" })).setMimeType(ContentService.MimeType.JSON);
      }
      wipeResults_();
      return ContentService.createTextOutput(JSON.stringify({ ok: true, wiped: true })).setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getResultsSheet_();
    sheet.appendRow([
      new Date(),
      data.teamName || "",
      data.members || "",
      data.fakeNewsScore,
      data.fakeNewsTime,
      data.aiImagesScore,
      data.aiImagesTime,
      data.phishingScore,
      data.phishingTime,
      data.combinedScore,
      data.combinedTime,
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const sheet = getResultsSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
}

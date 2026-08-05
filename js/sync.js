/* Cyber Case: optional live leaderboard sync. Fire and forget POST to the
   Apps Script endpoint once a team finishes all three stations. If
   APPS_SCRIPT_URL is blank, or the request fails for any reason (offline,
   blocked network, script not deployed), this fails silently and the game
   keeps working exactly as it does today with zero internet.

   Load order matters here: this file is loaded after data.js and config.js
   but before app.js, so the functions below reference state, TASK_ORDER,
   saveState, and renderDashboard as globals that do not exist yet at the
   moment this file runs. That is fine, since none of these functions are
   called until after app.js has finished its own top level setup (they are
   only invoked from submitTask() in app.js or from a dashboard button
   click). Do not reorder the script tags in index.html or wrap app.js in
   anything that hides its top level let/const from this file. */

function allTasksComplete(s) {
  return TASK_ORDER.every((key) => s.tasks[key].completed);
}

function buildResultsPayload(s) {
  const combinedScore = TASK_ORDER.reduce((sum, k) => sum + (s.tasks[k].score || 0), 0);
  const combinedTime = TASK_ORDER.reduce((sum, k) => sum + (s.tasks[k].timeSeconds || 0), 0);
  return {
    teamName: s.team.name,
    members: s.team.members,
    fakeNewsScore: s.tasks.fakenews.score,
    fakeNewsTime: s.tasks.fakenews.timeSeconds,
    aiImagesScore: s.tasks.aiimages.score,
    aiImagesTime: s.tasks.aiimages.timeSeconds,
    phishingScore: s.tasks.phishing.score,
    phishingTime: s.tasks.phishing.timeSeconds,
    combinedScore: combinedScore,
    combinedTime: combinedTime,
  };
}

function syncResultsIfNeeded() {
  if (!allTasksComplete(state) || state.synced) return;
  sendResultsToLeaderboard();
}

/* Sends the current team's combined results. Called automatically once, the
   moment the third station is submitted, and also from the "Retry sync"
   button on the dashboard. Uses mode: "no-cors" with a text/plain content
   type so the request never triggers a CORS preflight, we do not need to
   read the response. Because the response is opaque in no-cors mode, a
   resolved promise only means the request was dispatched without a network
   error, not that it was confirmed recorded in the sheet. That is why the
   dashboard still offers a manual retry rather than trusting this blindly. */
function sendResultsToLeaderboard() {
  if (!APPS_SCRIPT_URL || typeof fetch !== "function") return;
  try {
    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(buildResultsPayload(state)),
    })
      .then(() => {
        state.synced = true;
        saveState();
        renderDashboard();
      })
      .catch(() => {
        /* offline or blocked, fail silently, the team's results screen is unaffected */
      });
  } catch (e) {
    /* fail silently */
  }
}

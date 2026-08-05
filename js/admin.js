/* Cyber Case: read only leaderboard admin page. Standalone, not part of the
   hash router in app.js, it does not load data.js, sync.js, or app.js since
   it has no game state of its own, only config.js and admin-config.js. */

const REFRESH_MS = 10000;
const MAX_CONSECUTIVE_FAILURES = 3;
let refreshTimer = null;
let loggedInUser = "";
let hasLoadedOnce = false;
let consecutiveFailures = 0;

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pad2(n) {
  n = String(n);
  return n.length < 2 ? "0" + n : n;
}

function fmtTime(seconds) {
  const n = Number(seconds);
  if (seconds === "" || seconds == null || isNaN(n)) return "00:00";
  const m = pad2(Math.floor(n / 60));
  const s = pad2(n % 60);
  return m + ":" + s;
}

function fmtTimestamp(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

/* ---------- Access gate ----------
   Not real security, see the comment in admin.html. Checks the typed
   username and password against the ADMIN_USERS list in
   js/admin-config.js, up to 3 judges can each have their own login there. */

function checkAccessCode() {
  const userInput = document.getElementById("accessUsernameInput");
  const passInput = document.getElementById("accessPasswordInput");
  const error = document.getElementById("accessError");
  const username = userInput ? userInput.value.trim() : "";
  const password = passInput ? passInput.value : "";
  const match = ADMIN_USERS.some((u) => u.username === username && u.password === password);
  if (match) {
    loggedInUser = username;
    const modal = document.getElementById("accessModalBackdrop");
    /* .welcome-modal-backdrop sets display: flex unconditionally, so the
       hidden attribute alone will not hide it, an inline style is needed
       to actually win the cascade here. */
    modal.hidden = true;
    modal.style.display = "none";
    const loggedInEl = document.getElementById("loggedInAs");
    if (loggedInEl) loggedInEl.textContent = "Logged in as " + username;
    startLeaderboard();
  } else if (error) {
    error.hidden = false;
  }
}

/* ---------- Leaderboard ---------- */

function sortRows(rows) {
  return rows.slice().sort((a, b) => {
    const scoreA = Number(a["Combined Score"]) || 0;
    const scoreB = Number(b["Combined Score"]) || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const timeA = Number(a["Combined Time"]) || 0;
    const timeB = Number(b["Combined Time"]) || 0;
    return timeA - timeB;
  });
}

/* Plain HTML/CSS horizontal bar chart, one bar per team, ranking by combined
   score, tallest first (rows are already sorted before this is called). Bar
   length is relative to the current leader's score, not an absolute max, so
   it always reads as "how do the teams compare to each other right now."
   Every bar uses the same accent color, rank is shown by position and the
   trophy on the leader, never by recoloring a bar, since a color that jumps
   to a different bar whenever the standings change is more confusing than
   helpful. */
function renderScoreChart(sortedRows) {
  const maxScore = sortedRows.reduce((m, r) => Math.max(m, Number(r["Combined Score"]) || 0), 0);
  const barsHTML = sortedRows
    .map((row, i) => {
      const score = Number(row["Combined Score"]) || 0;
      const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
      const name = row["Team Name"] || "(no team name)";
      const crown = i === 0 && score > 0 ? "🏆 " : "";
      const label = name + ", combined score " + score + ", time " + fmtTime(row["Combined Time"]);
      return `
        <div class="bar-row" title="${esc(label)}" aria-label="${esc(label)}">
          <div class="bar-label">${crown}${esc(name)}</div>
          <div class="bar-track"><div class="bar-fill" style="width: ${pct}%"></div></div>
          <div class="bar-value">${score}</div>
        </div>`;
    })
    .join("");
  return `
    <div class="card chart-card">
      <h2 class="chart-title">Combined score by team</h2>
      <div class="bar-chart" role="img" aria-label="Bar chart of combined scores by team, highest first">${barsHTML}</div>
    </div>`;
}

function renderNotConnected(message) {
  const el = document.getElementById("leaderboardRegion");
  el.innerHTML = `<div class="card"><h2>Leaderboard not connected</h2><p>${esc(message)}</p></div>`;
}

function renderLeaderboard(rows) {
  const el = document.getElementById("leaderboardRegion");
  if (!rows.length) {
    el.innerHTML = `<div class="card"><h2>No results yet</h2><p>Results will appear here as teams finish all three stations.</p></div>`;
    return;
  }
  const sorted = sortRows(rows);
  const rowsHTML = sorted
    .map((row, i) => {
      const rank = i + 1;
      const detailId = "detail-" + i;
      return `
        <tr>
          <td class="rank-cell">${rank}</td>
          <td>${esc(row["Team Name"] || "")}</td>
          <td>${esc(row["Participants"] || "")}</td>
          <td>${esc(String(row["Combined Score"] != null ? row["Combined Score"] : ""))}</td>
          <td>${fmtTime(row["Combined Time"])}</td>
          <td><button class="expand-btn" data-target="${detailId}">Details</button></td>
        </tr>
        <tr class="detail-row" id="${detailId}" hidden>
          <td colspan="6">
            <div class="detail-grid">
              <div><span class="detail-label">Spot Fake News:</span> ${esc(String(row["Fake News Score"] != null ? row["Fake News Score"] : ""))} correct, ${fmtTime(row["Fake News Time"])}</div>
              <div><span class="detail-label">AI Images:</span> ${esc(String(row["AI Images Score"] != null ? row["AI Images Score"] : ""))} correct, ${fmtTime(row["AI Images Time"])}</div>
              <div><span class="detail-label">Phishing:</span> ${esc(String(row["Phishing Score"] != null ? row["Phishing Score"] : ""))} correct, ${fmtTime(row["Phishing Time"])}</div>
              <div><span class="detail-label">Submitted:</span> ${esc(fmtTimestamp(row["Timestamp"]))}</div>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  el.innerHTML = renderScoreChart(sorted) + `
    <div class="card">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Participants</th>
            <th>Score</th>
            <th>Time</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>`;

  Array.prototype.forEach.call(el.querySelectorAll(".expand-btn"), (btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.hidden = !target.hidden;
      btn.textContent = target.hidden ? "Details" : "Hide";
    });
  });
}

function setLastUpdated() {
  const el = document.getElementById("lastUpdated");
  if (!el) return;
  el.textContent = "Last updated: " + new Date().toLocaleTimeString();
}

function setConnectionWarning(show) {
  const el = document.getElementById("connectionWarning");
  if (!el) return;
  el.hidden = !show;
}

function fetchLeaderboardOnce() {
  return fetch(APPS_SCRIPT_URL, { cache: "no-store" }).then((res) => res.json());
}

function handleFetchSuccess(rows) {
  hasLoadedOnce = true;
  consecutiveFailures = 0;
  renderLeaderboard(rows);
  setLastUpdated();
  setConnectionWarning(false);
}

function handleFetchFailure() {
  consecutiveFailures++;
  if (!hasLoadedOnce || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    setConnectionWarning(false);
    renderNotConnected("Could not reach the leaderboard right now. Check the connection here, or check that the Apps Script web app is deployed with access set to Anyone.");
  } else {
    setConnectionWarning(true);
  }
}

/* A single missed refresh (a brief wifi drop, a moment of contention on the
   sheet from a team submitting at the same time, or Apps Script being slow
   to respond) should not blank out a leaderboard that was working a moment
   ago. Two layers of tolerance here:
   1. A quick, once-only retry a couple seconds after the first failure,
      before the next scheduled 10 second poll would even fire. Most blips
      are this short, so this alone absorbs the majority of them with
      nothing visible on screen at all.
   2. If that retry also fails, fall back to the same "keep showing the
      last good data with a small warning" behavior, only replacing the
      whole screen with "not connected" on the first load ever, or after
      several full poll cycles have failed in a row (a real outage). */
function fetchLeaderboard() {
  if (!APPS_SCRIPT_URL) {
    renderNotConnected("The leaderboard is not connected yet. Deploy Code.gs as a web app, then paste the web app URL into js/config.js as APPS_SCRIPT_URL.");
    return;
  }
  fetchLeaderboardOnce()
    .then(handleFetchSuccess)
    .catch(() => {
      setTimeout(() => {
        fetchLeaderboardOnce().then(handleFetchSuccess).catch(handleFetchFailure);
      }, 2000);
    });
}

function startLeaderboard() {
  fetchLeaderboard();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchLeaderboard, REFRESH_MS);
}

/* ---------- Danger zone: wipe all leaderboard data ----------
   Meant for clearing out test runs while preparing for the event, not for
   use once real teams have started. Uses the same mode: "no-cors" fire and
   forget POST pattern as js/sync.js, so a resolved fetch only means the
   request was sent without a network error, not a confirmed response. That
   is why this refetches the leaderboard afterward instead of trusting the
   POST alone, an empty leaderboard after refetching is the real proof it
   worked. */

function setWipeStatus(message) {
  const el = document.getElementById("wipeStatus");
  if (el) el.textContent = message;
}

function wipeAllData() {
  if (!APPS_SCRIPT_URL) {
    setWipeStatus("Not connected, nothing to wipe.");
    return;
  }
  if (!confirm("This permanently deletes every result on the leaderboard sheet. This cannot be undone. Continue?")) {
    return;
  }
  const typed = prompt('Type WIPE (all capitals) to confirm.');
  if (typed !== "WIPE") {
    setWipeStatus("Wipe canceled, confirmation text did not match.");
    return;
  }

  const btn = document.getElementById("wipeAllBtn");
  if (btn) btn.disabled = true;
  setWipeStatus("Wiping...");

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "wipeAll", secret: WIPE_SECRET }),
  })
    .then(() => {
      setWipeStatus("Wipe sent, refreshing leaderboard...");
      setTimeout(() => {
        fetchLeaderboard();
        setWipeStatus("Wipe complete.");
        if (btn) btn.disabled = false;
      }, 1500);
    })
    .catch(() => {
      setWipeStatus("Wipe failed, check the connection and try again.");
      if (btn) btn.disabled = false;
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const userInput = document.getElementById("accessUsernameInput");
  const passInput = document.getElementById("accessPasswordInput");
  const startBtn = document.getElementById("accessStartBtn");
  Array.prototype.forEach.call([userInput, passInput], (el) => {
    if (!el) return;
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") checkAccessCode();
    });
  });
  if (userInput) userInput.focus();
  if (startBtn) startBtn.addEventListener("click", checkAccessCode);

  const wipeBtn = document.getElementById("wipeAllBtn");
  if (wipeBtn) wipeBtn.addEventListener("click", wipeAllData);
});

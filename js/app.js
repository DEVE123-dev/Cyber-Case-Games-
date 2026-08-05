/* Cyber Case: single page app tying all three tasks together. */

const STORAGE_KEY = "cybercase_state_v1";
const TASK_ORDER = ["fakenews", "aiimages", "phishing"];

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function defaultState() {
  const tasks = {};
  TASK_ORDER.forEach((key) => {
    tasks[key] = {
      started: false,
      startTime: null,
      completed: false,
      score: null,
      total: TASKS[key].items.length,
      timeSeconds: null,
      answers: {},
    };
  });
  return { team: { name: "", members: "" }, tasks, synced: false };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      team: Object.assign(base.team, parsed.team || {}),
      tasks: Object.assign(base.tasks, parsed.tasks || {}),
      synced: typeof parsed.synced === "boolean" ? parsed.synced : false,
    };
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
}

let state = loadState();
let activeKey = "dashboard";
let timerInterval = null;

function openWelcomeModal() {
  const modal = document.getElementById("welcomeModalBackdrop");
  const input = document.getElementById("welcomeTeamNameInput");
  const startBtn = document.getElementById("welcomeStartBtn");
  if (!modal || !input || !startBtn) return;
  modal.hidden = false;
  input.value = state.team.name || "";
  startBtn.disabled = input.value.trim() === "";
  input.focus();
}

function closeWelcomeModal() {
  const modal = document.getElementById("welcomeModalBackdrop");
  if (modal) {
    modal.hidden = true;
    modal.style.display = "none";
  }
}

function beginSessionWithTeamName() {
  const input = document.getElementById("welcomeTeamNameInput");
  const teamName = input ? input.value.trim() : "";
  if (!teamName) {
    alert("Please enter a team name before starting.");
    return;
  }
  state.team.name = teamName;
  saveState();
  closeWelcomeModal();
  render();
}

function showWelcomeModalIfNeeded() {
  const modal = document.getElementById("welcomeModalBackdrop");
  if (!modal) return;
  if (state.team.name.trim()) {
    modal.hidden = true;
    return;
  }
  openWelcomeModal();
}

/* ---------- Routing ---------- */

function currentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (TASK_ORDER.includes(hash)) return hash;
  return "dashboard";
}

function navigate(key) {
  window.location.hash = "/" + key;
}

window.addEventListener("hashchange", () => render());

/* ---------- Nav bar ---------- */

function renderNav() {
  const teamName = state.team.name ? esc(state.team.name) : "";
  const nav = document.getElementById("navbar");
  const links = [{ key: "dashboard", label: "Dashboard" }].concat(
    TASK_ORDER.map((key) => ({ key, label: "Task " + TASKS[key].number + ": " + TASKS[key].shortTitle }))
  );
  const linksHTML = links
    .map((l) => {
      const t = state.tasks[l.key];
      const activeCls = activeKey === l.key ? "active" : "";
      const mark = t && t.completed ? ' <span class="done-mark">&#10003;</span>' : "";
      return `<a class="navlink ${activeCls}" data-key="${l.key}">${esc(l.label)}${mark}</a>`;
    })
    .join("");
  nav.innerHTML = `
    <div class="brand"><span class="dot">&gt;</span> Cyber Case</div>
    <div class="navlinks">${linksHTML}</div>
    <div class="team-pill-wrap">
      <div class="team-pill"><span class="team-pill-label">Team:</span> ${teamName || "Not set"}</div>
      <button class="team-pill-btn" id="changeTeamBtn">${teamName ? "Change" : "Set"} team</button>
    </div>
  `;
  Array.prototype.forEach.call(nav.querySelectorAll(".navlink"), (el) => {
    el.addEventListener("click", () => navigate(el.dataset.key));
  });
  const changeTeamBtn = document.getElementById("changeTeamBtn");
  if (changeTeamBtn) {
    changeTeamBtn.addEventListener("click", () => openWelcomeModal());
  }
}

/* ---------- Dashboard ---------- */

function statusFor(key) {
  const t = state.tasks[key];
  if (t.completed) return { label: "COMPLETED", cls: "complete" };
  if (t.started) return { label: "IN PROGRESS", cls: "progress" };
  return { label: "NOT STARTED", cls: "notstarted" };
}

function pad2(n) {
  n = String(n);
  return n.length < 2 ? "0" + n : n;
}

function fmtTime(seconds) {
  if (seconds == null) return "";
  const m = pad2(Math.floor(seconds / 60));
  const s = pad2(seconds % 60);
  return m + ":" + s;
}

function teamDetailsComplete() {
  return state.team.name.trim() !== "";
}

function updateTaskButtonsState() {
  const ready = teamDetailsComplete();
  Array.prototype.forEach.call(document.querySelectorAll(".task-btn"), (btn) => {
    if (!btn.dataset.key || !TASK_ORDER.includes(btn.dataset.key)) return;
    btn.disabled = !ready;
    const taskKey = btn.dataset.key;
    const t = state.tasks[taskKey];
    btn.textContent = ready ? (t.completed ? "Review" : t.started ? "Continue" : "Start") : "Enter team name first";
  });
}

function renderDashboard() {
  const el = document.getElementById("view-dashboard");
  const totalScore = TASK_ORDER.reduce((sum, k) => sum + (state.tasks[k].score || 0), 0);
  const totalMax = TASK_ORDER.reduce((sum, k) => sum + state.tasks[k].total, 0);
  const totalTime = TASK_ORDER.reduce((sum, k) => sum + (state.tasks[k].timeSeconds || 0), 0);
  const allDone = TASK_ORDER.every((k) => state.tasks[k].completed);
  const ready = teamDetailsComplete();

  const cards = TASK_ORDER.map((key) => {
    const task = TASKS[key];
    const t = state.tasks[key];
    const status = statusFor(key);
    const scoreLine = t.completed ? `<div class="desc"><strong>${t.score} / ${t.total}</strong> correct, time ${fmtTime(t.timeSeconds)}</div>` : `<div class="desc">${task.definitionBody}</div>`;
    const btnLabel = t.completed ? "Review" : t.started ? "Continue" : "Start";
    return `
      <div class="task-card">
        <div class="num">TASK ${task.number}</div>
        <h3>${esc(task.title)}</h3>
        <span class="status-badge ${status.cls}">${status.label}</span>
        ${scoreLine}
        <button class="task-btn" data-key="${key}" ${ready ? "" : "disabled"}>${ready ? btnLabel : "Enter team name first"}</button>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="chip">MISSION CONTROL</div>
    <h1>Cyber Case</h1>
    <div class="subtitle">Three stations. One combined score.</div>

    <div class="card">
      <h2>Team Setup</h2>
      <p>Enter your team details once here. They carry over automatically into every task.</p>
      <p style="margin-top: 10px;">Enter a team name and participant names before starting any station.</p>
      <div class="team-row" style="margin-top: 14px;">
        <input class="team-input" id="teamNameInput" placeholder="Team name" value="${esc(state.team.name)}" />
        <input class="team-input" id="teamMembersInput" placeholder="Participant names" value="${esc(state.team.members)}" />
      </div>
    </div>

    <div class="section-title">Stations</div>
    <div class="task-grid">${cards}</div>

    <div class="overall-card">
      <div class="overall-label">COMBINED SCORE</div>
      <div class="overall-score">${totalScore} / ${totalMax}</div>
      <div class="overall-label">TOTAL TIME ACROSS COMPLETED STATIONS: ${fmtTime(totalTime) || "00:00"}</div>
      ${allDone ? `<p style="margin-top:10px;">All three stations complete. Show this screen to a judge, or copy the summary below.</p><div class="sync-status ${state.synced ? "synced" : "unsynced"}">${state.synced ? "Synced to leaderboard" : "Not synced, no connection"}${state.synced ? "" : ' <button class="sync-retry-btn" id="retrySyncBtn">Retry sync</button>'}</div><textarea class="summary-box" readonly id="fullSummary"></textarea>` : `<p style="margin-top:10px;">Complete all three stations to see your final combined result.</p>`}
      <button class="reset-link" id="resetBtn">Reset all progress for this device</button>
    </div>
  `;

  Array.prototype.forEach.call(el.querySelectorAll(".task-btn"), (btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.key));
  });

  document.getElementById("teamNameInput").addEventListener("input", (e) => {
    state.team.name = e.target.value;
    saveState();
    renderNav();
    updateTaskButtonsState();
  });
  document.getElementById("teamMembersInput").addEventListener("input", (e) => {
    state.team.members = e.target.value;
    saveState();
    updateTaskButtonsState();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("This clears all scores, timers, and team info on this device. Continue?")) {
      state = defaultState();
      saveState();
      render();
    }
  });

  const retrySyncBtn = document.getElementById("retrySyncBtn");
  if (retrySyncBtn) {
    retrySyncBtn.addEventListener("click", () => sendResultsToLeaderboard());
  }

  if (allDone) {
    const lines = TASK_ORDER.map((k) => {
      const t = state.tasks[k];
      return TASKS[k].title + ": " + t.score + "/" + t.total + ", time " + fmtTime(t.timeSeconds);
    });
    const summary =
      "Team: " + (state.team.name || "(no team name)") + "\n" +
      "Members: " + (state.team.members || "(no names entered)") + "\n" +
      "Combined score: " + totalScore + "/" + totalMax + "\n" +
      "Combined time: " + (fmtTime(totalTime) || "00:00") + "\n\n" +
      lines.join("\n");
    const box = document.getElementById("fullSummary");
    if (box) box.value = summary;
  }
}

/* ---------- Task view ---------- */

function renderTaskItemCard(taskKey, item, index) {
  let mockInner;
  if (item.kind === "image") {
    mockInner = `<img class="item-image" src="${item.src}" alt="Item ${index + 1}" />`;
  } else {
    const fieldsHTML = item.fields
      .map(([label, value]) => `<div class="field-row"><div class="field-label">${esc(label)}</div><div class="field-value">${esc(value)}</div></div>`)
      .join("");
    const bodyHTML = item.body.map((line) => `<p>${esc(line)}</p>`).join("");
    mockInner = `${fieldsHTML}${item.fields.length ? '<div class="divider"></div>' : ""}<div class="mock-body">${bodyHTML}</div>`;
  }
  const task = TASKS[taskKey];
  const saved = state.tasks[taskKey].answers[index];
  const savedVerdict = saved ? saved.verdict : null;
  const savedEvidence = saved ? saved.evidence : "";
  const [goodLabel, badLabel] = task.verdictLabels;
  const goodSel = savedVerdict === goodLabel ? "selected" : "";
  const badSel = savedVerdict === badLabel ? "selected" : "";

  return `
    <div class="item-card" id="card-${index}">
      <div class="item-head"><span class="item-num">${task.itemKindLabel} ${index + 1} / ${task.items.length}</span></div>
      <div class="mock ${item.kind}">${mockInner}</div>
      <div class="verdict-row">
        <button class="verdict-btn good ${goodSel}" data-i="${index}" data-v="${esc(goodLabel)}">${esc(goodLabel)}</button>
        <button class="verdict-btn bad ${badSel}" data-i="${index}" data-v="${esc(badLabel)}">${esc(badLabel)}</button>
      </div>
      <textarea class="evidence" id="evidence-${index}" placeholder="Evidence: what clue tells you this. Be specific, you will need to explain it to the judges.">${esc(savedEvidence)}</textarea>
      <div class="result-line" id="result-${index}"></div>
    </div>`;
}

function renderTask(key) {
  const task = TASKS[key];
  const t = state.tasks[key];
  const el = document.getElementById("view-" + key);

  if (!teamDetailsComplete()) {
    alert("Please enter your team name and participant names before starting any station.");
    navigate("dashboard");
    return;
  }

  if (!t.started && !t.completed) {
    t.started = true;
    t.startTime = Date.now();
    saveState();
  }

  const howCards = task.howItWorks
    .map((c) => `<div class="how-card"><div class="how-icon">${c.icon}</div><div class="how-t">${esc(c.t)}</div><div class="how-d">${esc(c.d)}</div></div>`)
    .join("");

  const itemCards = task.items.map((item, i) => renderTaskItemCard(key, item, i)).join("");

  el.innerHTML = `
    <div class="topbar-inline">
      <span class="chip">TASK ${task.number} OF 3</span>
      <span class="timer" id="timer-${key}">00:00</span>
    </div>
    <div class="team-pill" style="margin: 8px 0 12px;">TEAM: ${esc(state.team.name || "(no team name)")}</div>
    <h1>${esc(task.title)}</h1>
    <div class="subtitle">${esc(task.subtitle)}</div>

    <div class="card">
      <h2><span class="term">${esc(task.definitionTerm)}</span></h2>
      <p>${esc(task.definitionBody)}</p>
    </div>

    <div class="how-grid">${howCards}</div>

    <div class="card">
      <h2>How this round works</h2>
      <p>${esc(task.instructions)}</p>
    </div>

    <div class="section-title">${esc(task.itemsSectionTitle)}</div>
    ${itemCards}

    <div class="submit-bar">
      <button class="submit-btn" id="submitBtn-${key}" ${t.completed ? "disabled" : ""}>${t.completed ? "Submitted" : "Submit My Team's Verdicts"}</button>
    </div>

    <div class="results-card ${t.completed ? "show" : ""}" id="resultsCard-${key}">
      <div class="score-label">FINAL SCORE</div>
      <div class="score-big" id="scoreBig-${key}">${t.completed ? t.score : 0} / ${task.items.length}</div>
      <div class="score-label" id="timeTaken-${key}">${t.completed ? "TIME: " + fmtTime(t.timeSeconds) : ""}</div>
      <p>Show this screen to a judge, then head back to the dashboard for the next station.</p>
      <textarea class="summary-box" id="summaryBox-${key}" readonly></textarea>
      <button class="task-btn" style="margin-top:12px; max-width:220px;" id="toDashboard-${key}">Back to Dashboard</button>
    </div>
  `;

  Array.prototype.forEach.call(el.querySelectorAll(".verdict-btn"), (btn) => {
    btn.addEventListener("click", () => {
      if (t.completed) return;
      const i = btn.dataset.i;
      const v = btn.dataset.v;
      if (!t.answers[i]) t.answers[i] = { verdict: null, evidence: "" };
      t.answers[i].verdict = v;
      saveState();
      Array.prototype.forEach.call(el.querySelectorAll('.verdict-btn[data-i="' + i + '"]'), (b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  Array.prototype.forEach.call(el.querySelectorAll(".evidence"), (ta, i) => {
    ta.addEventListener("input", (e) => {
      if (!t.answers[i]) t.answers[i] = { verdict: null, evidence: "" };
      t.answers[i].evidence = e.target.value;
      saveState();
    });
  });

  if (t.completed) {
    task.items.forEach((item, i) => {
      const saved = t.answers[i];
      const correct = saved && saved.verdict === item.verdict;
      const rl = document.getElementById("result-" + i);
      rl.classList.add("show", correct ? "correct" : "incorrect");
      rl.textContent = (correct ? "Correct. " : "Not quite. ") + item.why;
    });
    fillSummaryBox(key);
  }

  const submitBtn = document.getElementById("submitBtn-" + key);
  submitBtn.addEventListener("click", () => submitTask(key));

  const toDash = document.getElementById("toDashboard-" + key);
  if (toDash) toDash.addEventListener("click", () => navigate("dashboard"));

  startTimer(key);
}

function fillSummaryBox(key) {
  const task = TASKS[key];
  const t = state.tasks[key];
  const lines = task.items.map((item, i) => {
    const saved = t.answers[i];
    const chosen = saved ? saved.verdict : "(none)";
    const correct = chosen === item.verdict;
    return (i + 1) + ". " + chosen + (correct ? " (correct)" : " (incorrect, was " + item.verdict + ")");
  });
  const box = document.getElementById("summaryBox-" + key);
  if (!box) return;
  box.value =
    "Team: " + (state.team.name || "(no team name)") + "\n" +
    "Members: " + (state.team.members || "(no names entered)") + "\n" +
    "Task " + task.number + ": " + task.title + "\n" +
    "Score: " + t.score + "/" + t.total + "\n" +
    "Time: " + fmtTime(t.timeSeconds) + "\n\n" +
    lines.join("\n");
}

function submitTask(key) {
  const task = TASKS[key];
  const t = state.tasks[key];
  const missing = [];
  task.items.forEach((item, i) => {
    if (!t.answers[i] || !t.answers[i].verdict) missing.push(i + 1);
  });
  if (missing.length) {
    alert("Still missing a verdict for item(s): " + missing.join(", "));
    return;
  }
  let score = 0;
  task.items.forEach((item, i) => {
    if (t.answers[i].verdict === item.verdict) score++;
  });
  t.completed = true;
  t.score = score;
  t.timeSeconds = Math.floor((Date.now() - t.startTime) / 1000);
  saveState();
  stopTimer();
  renderNav();
  renderTask(key);
  syncResultsIfNeeded();
}

/* ---------- Timer ---------- */

function startTimer(key) {
  stopTimer();
  const t = state.tasks[key];
  const el = document.getElementById("timer-" + key);
  if (!el) return;
  function tick() {
    const elapsed = t.completed ? t.timeSeconds : Math.floor((Date.now() - t.startTime) / 1000);
    el.textContent = fmtTime(elapsed) || "00:00";
  }
  tick();
  if (!t.completed) {
    timerInterval = setInterval(tick, 500);
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/* ---------- Main render ---------- */

function render() {
  stopTimer();
  activeKey = currentRoute();
  Array.prototype.forEach.call(document.querySelectorAll(".view"), (v) => v.classList.remove("active"));
  document.getElementById("view-" + activeKey).classList.add("active");
  renderNav();
  if (activeKey === "dashboard") {
    renderDashboard();
  } else {
    renderTask(activeKey);
  }
  showWelcomeModalIfNeeded();
  window.scrollTo(0, 0);
}

document.addEventListener("DOMContentLoaded", () => {
  const teamNameInput = document.getElementById("welcomeTeamNameInput");
  const startBtn = document.getElementById("welcomeStartBtn");

  if (teamNameInput) {
    teamNameInput.addEventListener("input", (e) => {
      const name = e.target.value.trim();
      if (startBtn) startBtn.disabled = name === "";
    });

    teamNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && teamNameInput.value.trim()) {
        beginSessionWithTeamName();
      }
    });
  }

  if (startBtn) {
    startBtn.addEventListener("click", beginSessionWithTeamName);
  }

  render();
});

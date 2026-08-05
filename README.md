# Cyber Case

A single page web app for a cybersecurity awareness challenge with three stations:

1. Spot Fake News
2. Detect AI Generated Images
3. Identify Phishing Emails

Teams enter their name once on the dashboard, then work through all three stations from the same nav bar. Each station has a built in timer, instant scoring, and a summary they can show a judge. The dashboard combines all three scores into one leaderboard number. Progress is saved automatically in the browser (per device), so a team can close the tab and pick up where they left off.

## Project structure

```
index.html          the app shell (dashboard + all three task views)
admin.html           optional, standalone live leaderboard view for judges
css/style.css        shared styles for the whole app
js/data.js            all task content: articles, emails, image list, answers
js/config.js           the leaderboard URL, loaded by index.html and admin.html
js/admin-config.js      judge accounts and the wipe secret, loaded only by admin.html
js/sync.js              optional live leaderboard sync, fails silently if not configured
js/app.js             routing, state, scoring, rendering
js/admin.js             reads, renders, and (with the wipe button) clears the live leaderboard
images/                the 8 photos used in the AI Images task, plus the background art
Code.gs               Google Apps Script backend for the optional live leaderboard
```

## Running it locally

No build step and no server required. Just open `index.html` in a browser.

## Hosting on GitHub Pages

1. Create a new repository on GitHub (public or private, Pages works for both on paid plans, public repos get it free).
2. Upload every file in this folder to the repository, keeping the same folder structure (`css/`, `js/`, `images/`, and `index.html` at the root).
3. In the repository, go to **Settings > Pages**.
4. Under **Source**, choose **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, then save.
5. GitHub gives you a URL like `https://your-username.github.io/your-repo-name/`. That is the link to hand out to teams.

No accounts, API keys, or backend are needed. Everything runs client side.

## Editing the content

All questions, answers, and explanations live in `js/data.js`. Each task is an object with:

- `items`: the list of articles, emails, or images to judge
- `verdict`: the correct answer for that item
- `why`: the explanation shown after a team submits

To swap in different emails, articles, or images, edit that file directly. To use different images, drop new files into `images/` and update the `src` path for that item.

## Resetting between teams

If several teams share the same device, use the **Reset all progress for this device** link at the bottom of the dashboard between runs. This clears the team name, scores, and timers stored in that browser.

## Optional: live leaderboard

By default the game runs fully offline, no network calls happen and nothing outside the browser ever sees a team's results. If you want a live leaderboard judges can watch during the event, there is an optional Google Apps Script backend you can add on top:

1. Create a Google Sheet, then in it go to **Extensions > Apps Script** and paste in the contents of `Code.gs` (in this project's root). Full deploy steps, including the "Who has access: Anyone" setting that matters, are in the comment block at the top of that file.
2. After deploying, copy the Web app URL you are given and paste it into `js/config.js` as `APPS_SCRIPT_URL`.
3. Once a team finishes all three stations, the game sends one combined result to that URL automatically. If there is no connection, or `APPS_SCRIPT_URL` is left blank, this fails silently and the team's results screen is unaffected either way, the dashboard just shows "Not synced, no connection" with a manual **Retry sync** button.
4. Open `admin.html` on a judge's screen to see the live, auto refreshing leaderboard, or click the small **Judge login** link in the footer of the main page. It asks for a username and password first (`ADMIN_USERS` in `js/admin-config.js`, up to 3 judge accounts). This is a soft gate for casual visitors only, not real security, since this is a static site with no server to enforce it. Edit the usernames and passwords in `js/admin-config.js` any time you want to change them.

Two things worth knowing about this feature:

- A successful sync means the result was sent without a network error, not that it was confirmed recorded in the sheet. If in doubt, check the Sheet directly.
- If two browser tabs share the same device and both happen to complete the third station independently, each tab could send its own submission. This is a rare edge case for a walk up event and is not worth engineering around.

## Wiping test data before the event

`admin.html` has a **Danger zone** at the bottom with a **Wipe all leaderboard data** button, for clearing out practice runs while you are setting up, without needing to go into the Google Sheet by hand.

- It asks for a confirmation, then requires typing `WIPE` in a prompt, before it sends anything.
- It is guarded by a separate `WIPE_SECRET`, set in both `js/admin-config.js` and `Code.gs`. The two must match exactly, or the Apps Script backend rejects the request. Change the default value in both places before the event.
- This permanently deletes every row in the "Results" sheet. There is no undo beyond the Sheet's own version history (File > Version history in Google Sheets, if you need to recover something).
- `ADMIN_USERS` and `WIPE_SECRET` live in `js/admin-config.js`, which only `admin.html` loads, not the main game page, so participants never see these values in the main page's source. Anyone who specifically opens `admin.html` and views its source can still read them though, this is still a soft gate, not real security, treat the wipe secret with the same care as the judge passwords.

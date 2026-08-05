# Cyber Case

A single page web app for a cybersecurity awareness challenge with three stations:

1. Spot Fake News
2. Detect AI Generated Images
3. Identify Phishing Emails

Teams enter their name once on the dashboard, then work through all three stations from the same nav bar. Each station has a built in timer, instant scoring, and a summary they can show a judge. The dashboard combines all three scores into one leaderboard number. Progress is saved automatically in the browser (per device), so a team can close the tab and pick up where they left off.

## Project structure

```
index.html          the app shell (dashboard + all three task views)
css/style.css        shared styles for the whole app
js/data.js            all task content: articles, emails, image list, answers
js/app.js             routing, state, scoring, rendering
images/                the 8 photos used in the AI Images task, plus the background art
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

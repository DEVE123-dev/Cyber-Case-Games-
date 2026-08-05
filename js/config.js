/* Cyber Case: local configuration for the optional live leaderboard sync.
   This is a plain constant you edit by hand, there is no build step. Loaded
   by both index.html (the game) and admin.html (the judge view), so keep
   anything judge-only out of this file, see js/admin-config.js for that. */

/* Paste the Web app URL from your Code.gs deployment here (see Code.gs for
   deploy steps). Leave this as an empty string to run fully offline: the
   game works exactly the same either way, it just never contacts a server. */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyIhx2O2VwjB2ZypegaHtWtXHKJ7DDuNVNehq6-yyFlojeFmeDAcWGEv6c_U7kB6WoJ/exec";

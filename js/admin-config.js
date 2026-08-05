/* Cyber Case: admin only configuration. Loaded ONLY by admin.html, never by
   index.html, so none of this ships to participants' browsers on the main
   game page. It is still plain text served over a static site though, so
   anyone who specifically opens admin.html and views its source can read
   these values. None of this is real security, just a soft gate to keep
   casual visitors out and to keep the wipe button from being triggered by
   accident or by someone poking at the network tab. Do not use any of this
   to protect anything sensitive. */

/* Login accounts for admin.html, the live leaderboard view for judges.
   Up to 3 judges can each have their own username and password here. Edit
   the usernames and passwords below before the event, and add or remove
   entries as needed. */
const ADMIN_USERS = [
  { username: "judge1", password: "cyber1" },
  { username: "judge2", password: "cyber2" },
  { username: "judge3", password: "cyber3" },
];

/* Shared secret for the "Wipe all leaderboard data" button on admin.html.
   Must match WIPE_SECRET in Code.gs exactly, that is the only thing that
   authorizes a wipe request server side, so change both together. This is
   a destructive, irreversible action, treat this value the same way you
   would treat the admin passwords above. */
const WIPE_SECRET = "kn1a8yKEfBma";

// Fills an empty local database with a few example topics so you can see the UI.
// Usage: npm run db:seed   (uses DATABASE_URL and the first address in ADMIN_EMAILS)
import postgres from "postgres";

try {
  process.loadEnvFile?.(".env.local");
} catch {}
try {
  process.loadEnvFile?.(".env");
} catch {}

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const adminEmail = (process.env.ADMIN_EMAILS ?? "you@example.com").split(",")[0].trim().toLowerCase();

try {
  const [{ count }] = await sql`select count(*)::int as count from topics`;
  if (count > 0) {
    console.log("The database already has topics; not seeding.");
    process.exit(0);
  }
  const ago = (hours) => new Date(Date.now() - hours * 3600_000);
  const [me] = await sql`
    insert into users (email, display_name, is_admin) values (${adminEmail}, 'Hieu', true)
    on conflict (email) do update set is_admin = true returning id`;
  const [uncle] = await sql`
    insert into users (email, display_name) values ('uncle@example.com', 'Uncle')
    on conflict (email) do update set display_name = 'Uncle' returning id`;
  await sql`insert into invites (email, invited_by_id, accepted_at) values ('uncle@example.com', ${me.id}, now()) on conflict do nothing`;

  const topics = [
    [uncle.id, "Repaint the back porch before winter", "Scrape, prime and repaint the back porch floor and railings.", "Done before Dec 15, with no bare wood showing.",
      "The plan is to get the porch done before the first real cold snap.\n\nOrder of work:\n\n- Scrape loose paint and sand the railings\n- Replace any soft boards (check under the bench)\n- One coat of primer, then two coats of porch enamel", "active", 72],
    [me.id, "Learn to cook phở from scratch", "Make the broth, noodles and toppings without shortcuts.", "One pot good enough to serve at New Year.", "", "active", 120],
    [me.id, "Plan the summer family trip", "Collect dates and ideas from everyone.", "Pick dates and a place everyone can make.", "", "open", 190],
    [uncle.id, "Set up mesh Wi-Fi at Grandma's house", "Install the mesh kit and test every room.", "Strong signal in every room, including the garage.", "", "wrapped_up", 480],
  ];
  for (const [author, title, task, goal, body, status, hours] of topics) {
    const [t] = await sql`
      insert into topics (author_id, title, task, goal, body_md, status, created_at, updated_at, last_activity_at)
      values (${author}, ${title}, ${task}, ${goal}, ${body}, ${status}, ${ago(hours)}, ${ago(hours)}, ${ago(hours)}) returning id`;
    if (title.startsWith("Repaint")) {
      await sql`insert into progress_entries (topic_id, author_id, body_md, created_at, updated_at) values
        (${t.id}, ${uncle.id}, 'Scraped the railings and the north side. Two boards under the bench are soft.', ${ago(70)}, ${ago(70)}),
        (${t.id}, ${me.id}, 'Picked up the primer and **two cans** of enamel.', ${ago(30)}, ${ago(30)}),
        (${t.id}, ${uncle.id}, 'Primer is on everywhere except the steps.', ${ago(2)}, ${ago(2)})`;
      await sql`update topics set last_activity_at = ${ago(2)} where id = ${t.id}`;
    }
  }
  console.log(`Seeded example topics. Sign in as ${adminEmail}.`);
} finally {
  await sql.end();
}

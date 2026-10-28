
const { spawnSync } = require("child_process");

const scripts = [
  "seedMovies.js",
  "seedTheatres.js",
  "seedShowtime.js"
];

for (const script of scripts) {
  console.log(`\nRunning ${script}...`);

  const result = spawnSync(
    process.execPath,
    [script],
    {
      stdio: "inherit",
      cwd: __dirname
    }
  );

  if (result.error) {
    console.error(`Could not start ${script}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${script} failed. Fix the error before continuing.`);
    process.exit(result.status || 1);
  }
}

console.log("\nAll seed scripts completed successfully.");

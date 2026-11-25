/**
 * @jest-environment node
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// A stored email's HTML is not ours. Without a sandbox its scripts run in the dashboard's origin and can read the
// admin token.
it("every srcDoc iframe is fully sandboxed", () => {
  const dir = join(__dirname, "..");
  const iframes = readdirSync(dir)
    .filter((file) => file.endsWith(".tsx"))
    .flatMap((file) => readFileSync(join(dir, file), "utf8").match(/<iframe[\s\S]*?\/>/g) ?? []);
  expect(iframes.length).toBeGreaterThan(0);
  for (const iframe of iframes) expect(iframe).toContain('sandbox=""');
});

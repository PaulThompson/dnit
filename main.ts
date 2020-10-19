import { setupLogging, log, flags } from "./mod.ts";
import { launch } from "./launch.ts";
import { version } from './version.ts';

export async function main() {
  const args = flags.parse(Deno.args);
  if (args["version"] === true) {
    console.log(`dnit ${version}`);
    Deno.exit(0);
  }

  await setupLogging();
  const intLogger = log.getLogger("dnit");

  if (args["verbose"] !== undefined) {
    intLogger.levelName = "INFO";
  }

  launch(intLogger).then((st) => {
    Deno.exit(st.code);
  });
}

main();

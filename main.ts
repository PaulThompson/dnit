import { setupLogging } from "./dnit.ts";
import { cli, log } from "./deps.ts";
import { launch } from "./launch.ts";
import { version } from "./version.ts";

export async function main() {
  const args: cli.Args = cli.parseArgs(Deno.args);
  if (args["version"] === true) {
    console.log(`dnit ${version}`);
    Deno.exit(0);
  }

  setupLogging();
  const internalLogger = log.getLogger("internal");

  if (args["verbose"] !== undefined) {
    internalLogger.levelName = "INFO";
  }

  internalLogger.info(`starting dnit launch using version: ${version}`);

  const st = await launch(internalLogger);
  Deno.exit(st.code);
}

await main();

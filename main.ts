import { setupLogging } from "./dnit.ts";
import { type Args, parseArgs } from "@std/cli/parse-args";
import * as log from "@std/log";
import { launch } from "./launch.ts";
import { version } from "./version.ts";

export async function main() {
  const args: Args = parseArgs(Deno.args);
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

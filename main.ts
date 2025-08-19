import { createConsoleLoggers } from "./cli/logging.ts";
import { type Args, parseArgs } from "@std/cli/parse-args";
import { launch } from "./launch.ts";
import { version } from "./version.ts";

export async function main() {
  const args: Args = parseArgs(Deno.args);
  if (args["version"] === true) {
    console.log(`dnit ${version}`);
    Deno.exit(0);
  }


  const loggers = createConsoleLoggers();

  if (args["verbose"] !== undefined) {
    loggers.internalLogger.levelName = "INFO";
  }

  loggers.internalLogger.info(`starting dnit launch using version: ${version}`);

  const st = await launch(loggers.internalLogger);
  Deno.exit(st.code);
}

await main();

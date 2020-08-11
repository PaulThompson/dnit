import { setupLogging, log, flags } from "./mod.ts";
import { launch } from './launch.ts';

export async function main() {
  await setupLogging();
  const intLogger = log.getLogger("dnit");

  const args = flags.parse(Deno.args);

  if(args["verbose"] !== undefined) {
    intLogger.levelName = "INFO";
  }

  launch(intLogger).then(st=>{
    Deno.exit(st.code);
  });
}

main();

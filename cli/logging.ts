import * as log from "@std/log";
import type { ILoggers } from "../interfaces/core/ICoreInterfaces.ts";

/// StdErr plaintext handler (no color codes)
class StdErrPlainHandler extends log.BaseHandler {
  constructor(levelName: log.LevelName) {
    super(levelName, {
      formatter: (rec) => rec.msg,
    });
  }

  override log(msg: string): void {
    Deno.stderr.writeSync(new TextEncoder().encode(msg + "\n"));
  }
}

export function createConsoleLoggers(): ILoggers {
  const stderrHandler = new StdErrPlainHandler("DEBUG");

  return {
    internalLogger: new log.Logger("internal", "WARN", {
      handlers: [stderrHandler],
    }),
    taskLogger: new log.Logger("task", "INFO", { handlers: [stderrHandler] }),
    userLogger: new log.Logger("user", "INFO", { handlers: [stderrHandler] }),
    cliLogger: new log.Logger("cli", "INFO", { handlers: [stderrHandler] }),
  };
}

/** Convenience access to a setup logger for tasks */
export function getLogger(): log.Logger {
  return log.getLogger("user");
}

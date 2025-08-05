import * as log from "@std/log";

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

/// StdErr handler on top of ConsoleHandler (which uses colors)
class StdErrHandler extends log.ConsoleHandler {
  override log(msg: string): void {
    Deno.stderr.writeSync(new TextEncoder().encode(msg + "\n"));
  }
}

export function setupLogging() {
  log.setup({
    handlers: {
      stderr: new StdErrHandler("DEBUG"),
      stderrPlain: new StdErrPlainHandler("DEBUG"),
    },

    loggers: {
      // internals of dnit tooling
      internal: {
        level: "WARN",
        handlers: ["stderrPlain"],
      },

      // basic events eg start of task or task already up to date
      task: {
        level: "INFO",
        handlers: ["stderrPlain"],
      },

      // for user to use within task actions
      user: {
        level: "INFO",
        handlers: ["stderrPlain"],
      },
    },
  });
}

/** Convenience access to a setup logger for tasks */
export function getLogger(): log.Logger {
  return log.getLogger("user");
}

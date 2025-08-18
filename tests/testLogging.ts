import * as log from "@std/log";
import type { ILoggers } from "../interfaces/core/ICoreInterfaces.ts";

/// Test capture handler that stores output in an array
class TestCaptureHandler extends log.BaseHandler {
  public output: string[] = [];

  constructor(levelName: log.LevelName = "DEBUG") {
    super(levelName, {
      formatter: (rec) => rec.msg,
    });
  }

  override log(msg: string): void {
    this.output.push(msg);
  }
}

export interface TestLogCapture {
  stdout: TestCaptureHandler;
  stderr: TestCaptureHandler;
  loggers: ILoggers;
}

export function createTestLoggers(): TestLogCapture {
  const testStdOut = new TestCaptureHandler();
  const testStdErr = new TestCaptureHandler();

  const loggers: ILoggers = {
    internalLogger: new log.Logger("internal", "WARN", {
      handlers: [testStdErr],
    }),
    taskLogger: new log.Logger("task", "INFO", { handlers: [testStdErr] }),
    userLogger: new log.Logger("user", "INFO", { handlers: [testStdOut] }),
    cliLogger: new log.Logger("cli", "INFO", { handlers: [testStdOut] }),
  };

  return {
    stdout: testStdOut,
    stderr: testStdErr,
    loggers,
  };
}

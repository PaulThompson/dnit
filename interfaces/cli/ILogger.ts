import type * as log from "@std/log";

// Logging setup interface
export interface ILoggingSetup {
  setupLogging(): void;
  getLogger(): log.Logger;
}

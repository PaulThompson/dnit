import type { log } from "../../deps.ts";

// Logging setup interface
export interface ILoggingSetup {
  setupLogging(): void;
  getLogger(): log.Logger;
}

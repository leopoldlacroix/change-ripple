import type { LimiterDO } from "./limiter.js";
import type { WorkspaceDO } from "./workspace-do.js";

export interface Env {
  WORKSPACES: DurableObjectNamespace<WorkspaceDO>;
  LIMITER: DurableObjectNamespace<LimiterDO>;
  DEMO_DAILY_CAP?: string;
}

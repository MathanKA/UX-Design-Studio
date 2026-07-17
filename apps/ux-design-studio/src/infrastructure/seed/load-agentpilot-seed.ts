import rawAgentPilotUXSpec from "./agentpilot.uxspec.json";
import { loadUXSpec, type UXSpec } from "../../domain/ux-spec";

/**
 * Load and validate the AgentPilot seed through the common UXSpec boundary.
 * Throws on invalid seed data so startup/contract failures are explicit.
 */
export function loadAgentPilotSeed(): UXSpec {
  const result = loadUXSpec(rawAgentPilotUXSpec);
  if (!result.ok) {
    const details = result.issues
      .map((issue) => `${issue.path}: ${issue.message} (${issue.code})`)
      .join("; ");
    throw new Error(`AgentPilot seed failed validation: ${details}`);
  }
  return result.spec;
}

export const agentPilotSeed: UXSpec = loadAgentPilotSeed();

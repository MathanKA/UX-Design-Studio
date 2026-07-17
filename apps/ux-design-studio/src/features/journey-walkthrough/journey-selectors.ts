import type {
  Journey,
  JourneyId,
  JourneyStep,
  Persona,
  UXSpec,
} from "../../domain/ux-spec";
import { findPersona } from "../../domain/ux-spec";

export const DEFAULT_JOURNEY_ID: JourneyId = "journey-onboarding";

export type JourneyWalkthroughStep = {
  step: JourneyStep;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
};

export type JourneyWalkthroughContext = {
  journey: Journey;
  persona: Persona | null;
  steps: readonly JourneyStep[];
  current: JourneyWalkthroughStep;
};

export function findJourney(
  spec: UXSpec,
  journeyId: JourneyId,
): Journey | undefined {
  return spec.journeys.find((journey) => journey.id === journeyId);
}

export function orderedJourneySteps(
  journey: Journey,
): readonly JourneyStep[] {
  return [...journey.steps].sort((a, b) => a.order - b.order);
}

/**
 * Resolve a guided walkthrough context for the given journey and step index.
 * Returns null when the journey is missing or has no steps (fail-safe).
 */
export function deriveJourneyWalkthrough(
  spec: UXSpec,
  journeyId: JourneyId,
  stepIndex: number,
): JourneyWalkthroughContext | null {
  const journey = findJourney(spec, journeyId);
  if (!journey) {
    return null;
  }

  const steps = orderedJourneySteps(journey);
  if (steps.length === 0) {
    return null;
  }

  const clampedIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
  const step = steps[clampedIndex];
  if (!step) {
    return null;
  }

  return {
    journey,
    persona: findPersona(spec, journey.personaId) ?? null,
    steps,
    current: {
      step,
      index: clampedIndex,
      total: steps.length,
      isFirst: clampedIndex === 0,
      isLast: clampedIndex === steps.length - 1,
    },
  };
}

export function nextStepIndex(current: JourneyWalkthroughStep): number | null {
  if (current.isLast) {
    return null;
  }
  return current.index + 1;
}

export function previousStepIndex(
  current: JourneyWalkthroughStep,
): number | null {
  if (current.isFirst) {
    return null;
  }
  return current.index - 1;
}

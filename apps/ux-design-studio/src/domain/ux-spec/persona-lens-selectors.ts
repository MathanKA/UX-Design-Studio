import type {
  Journey,
  JourneyStep,
  Persona,
  PersonaId,
  PersonaTouchpoint,
  ScreenId,
  ScreenSpec,
  UXSpec,
} from "../ux-spec/model";

export type PersonaLensContext = {
  persona: Persona;
  touchpoint: PersonaTouchpoint | null;
  relatedJourneySteps: readonly {
    journey: Journey;
    step: JourneyStep;
  }[];
};

export function listPersonas(spec: UXSpec): readonly Persona[] {
  return spec.personas;
}

export function findPersona(
  spec: UXSpec,
  personaId: PersonaId,
): Persona | undefined {
  return spec.personas.find((persona) => persona.id === personaId);
}

export function defaultPersonaId(spec: UXSpec): PersonaId | undefined {
  return spec.personas[0]?.id;
}

export function resolveScreenTouchpoint(
  screen: ScreenSpec | undefined,
  personaId: PersonaId,
): PersonaTouchpoint | null {
  if (!screen?.personaTouchpoints) {
    return null;
  }
  return (
    screen.personaTouchpoints.find(
      (touchpoint) => touchpoint.personaId === personaId,
    ) ?? null
  );
}

export function relatedJourneyStepsForScreen(
  spec: UXSpec,
  screenId: ScreenId,
  personaId?: PersonaId,
): readonly { journey: Journey; step: JourneyStep }[] {
  const results: { journey: Journey; step: JourneyStep }[] = [];
  for (const journey of spec.journeys) {
    if (personaId && journey.personaId !== personaId) {
      // Still include journeys that visit this screen even when persona differs,
      // but prefer matching persona first by sorting later.
    }
    for (const step of journey.steps) {
      if (step.screenId === screenId) {
        results.push({ journey, step });
      }
    }
  }
  return results.sort((a, b) => {
    const aMatch = a.journey.personaId === personaId ? 0 : 1;
    const bMatch = b.journey.personaId === personaId ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.step.order - b.step.order;
  });
}

export function derivePersonaLensContext(
  spec: UXSpec,
  personaId: PersonaId,
  screenId: ScreenId | undefined,
): PersonaLensContext | null {
  const persona = findPersona(spec, personaId);
  if (!persona) {
    return null;
  }
  const screen = screenId
    ? spec.screens.find((entry) => entry.id === screenId)
    : undefined;
  return {
    persona,
    touchpoint: resolveScreenTouchpoint(screen, personaId),
    relatedJourneySteps: screenId
      ? relatedJourneyStepsForScreen(spec, screenId, personaId)
      : [],
  };
}

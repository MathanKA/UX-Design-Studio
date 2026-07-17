import { createContext, useContext, useMemo, type ReactNode } from "react";

export type StudioRoutingContextValue = {
  /** Host mount path without trailing slash; empty in standalone mode. */
  basePath: string;
  /** Build a router path for studio navigation. */
  toStudio: (relativePath: string) => string;
};

const StudioRoutingContext = createContext<StudioRoutingContextValue | null>(
  null,
);

function normalizeRelative(relativePath: string): string {
  return relativePath.replace(/^\/+/, "");
}

export function createStudioPath(
  basePath: string,
  relativePath: string,
): string {
  const relative = normalizeRelative(relativePath);
  if (!basePath) {
    return `/${relative}`;
  }
  return `${basePath.replace(/\/+$/, "")}/${relative}`;
}

type StudioRoutingProviderProps = {
  basePath?: string;
  children: ReactNode;
};

export function StudioRoutingProvider({
  basePath = "",
  children,
}: StudioRoutingProviderProps) {
  const value = useMemo<StudioRoutingContextValue>(
    () => ({
      basePath,
      toStudio: (relativePath: string) =>
        createStudioPath(basePath, relativePath),
    }),
    [basePath],
  );

  return (
    <StudioRoutingContext.Provider value={value}>
      {children}
    </StudioRoutingContext.Provider>
  );
}

export function useStudioRouting(): StudioRoutingContextValue {
  const value = useContext(StudioRoutingContext);
  if (!value) {
    return {
      basePath: "",
      toStudio: (relativePath: string) => createStudioPath("", relativePath),
    };
  }
  return value;
}

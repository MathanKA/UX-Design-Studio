import type { CSSProperties, ReactNode } from "react";
import type { DesignTokens } from "../../domain/ux-spec";
import {
  createEffectiveTokenView,
  type TokenOverride,
  type UxdsCssVarMap,
} from "./token-mapper";

type PreviewThemeRootProps = {
  tokens: DesignTokens;
  override?: TokenOverride;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function PreviewThemeRoot({
  tokens,
  override,
  children,
  className,
  "data-testid": testId = "preview-theme-root",
}: PreviewThemeRootProps) {
  const effective = createEffectiveTokenView(tokens, override ?? {});
  const style = (
    effective.ok ? effective.vars : {}
  ) as CSSProperties & UxdsCssVarMap;

  return (
    <div
      data-testid={testId}
      className={className}
      style={style}
      data-uxds-preview-root="true"
    >
      {children}
    </div>
  );
}

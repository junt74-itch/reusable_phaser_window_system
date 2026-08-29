export type MessageToken =
  | { readonly type: "text"; readonly value: string; readonly start: number; readonly end: number }
  | { readonly type: "newline"; readonly start: number; readonly end: number }
  | { readonly type: "pageBreak"; readonly start: number; readonly end: number }
  | { readonly type: "wait"; readonly ms: number; readonly start: number; readonly end: number }
  | { readonly type: "pause"; readonly start: number; readonly end: number };

export interface MessageParseResult {
  readonly tokens: readonly MessageToken[];
}

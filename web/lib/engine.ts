// Re-exports the Phon.Audio deterministic engine for use in Next.js API routes.
// Engine logic is server-side only — never imported in client components.
export { evaluateChain, formatReport } from "../../src/engine/index";
export type {
  SystemReport,
  LinkReport,
  Recommendation,
  RecommendationOption,
  RecommendationKind,
  RecommendationConfidence,
} from "../../src/engine/index";
export type {
  Chain,
  ChainNode,
  Component,
  Cable,
  ListeningContext,
  ComponentCategory,
  SignalDomain,
} from "../../src/types";

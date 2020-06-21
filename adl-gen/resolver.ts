/* @generated from adl */
import { declResolver, ScopedDecl } from "./runtime/adl.ts";
import { _AST_MAP as dnt_manifest } from "./dnt/manifest.ts";
import { _AST_MAP as sys_types } from "./sys/types.ts";

export const ADL: { [key: string]: ScopedDecl } = {
  ...dnt_manifest,
  ...sys_types,
};

export const RESOLVER = declResolver(ADL);

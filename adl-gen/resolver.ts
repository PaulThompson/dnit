// deno-lint-ignore-file
/* @generated from adl */
import { declResolver, ScopedDecl } from "./runtime/adl.ts";
import { _AST_MAP as dnit_manifest } from "./dnit/manifest.ts";
import { _AST_MAP as sys_types } from "./sys/types.ts";

export const ADL: { [key: string]: ScopedDecl } = {
  ...dnit_manifest,
  ...sys_types,
};

export const RESOLVER = declResolver(ADL);

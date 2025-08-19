/**
 * "Flavoured" nominal typing utilities.
 *
 * Based on the pattern from:
 * https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/
 *
 * We use a symbol for the hidden field to ensure uniqueness across different
 * flavored types while maintaining runtime compatibility with the base type.
 */

const sym: unique symbol = Symbol();

/**
 * Creates a "flavored" nominal type that is structurally identical to the base type
 * but nominally distinct, preventing accidental type mixing.
 *
 * @template T - The base string type to flavor
 * @template Name - A unique string literal to distinguish this flavored type
 *
 * @example
 * ```typescript
 * type UserId = Flavored<string, "UserId">;
 * type ProductId = Flavored<string, "ProductId">;
 *
 * const userId: UserId = "user123" as UserId;
 * const productId: ProductId = userId; // ❌ Type error - prevents mixing
 * ```
 */
export type Flavored<T extends string, Name extends string> = T & {
  readonly [sym]?: Name;
};

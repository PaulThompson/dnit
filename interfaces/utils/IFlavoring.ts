// "Flavoured" nominal typing.
// https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/
// We use a symbol for the hidden field to ensure uniqueness

const sym: unique symbol = Symbol();

export type Flavored<T extends string, Name extends string> = T & {
  readonly [sym]?: Name;
};

# lizod

Lightweight zod-like validator (about 600bytes with full features)

```bash
$ npm install lizod -S
```

## Concepts

- Spiritual successor of zod but for bundle size.
  - No method-chaining
  - No error reporters
  - No string utils like `.email()`
- Bare TypeScript's type expression helpers

## How to use

```ts
// Pick validators for treeshake
import {
  $any,
  $array,
  $boolean,
  $const,
  $enum,
  $intersection,
  $null,
  $number,
  $object,
  $opt,
  $regexp,
  $string,
  $symbol,
  $undefined,
  $union,
  $void,
  type Infer,
  type Validator,
} from "lizod";

const validate = $object({
  name: $string,
  age: $number,
  familyName: $opt($string),
  abc: $enum(["a" as const, "b" as const, "c" as const]),
  nested: $object({
    age: $number,
  }),
  static: $const("static"),
  items: $array($object({
    a: $string,
    b: $boolean,
  })),
  complex: $array($union([
    $object({ a: $string }),
    $object({ b: $number }),
  ])),
  sec: $intersection([$string, $const("x")]),
});

const v: Infer<typeof validate> = {
  name: "aaa",
  age: 1,
  familyName: null,
  abc: "b",
  nested: {
    age: 1,
  },
  static: "static",
  items: [
    {
      a: "",
      b: true,
    },
    {
      a: "",
      b: false,
    },
  ],
  complex: [
    { a: "" },
    { b: 1 },
  ],
  sec: "x",
};

if (validate(v)) {
  const _: string = v.name;
  const __: number = v.age;
  const ___: string | void = v.familyName;
  const ____: "a" | "b" | "c" = v.abc;
  const _____: { age: number } = v.nested;
  const ______: "static" = v.static;
  const _______: Array<{
    a: string;
    b: boolean;
  }> = v.items;
}
```

## With custom validator

```ts
// with custom validator
import type { Validator } from "lizod";

const isA: Validator<"A"> = (input: any): input is "A" => input === "A";
const myValidator = $object({
  a: isA,
});
```

## Relations

- https://github.com/colinhacks/zod

## LICENSE

MIT

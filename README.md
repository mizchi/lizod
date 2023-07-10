# lizod

Lightweight zod-like validator (about 600bytes with full features)

```bash
$ npm install lizod -S
```

typescript >=5 required.

## Concepts

- Spiritual successor of zod but for bundle size.
  - No method-chaining
  - No string utils like `.email()`
  - Very simple error reporter
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
  $record,
  type Infer,
  type Validator,
} from "lizod";

const validate = $object({
  name: $string,
  age: $number,
  familyName: $opt($string),
  abc: $enum(["a", "b", "c"]),
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
  record: $record($string, $number)
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
  record: {
    "a": 1,
    "b": 2
  }
};

if (validate(v)) {
  const _1: string = v.name;
  const _2: number = v.age;
  const _3: string | void = v.familyName;
  const _4: "a" | "b" | "c" = v.abc;
  const _5: { age: number } = v.nested;
  const _6: "static" = v.static;
  const _7: Array<{
    a: string;
    b: boolean;
  }> = v.items;
}
```

## exact | loose object

Allow unchecked params on object

```ts
import {$object, $string} from "lizod";

// default exact
const ret1 = $object({a: $string}, /* default */ true)({a: "", b: ""}); // => false
// loose
const ret2 = $object({a: $string}, false)({a: "", b: ""}) // => true;
```

default mode is exact.

## Error Reporter

```ts
import { $object, $string, access } from "lizod";

// your validator
const validate = $object({ a: $string });

const input = { a: 1 };

// check with context mutation
const ctx = { errors: [] };
const ret = validate(input, ctx);

// report errors
for (const errorPath of ctx.errors) {
  console.log("error at", errorPath, access(input, errorPath));
}
```

Do not reuse `ctx`.

## With custom validator

```ts
import type { Validator, ValidatorContext } from "lizod";

// simple validator
const isA: Validator<"A"> = (input: any): input is "A" => input === "A";
const myValidator = $object({
  a: isA,
});

// create wrapper validator
// you should pass context args to next validator for error reporter
const wrap: (child: Validator<string>) => Validator<string> =
  (input: any, ctx: ValidatorContext, path = []): input is string => child(input, ctx, path);
```

## Relations

- https://github.com/colinhacks/zod

## ChangeLog

### v0.2.6

- added: `$record`
- added: `$numberString`

### v0.2.5

- fix: `$intersection` return type https://github.com/mizchi/lizod/pull/13

## LICENSE

MIT

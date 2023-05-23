import { expect, test } from "vitest";
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
  access,
  type Infer,
  Validator,
} from "./index.js";

test("primitives", () => {
  expect($any("")).toBe(true);
  expect($any(1)).toBe(true);
  expect($any(true)).toBe(true);
  expect($any(null)).toBe(true);
  expect($any(undefined)).toBe(true);

  expect($string("")).toBe(true);
  expect($string(1)).toBe(false);
  expect($number(1)).toBe(true);
  expect($number("")).toBe(false);
  expect($boolean(true)).toBe(true);
  expect($boolean("")).toBe(false);
  expect($boolean(1)).toBe(false);
  expect($const("a")("a")).toBe(true);
  expect($const("a")("b")).toBe(false);
  expect($regexp(/a/)("a")).toBe(true);
  expect($regexp(/a/)("b")).toBe(false);
  expect($regexp(/a/)(false)).toBe(false);

  expect($enum(["a", "b", "c"])("a")).toBe(true);
  expect($enum(["a", "b", "c"])("b")).toBe(true);
  expect($enum(["a", "b", "c"])("d")).toBe(false);
  expect($intersection([$string, $const("x")])("x")).toBe(true);
  expect($intersection([$string, $const("x")])("yyy")).toBe(false);
  expect($intersection([])("yyy")).toBe(true);

  expect($null(null)).toBe(true);
  expect($null(undefined)).toBe(false);
  expect($null("")).toBe(false);
  expect($null(1)).toBe(false);
  expect($undefined(undefined)).toBe(true);
  expect($undefined(null)).toBe(false);
  expect($undefined("")).toBe(false);
  expect($undefined(1)).toBe(false);
  expect($void(undefined)).toBe(true);
  expect($void(null)).toBe(true);
  expect($void("")).toBe(false);
  expect($symbol(Symbol())).toBe(true);
  expect($symbol("")).toBe(false);

  expect($opt($string)("")).toBe(true);
  expect($opt($string)(null)).toBe(true);
  expect($opt($string)("")).toBe(true);
  expect($opt($string)(1)).toBe(false);
  expect($opt($number)(null)).toBe(true);
});

test("object", () => {
  expect($object({})({})).toBe(true);
  expect($object({})({ a: "" })).toBe(false);
  // exact true is default
  expect($object({}, false)({ a: "" })).toBe(true);

  expect($object({ a: $string })({ a: "" })).toBe(true);
  expect($object({ a: $string })({ a: 1 })).toBe(false);
  expect($object({ a: $string })({})).toBe(false);
  expect($object({ a: $string })({ a: "", b: "" })).toBe(false);
  expect($object({ a: $string }, false)({ a: "", b: "" })).toBe(true);
  expect(
    $object({ a: $string, nested: $object({ v: $string }) })({
      a: "",
      nested: { v: "hello" },
    }),
  ).toBe(true);
  expect(
    $object({ a: $string, nested: $object({ v: $string }) })({
      a: "",
      nested: { v: 1 },
    }),
  ).toBe(false);
});

test("array", () => {
  expect($array($string)([])).toBe(true);
  expect($array($string)({})).toBe(false);

  expect($array($string)([""])).toBe(true);
  expect($array($string)([1])).toBe(false);
  expect($array($number)([])).toBe(true);
  expect($array($number)([1])).toBe(true);
  expect($array($number)([""])).toBe(false);

  expect($array($object({ a: $number }))([])).toBe(true);
  expect($array($object({ a: $number }))([{ a: 1 }])).toBe(true);
  expect($array($object({ a: $number }))([{ a: "" }])).toBe(false);
  expect($array($object({ a: $number }))([{ a: "" }])).toBe(false);
});

test("union", () => {
  expect($union([$string, $number])("")).toBe(true);
  expect($union([$string, $number])(1)).toBe(true);
  expect($union([$string, $number])(true)).toBe(false);
  expect($union([$string, $number])({})).toBe(false);
  expect($union([$string, $number])("")).toBe(true);
});

test("complex", () => {
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
  } else {
    throw new Error("validation failed");
  }
});

test("with custom validator", () => {
  const isA: Validator<"A"> = (input: any): input is "A" => input === "A";

  const validate = $object({
    a: isA,
  });
  expect(validate({ a: "A" })).toBe(true);
  expect(validate({ a: "B" })).toBe(false);
});

test("errors", () => {
  {
    const ctx = { errors: [] };
    expect($object({ a: $number })({ a: 1 }, ctx)).toBe(true);
    expect(ctx.errors).toEqual([]);
  }
  {
    const ctx = { errors: [] };
    expect($object({ a: $number })({ a: "" }, ctx)).toBe(false);
    expect(ctx.errors).toEqual([["a"]]);
  }
  {
    const ctx = { errors: [] };
    expect($object({ a: $number, b: $number })({ a: "", b: false }, ctx)).toBe(
      false,
    );
    expect(ctx.errors).toEqual([["a"], ["b"]]);
  }
  // nested object
  {
    const ctx = { errors: [] };
    expect($object({ a: $object({ b: $number }) })({ a: { b: true } }, ctx))
      .toBe(
        false,
      );
    expect(ctx.errors).toEqual([["a", "b"], ["a"]]);
  }

  // object with array
  {
    const ctx = { errors: [] };
    expect($object({ a: $array($number) })({ a: ["0", 1, "2", 3] }, ctx))
      .toBe(
        false,
      );
    expect(ctx.errors).toEqual([["a", 0], ["a", 2], ["a"]]);
  }

  // nested array
  {
    const ctx = { errors: [] };
    expect($array($array($number))([["0", 1, "2", 3]], ctx))
      .toBe(
        false,
      );
    expect(ctx.errors).toEqual([[0, 0], [0, 2], [0]]);
    expect(access([["0", 1, "2", 3]], [0, 0])).toBe("0");
    expect(access([["0", 1, "2", 3]], [0, 2])).toBe("2");
  }
});

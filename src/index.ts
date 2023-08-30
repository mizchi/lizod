// lightweight zod

type AccessPath = Array<(string | symbol | number)>;
type ValidatorContext = {
  errors: Array<AccessPath>;
};

export type Validator<Expect> = (
  input: any,
  ctx?: ValidatorContext,
  path?: (string | symbol | number)[],
) => input is Expect;
export type Infer<T> = T extends Validator<infer E> ? E
  : unknown;

// ref: https://stackoverflow.com/questions/75405517/typescript-generic-function-where-parameters-compose-into-the-return-type
type Intersection<Vs extends Validators> = {
  [I in keyof Vs]: (x: Vs[I]) => void;
}[number] extends (x: Validator<infer R>) => void ? R : never;

/** ref: {@link Promise.all} */
type Validators = readonly Validator<any>[] | [];

type MapInfer<T> = {
  [K in keyof T]: Infer<T[K]>;
}

export const $const =
  <T extends number | string | boolean | undefined | void | symbol>(
    def: T,
  ): Validator<T> =>
  (input: any): input is T => {
    return input === def;
  };

// for compressor
const _typeof = (input: any): string => typeof input;

export const $undefined: Validator<undefined> = (
  input: any,
): input is undefined => {
  return input === undefined;
};

export const $null: Validator<null> = (input: any): input is null => {
  return input === null;
};

export const $void: Validator<void> = (input: any): input is void => {
  return input == null;
};

export const $any: Validator<void> = (input: any): input is any => {
  return true;
};

export const $opt =
  <T>(validator: Validator<T>): Validator<T | null | undefined> =>
  (input: any, ctx): input is T | null | undefined => {
    return input == null || validator(input, ctx);
  };

export const $nullable =
  <T>(validator: Validator<T>): Validator<NonNullable<T> | null> =>
  (input: any, ctx): input is NonNullable<T> | null => {
    return input === null || validator(input, ctx);
  };

export const $string: Validator<string> = (input: any): input is string => {
  return _typeof(input) === "string";
};

/** Number parseable string for record key */
export const $numberString: Validator<string> = (
  input: any,
): input is string => {
  if (_typeof(input) === "string" && input.length > 0) {
    const parsed = Number(input);
    return Number.isNaN(parsed) === false;
  }
  return false;
};

export const $regexp =
  (regexp: RegExp): Validator<string> => (input: any): input is string => {
    return _typeof(input) === "string" && regexp.test(input);
  };

export const $symbol: Validator<symbol> = (input: any): input is symbol => {
  return _typeof(input) === "symbol";
};

export const $number: Validator<number> = (input: any): input is number => {
  return _typeof(input) === "number";
};

export const $bigint: Validator<bigint> = (input: any): input is bigint => {
  return _typeof(input) === "bigint";
}

export const $numberRange = (min: number | undefined, max: number | undefined): Validator<number> => (input: any): input is number => {
  return _typeof(input) === "number" && (min === undefined || input >= min) && (max === undefined || input < max);
}

export const $i8: Validator<number> = (input: any): input is number => {
  return _typeof(input) === "number" && input % 1 === 0 && input >= -128 && input < 128;
}

export const $u8: Validator<number> = (input: any): input is number => {
  return _typeof(input) === "number" && input % 1 === 0 && input >= 0 && input < 256;
}

export const $i16: Validator<number> = (input: any): input is number => {
  return _typeof(input) === "number" && input % 1 === 0 && input >= -32768 && input < 32768;
}

export const $u16: Validator<number> = (input: any): input is number => {
  return _typeof(input) === "number" && input % 1 === 0 && input >= 0 && input < 65536;
}

export const $i32: Validator<number> = (input: any): input is number => {
  return _typeof(input) === "number" && input % 1 === 0 && input >= -2147483648 && input < 2147483648;
}

export const $u32: Validator<number> = (input: any): input is number => {
  return _typeof(input) === "number" && input % 1 === 0 && input >= 0 && input < 4294967296;
}

export const $boolean: Validator<boolean> = (input: any): input is boolean => {
  return _typeof(input) === "boolean";
};

export const $enum =
  <const E extends readonly string[]>(enums: E): Validator<E[number]> =>
  (input: any): input is E[number] => {
    return enums.includes(input);
  };

export const $intersection = <Vs extends Validators>(validators: Vs) => {
  const fn = (
    input: any,
    ctx: ValidatorContext = { errors: [] },
    path: (string | symbol | number)[] = [],
  ): input is Intersection<Vs> => {
    for (const validator of validators) {
      if (!validator(input, ctx, path)) return false;
    }
    return true;
  };
  return fn;
};

export const $union = <Vs extends Validators>(validators: Vs) => {
  const fn = (
    input: any,
    ctx?: ValidatorContext,
    path: (string | symbol | number)[] = [],
  ): input is Infer<Vs[number]> => {
    for (const validator of validators) {
      if (validator(input, ctx, path)) {
        return true;
      }
    }
    return false;
  };
  return fn;
};

export const $object = <
  Map extends Record<string, Validator<any>>,
>(vmap: Map, exact: boolean = true) => {
  const fn = (
    input: any,
    ctx?: ValidatorContext,
    path: AccessPath = [],
  ): input is MapInfer<Map> => {
    if (_typeof(input) !== "object" || input === null) {
      return false;
    }
    const unchecked = new Set(Object.keys(input));
    let failed = false;
    for (const [key, validator] of Object.entries(vmap)) {
      if (key === "__proto__") {
        continue;
      }
      const childPath = [...path, key] as AccessPath;
      if (!validator(input?.[key], ctx, childPath)) {
        failed = true;
        ctx?.errors.push(childPath);
      }
      unchecked.delete(key);
    }
    if (failed) return false;
    if (exact) {
      return unchecked.size === 0;
    } else {
      return true;
    }
  };
  return fn;
};

export const $array = <
  T extends Validator<any>,
>(child: T) => {
  const fn = (
    input: any,
    ctx?: ValidatorContext,
    path: AccessPath = [],
  ): input is Array<Infer<T>> => {
    if (!Array.isArray(input)) return false;
    let failed = false;
    for (let i = 0; i < input.length; i++) {
      const childPath = [...path, i];
      const v = input[i];
      if (!child(v, ctx, childPath)) {
        failed = true;
        ctx?.errors.push(childPath);
      }
    }
    if (failed) return false;
    return true;
  };
  return fn;
};

export const $record = <
  K extends Validator<string>,
  V extends Validator<any>,
>(keyValidator: K, valueValidator: V) => {
  const fn = (
    input: any,
    ctx?: ValidatorContext,
    path: AccessPath = [],
  ): input is {
    [K: string]: Infer<V>;
  } => {
    if (_typeof(input) !== "object" || input === null) {
      return false;
    }
    let failed = false;
    for (const [key, val] of Object.entries(input)) {
      if (key === "__proto__") continue;
      const childPath = [...path, key] as AccessPath;
      if (!keyValidator(key, ctx, childPath)) {
        failed = true;
        ctx?.errors.push(childPath);
      }
      if (!valueValidator(val, ctx, childPath)) {
        failed = true;
        ctx?.errors.push(childPath);
      }
    }
    if (failed) return false;
    return true;
  };
  return fn;
};

export const $tuple = <Vs extends Validators>(children: Vs) => {
  const fn = (
    input: unknown,
    ctx?: ValidatorContext,
    path: AccessPath = [],
  ): input is MapInfer<Vs> => {
    if (!Array.isArray(input)) return false;
    const length = Math.max(children.length, input.length ?? 0);
    let failed = false;
    for (let i = 0; i < length; i++) {
      const childPath = [...path, i];
      const v = input[i];
      if (!children[i]?.(v, ctx, childPath)) {
        failed = true;
        ctx?.errors.push(childPath);
      }
    }
    return !failed;
  };
  return fn;
};

export const access = (obj: any, path: Array<string | number>) =>
  path.reduce((o, k) => o?.[k], obj);

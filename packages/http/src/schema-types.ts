// schema-types.ts
export interface ObjectSchema {
  type: 'object';
  properties?: Record<string, PropertySchema>;
  required?: readonly string[];
  additionalProperties?: boolean | PropertySchema;
}

export interface StringSchema {
  type: 'string';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  enum?: readonly string[];
  const?: string;
}

export interface NumberSchema {
  type: 'number' | 'integer';
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  enum?: readonly number[];
  const?: number;
}

export interface BooleanSchema {
  type: 'boolean';
  const?: boolean;
}

export interface ArraySchema {
  type: 'array';
  items?: PropertySchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

export interface NullSchema {
  type: 'null';
}

export type PropertySchema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | ArraySchema
  | ObjectSchema
  | NullSchema
  | { anyOf: readonly PropertySchema[] }
  | { oneOf: readonly PropertySchema[] }
  | { allOf: readonly PropertySchema[] };

// Params/Query/Headers must be objects with string properties
export interface ParamsSchema {
  type: 'object';
  properties?: Record<string, StringSchema>;
  required?: readonly string[];
}

export interface QuerySchema {
  type: 'object';
  properties?: Record<string, StringSchema | { type: 'array'; items: StringSchema }>;
  required?: readonly string[];
}

export interface HeadersSchema {
  type: 'object';
  properties?: Record<string, StringSchema | { type: 'array'; items: StringSchema }>;
  required?: readonly string[];
}

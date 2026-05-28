import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { z, type ZodType } from 'zod';

type JsonSchema = {
  anyOf?: JsonSchema[];
  const?: unknown;
  enum?: unknown[];
  format?: string;
  items?: JsonSchema;
  maxItems?: number;
  minItems?: number;
  maxLength?: number;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  description?: string;
  nullable?: boolean;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type?: string | string[];
};

const isNullJsonSchema = (schema: JsonSchema) => schema.type === 'null';

const getJsonSchemaType = (schema: JsonSchema) => {
  if (Array.isArray(schema.type)) {
    const nonNullTypes = schema.type.filter((type) => type !== 'null');

    if (nonNullTypes.length !== 1) {
      return undefined;
    }

    return nonNullTypes[0];
  }

  return schema.type;
};

const applyNullable = <Schema extends ResponseSchema>(schema: Schema, nullable?: boolean) => {
  if (!nullable) {
    return schema;
  }

  return {
    ...schema,
    nullable: true,
  } satisfies ResponseSchema;
};

const applyDescription = <Schema extends ResponseSchema>(
  schema: Schema,
  jsonSchema: JsonSchema,
  resolvedType: string | undefined,
) => {
  const parts: string[] = [];

  if (schema.description) {
    parts.push(schema.description);
  }

  if (jsonSchema.description && !parts.includes(jsonSchema.description)) {
    parts.push(jsonSchema.description);
  }

  if (resolvedType === 'string') {
    if (jsonSchema.maxLength !== undefined && jsonSchema.minLength !== undefined) {
      parts.push(`Length must be between ${jsonSchema.minLength} and ${jsonSchema.maxLength} characters.`);
    } else if (jsonSchema.maxLength !== undefined) {
      parts.push(`Maximum length is ${jsonSchema.maxLength} characters.`);
    } else if (jsonSchema.minLength !== undefined) {
      parts.push(`Minimum length is ${jsonSchema.minLength} characters.`);
    }
  } else if (resolvedType === 'array') {
    if (jsonSchema.maxItems !== undefined && jsonSchema.minItems !== undefined) {
      parts.push(`Must contain between ${jsonSchema.minItems} and ${jsonSchema.maxItems} items.`);
    } else if (jsonSchema.maxItems !== undefined) {
      parts.push(`Must contain at most ${jsonSchema.maxItems} items.`);
    } else if (jsonSchema.minItems !== undefined) {
      parts.push(`Must contain at least ${jsonSchema.minItems} items.`);
    }
  } else if (resolvedType === 'integer' || resolvedType === 'number') {
    if (jsonSchema.minimum !== undefined && jsonSchema.maximum !== undefined) {
      parts.push(`Must be between ${jsonSchema.minimum} and ${jsonSchema.maximum}.`);
    } else if (jsonSchema.minimum !== undefined) {
      parts.push(`Must be at least ${jsonSchema.minimum}.`);
    } else if (jsonSchema.maximum !== undefined) {
      parts.push(`Must be at most ${jsonSchema.maximum}.`);
    }
  }

  if (parts.length === 0) {
    return schema;
  }

  return {
    ...schema,
    description: parts.join(' '),
  } satisfies ResponseSchema;
};

const constToGeminiSchema = (value: unknown): ResponseSchema | undefined => {
  if (typeof value === 'string') {
    return {
      enum: [value],
      type: SchemaType.STRING,
    } as any;
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return {
        type: SchemaType.INTEGER,
      };
    }

    return {
      type: SchemaType.NUMBER,
    };
  }

  if (typeof value === 'boolean') {
    return {
      type: SchemaType.BOOLEAN,
    } satisfies ResponseSchema;
  }

  return undefined;
};

const toGeminiSchema = (schema: JsonSchema): ResponseSchema => {
  if (schema.anyOf) {
    const nullable = schema.anyOf.some(isNullJsonSchema);
    const nonNullSchemas = schema.anyOf.filter((item) => !isNullJsonSchema(item));

    if (nonNullSchemas.length !== 1) {
      throw new Error('Unsupported anyOf schema.');
    }

    const resolved = toGeminiSchema(nonNullSchemas[0]);
    const type = getJsonSchemaType(nonNullSchemas[0]);
    return applyNullable(applyDescription(resolved, schema, type), nullable);
  }

  if (schema.const !== undefined) {
    const constSchema = constToGeminiSchema(schema.const);

    if (!constSchema) {
      throw new Error('Unsupported const schema.');
    }

    return applyNullable(applyDescription(constSchema, schema, typeof schema.const), schema.nullable);
  }

  const type = getJsonSchemaType(schema);
  const nullable = schema.nullable || (Array.isArray(schema.type) && schema.type.includes('null'));

  let resultSchema: ResponseSchema;

  if (type === 'object') {
    const propertyEntries = Object.entries(schema.properties ?? {}).map(([key, value]) => [
      key,
      toGeminiSchema(value),
    ]);
    const properties = Object.fromEntries(propertyEntries);

    if (Object.keys(properties).length === 0) {
      throw new Error('Gemini object response schemas require at least one property.');
    }

    const required = schema.required?.filter((key) => key in properties);

    resultSchema = applyNullable(
      {
        properties,
        ...(required && required.length > 0 ? { required } : {}),
        type: SchemaType.OBJECT,
      },
      nullable,
    );
  } else if (type === 'array') {
    if (!schema.items) {
      throw new Error('Gemini array response schemas require items.');
    }

    resultSchema = applyNullable(
      {
        items: toGeminiSchema(schema.items),
        type: SchemaType.ARRAY,
      },
      nullable,
    );
  } else if (type === 'string') {
    const enumValues = schema.enum?.filter((item): item is string => typeof item === 'string');

    if (enumValues && enumValues.length === schema.enum?.length && enumValues.length > 0) {
      resultSchema = applyNullable(
        {
          enum: enumValues,
          type: SchemaType.STRING,
        } as any,
        nullable,
      );
    } else {
      resultSchema = applyNullable(
        {
          type: SchemaType.STRING,
        },
        nullable,
      );
    }
  } else if (type === 'integer') {
    resultSchema = applyNullable({ type: SchemaType.INTEGER }, nullable);
  } else if (type === 'number') {
    resultSchema = applyNullable({ type: SchemaType.NUMBER }, nullable);
  } else if (type === 'boolean') {
    resultSchema = applyNullable({ type: SchemaType.BOOLEAN }, nullable);
  } else {
    throw new Error(`Unsupported JSON schema type: ${String(type)}.`);
  }

  return applyDescription(resultSchema, schema, type);
};

export const toGeminiResponseSchema = (schema: ZodType): ResponseSchema =>
  toGeminiSchema(z.toJSONSchema(schema) as JsonSchema);

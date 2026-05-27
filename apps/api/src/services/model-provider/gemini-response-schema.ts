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

const constToGeminiSchema = (value: unknown): ResponseSchema | undefined => {
  if (typeof value === 'string') {
    return {
      enum: [value],
      format: 'enum',
      type: SchemaType.STRING,
    } satisfies ResponseSchema;
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

    return applyNullable(toGeminiSchema(nonNullSchemas[0]), nullable);
  }

  if (schema.const !== undefined) {
    const constSchema = constToGeminiSchema(schema.const);

    if (!constSchema) {
      throw new Error('Unsupported const schema.');
    }

    return applyNullable(constSchema, schema.nullable);
  }

  const type = getJsonSchemaType(schema);
  const nullable = schema.nullable || (Array.isArray(schema.type) && schema.type.includes('null'));

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

    return applyNullable(
      {
        properties,
        ...(required && required.length > 0 ? { required } : {}),
        type: SchemaType.OBJECT,
      },
      nullable,
    );
  }

  if (type === 'array') {
    if (!schema.items) {
      throw new Error('Gemini array response schemas require items.');
    }

    return applyNullable(
      {
        items: toGeminiSchema(schema.items),
        ...(typeof schema.maxItems === 'number' ? { maxItems: schema.maxItems } : {}),
        ...(typeof schema.minItems === 'number' ? { minItems: schema.minItems } : {}),
        type: SchemaType.ARRAY,
      },
      nullable,
    );
  }

  if (type === 'string') {
    const enumValues = schema.enum?.filter((item): item is string => typeof item === 'string');

    if (enumValues && enumValues.length === schema.enum?.length && enumValues.length > 0) {
      return applyNullable(
        {
          enum: enumValues,
          format: 'enum',
          type: SchemaType.STRING,
        },
        nullable,
      );
    }

    return applyNullable(
      {
        ...(schema.format === 'date-time' ? { format: 'date-time' as const } : {}),
        type: SchemaType.STRING,
      },
      nullable,
    );
  }

  if (type === 'integer') {
    return applyNullable({ type: SchemaType.INTEGER }, nullable);
  }

  if (type === 'number') {
    return applyNullable({ type: SchemaType.NUMBER }, nullable);
  }

  if (type === 'boolean') {
    return applyNullable({ type: SchemaType.BOOLEAN }, nullable);
  }

  throw new Error(`Unsupported JSON schema type: ${String(type)}.`);
};

export const toGeminiResponseSchema = (schema: ZodType): ResponseSchema =>
  toGeminiSchema(z.toJSONSchema(schema) as JsonSchema);

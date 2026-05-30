import { ZodError, ZodObject, ZodArray, ZodString, type ZodType, type z } from 'zod';

type StructuredParseSuccess<Schema extends ZodType> = {
  data: z.infer<Schema>;
  success: true;
};

type StructuredParseFailure = {
  issues: string[];
  success: false;
  validationSummary: string;
};

export type StructuredParseResult<Schema extends ZodType> =
  | StructuredParseSuccess<Schema>
  | StructuredParseFailure;

const codeFencePattern = /```(?:json)?\s*([\s\S]*?)```/i;

const matchingCloseCharacter: Record<string, string> = {
  '[': ']',
  '{': '}',
};

const getJsonCandidate = (text: string) => {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return null;
  }

  const fencedMatch = trimmedText.match(codeFencePattern);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  if (
    (trimmedText.startsWith('{') && trimmedText.endsWith('}')) ||
    (trimmedText.startsWith('[') && trimmedText.endsWith(']'))
  ) {
    return trimmedText;
  }

  for (let startIndex = 0; startIndex < text.length; startIndex += 1) {
    const startCharacter = text[startIndex];

    if (startCharacter !== '{' && startCharacter !== '[') {
      continue;
    }

    const stack = [matchingCloseCharacter[startCharacter]];
    let isInsideString = false;
    let isEscaped = false;

    for (let index = startIndex + 1; index < text.length; index += 1) {
      const character = text[index];

      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (character === '\\') {
        isEscaped = true;
        continue;
      }

      if (character === '"') {
        isInsideString = !isInsideString;
        continue;
      }

      if (isInsideString) {
        continue;
      }

      if (character === '{' || character === '[') {
        stack.push(matchingCloseCharacter[character]);
        continue;
      }

      if (character === stack[stack.length - 1]) {
        stack.pop();
      }

      if (stack.length === 0) {
        return text.slice(startIndex, index + 1).trim();
      }
    }
  }

  return null;
};

const toIssueMessages = (error: ZodError) =>
  error.issues.slice(0, 8).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'value';
    return `${path}: ${issue.message}`;
  });

const toValidationSummary = (issues: string[]) =>
  issues.length > 0 ? issues.join('; ') : 'The response did not match the expected structure.';

const normalizeModuleType = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  const parsed = value as { moduleType?: unknown };

  if (typeof parsed.moduleType !== 'string') {
    return;
  }

  const typeLower = parsed.moduleType.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (typeLower.includes('roadmap')) {
    parsed.moduleType = 'roadmap';
  } else if (typeLower.includes('stack_advice') || typeLower.includes('stackadvice')) {
    parsed.moduleType = 'STACK_ADVICE';
  } else if (
    typeLower.includes('developer_job_description') ||
    typeLower.includes('developerjobdescription') ||
    typeLower.includes('developer_jd')
  ) {
    parsed.moduleType = 'developer_job_description';
  } else if (typeLower.includes('quote_analysis') || typeLower.includes('quoteanalysis')) {
    parsed.moduleType = 'quote_analysis';
  } else if (typeLower.includes('code_audit') || typeLower.includes('codeaudit')) {
    parsed.moduleType = 'code_audit';
  } else if (typeLower.includes('vetting_scorecard') || typeLower.includes('vettingscorecard')) {
    parsed.moduleType = 'vetting_scorecard';
  }
};

const getSingleObjectFromArray = (value: unknown) => {
  if (!Array.isArray(value) || value.length !== 1) {
    return undefined;
  }

  const [item] = value;

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return undefined;
  }

  return item;
};

const truncateStringToSchemaLimits = (value: any, schema: any): any => {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle optional/nullable/unwrap wrappers
  if (schema && typeof schema.unwrap === 'function') {
    return truncateStringToSchemaLimits(value, schema.unwrap());
  }

  // Handle ZodEffects (superRefine, refine, transform)
  if (schema && schema._def && schema._def.schema) {
    return truncateStringToSchemaLimits(value, schema._def.schema);
  }

  // Handle ZodObject
  if (schema && schema instanceof ZodObject) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    const shape = schema.shape;
    const result = { ...value };
    for (const key of Object.keys(shape)) {
      if (key in result) {
        result[key] = truncateStringToSchemaLimits(result[key], shape[key]);
      }
    }
    return result;
  }

  // Handle ZodArray
  if (schema && schema instanceof ZodArray) {
    if (!Array.isArray(value)) {
      return value;
    }
    return value.map((item) => truncateStringToSchemaLimits(item, schema.element));
  }

  // Handle ZodString
  if (schema && schema instanceof ZodString) {
    if (typeof value === 'string') {
      const checks = (schema._def as any).checks || [];
      const maxCheck = checks.find((c: any) => c.kind === 'max');
      if (maxCheck && typeof maxCheck.value === 'number') {
        const maxLength = maxCheck.value;
        if (value.length > maxLength) {
          return value.substring(0, maxLength).trim();
        }
      }
    }
  }

  return value;
};

export const parseStructuredOutput = <Schema extends ZodType>(
  text: string,
  schema: Schema,
): StructuredParseResult<Schema> => {
  const candidate = getJsonCandidate(text);

  if (!candidate) {
    const issues = ['value: No JSON object or array was found.'];
    return {
      issues,
      success: false,
      validationSummary: toValidationSummary(issues),
    };
  }

  try {
    const parsed = JSON.parse(candidate) as unknown;

    normalizeModuleType(parsed);

    const sanitized = truncateStringToSchemaLimits(parsed, schema);
    const result = schema.safeParse(sanitized);

    if (result.success) {
      return {
        data: result.data,
        success: true,
      };
    }

    const singleObject = getSingleObjectFromArray(parsed);
    if (singleObject) {
      normalizeModuleType(singleObject);

      const sanitizedSingle = truncateStringToSchemaLimits(singleObject, schema);
      const unwrappedResult = schema.safeParse(sanitizedSingle);

      if (unwrappedResult.success) {
        return {
          data: unwrappedResult.data,
          success: true,
        };
      }
    }

    const issues = toIssueMessages(result.error);

    return {
      issues,
      success: false,
      validationSummary: toValidationSummary(issues),
    };
  } catch (error) {
    const issues =
      error instanceof SyntaxError ? [`value: ${error.message}`] : ['value: JSON parsing failed.'];

    return {
      issues,
      success: false,
      validationSummary: toValidationSummary(issues),
    };
  }
};

import { ZodError, type ZodType, type z } from 'zod';

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
    const result = schema.safeParse(parsed);

    if (result.success) {
      return {
        data: result.data,
        success: true,
      };
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

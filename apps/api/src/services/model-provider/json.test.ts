import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseStructuredOutput } from './json.js';

const roadmapSchema = z
  .object({
    moduleType: z.literal('roadmap'),
    reportMarkdown: z.string().min(1),
  })
  .strict();

describe('parseStructuredOutput', () => {
  it('accepts a single object wrapped in a top-level array', () => {
    const result = parseStructuredOutput(
      JSON.stringify([
        {
          moduleType: 'RoadmapOutput',
          reportMarkdown: '# Roadmap',
        },
      ]),
      roadmapSchema,
    );

    expect(result).toEqual({
      data: {
        moduleType: 'roadmap',
        reportMarkdown: '# Roadmap',
      },
      success: true,
    });
  });

  it('still rejects arrays that are not a single object wrapper', () => {
    const result = parseStructuredOutput(
      JSON.stringify([
        {
          moduleType: 'roadmap',
          reportMarkdown: '# First',
        },
        {
          moduleType: 'roadmap',
          reportMarkdown: '# Second',
        },
      ]),
      roadmapSchema,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toContain('value: Invalid input: expected object, received array');
    }
  });
});

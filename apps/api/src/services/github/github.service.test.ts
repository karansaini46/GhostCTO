import { describe, expect, it } from 'vitest';

import {
  buildGithubRepositoryContextSection,
  parseGithubRepositoryUrl,
  type GithubRepositorySnapshot,
} from './github.service.js';

describe('github service helpers', () => {
  it('parses public repository roots', () => {
    const parsed = parseGithubRepositoryUrl('https://github.com/acme/ghostcto.git');

    expect(parsed.owner).toBe('acme');
    expect(parsed.repo).toBe('ghostcto');
    expect(parsed.url).toBe('https://github.com/acme/ghostcto');
  });

  it('rejects non-GitHub URLs', () => {
    expect(() => parseGithubRepositoryUrl('https://example.com/acme/ghostcto')).toThrow();
  });

  it('includes repository details and files in context', () => {
    const snapshot: GithubRepositorySnapshot = {
      metadata: {
        archived: false,
        defaultBranch: 'main',
        description: 'Example repository',
        forksCount: 2,
        fullName: 'acme/ghostcto',
        homepageUrl: null,
        htmlUrl: 'https://github.com/acme/ghostcto',
        language: 'TypeScript',
        license: null,
        openIssuesCount: 1,
        ownerLogin: 'acme',
        pushedAt: '2026-05-01T00:00:00.000Z',
        size: 128,
        stargazersCount: 10,
        topics: ['saas'],
        updatedAt: '2026-05-01T00:00:00.000Z',
        visibility: 'public',
      },
      repoUrl: 'https://github.com/acme/ghostcto',
      selectedFiles: [
        {
          content: 'process.stdout.write("hello\\n");',
          language: 'typescript',
          path: 'src/index.ts',
          reason: 'Implementation source code',
          sha: 'abc123',
          size: 21,
          type: 'file',
        },
      ],
      skippedFiles: [
        {
          path: 'node_modules/package/index.js',
          reason: 'Vendor, build, or generated directory',
          size: 1200,
        },
      ],
      totalFilesReviewed: 2,
      treeTruncated: false,
    };

    const context = buildGithubRepositoryContextSection(snapshot);

    expect(context).toMatch(/acme\/ghostcto/);
    expect(context).toMatch(/src\/index\.ts/);
    expect(context).toMatch(/node_modules\/package\/index\.js/);
  });
});

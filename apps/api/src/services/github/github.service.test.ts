import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGithubRepositoryContextSection,
  parseGithubRepositoryUrl,
  type GithubRepositorySnapshot,
} from './github.service.js';

test('parseGithubRepositoryUrl parses public repository roots', () => {
  const parsed = parseGithubRepositoryUrl('https://github.com/acme/ghostcto.git');

  assert.equal(parsed.owner, 'acme');
  assert.equal(parsed.repo, 'ghostcto');
  assert.equal(parsed.url, 'https://github.com/acme/ghostcto');
});

test('parseGithubRepositoryUrl rejects non-GitHub URLs', () => {
  assert.throws(() => parseGithubRepositoryUrl('https://example.com/acme/ghostcto'));
});

test('buildGithubRepositoryContextSection includes repository details and files', () => {
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
        content: 'console.log("hello");',
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

  assert.match(context, /acme\/ghostcto/);
  assert.match(context, /src\/index\.ts/);
  assert.match(context, /node_modules\/package\/index\.js/);
});

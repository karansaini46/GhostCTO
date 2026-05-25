import { ApiError } from '../../lib/api-error.js';

const githubApiBaseUrl = 'https://api.github.com';
const githubUserAgent = 'GhostCTO/1.0';

const maxSelectedFiles = 10;
const maxTotalSelectedBytes = 100_000;
const maxFileBytes = 40_000;
const maxLockfileBytes = 30_000;
const maxBlobTextLength = 40_000;

const lockfileNames = new Set([
  'bun.lockb',
  'composer.lock',
  'cargo.lock',
  'gemfile.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);

const blockedDirectorySegments = new Set([
  '.cache',
  '.git',
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'storybook-static',
  'vendor',
]);

const blockedExtensions = new Set([
  '.7z',
  '.avi',
  '.bmp',
  '.css.map',
  '.dll',
  '.doc',
  '.docx',
  '.eot',
  '.gif',
  '.ico',
  '.jpg',
  '.jpeg',
  '.lockb',
  '.mp3',
  '.mp4',
  '.pdf',
  '.png',
  '.psd',
  '.rar',
  '.svg',
  '.ttf',
  '.webm',
  '.webp',
  '.woff',
  '.woff2',
  '.xls',
  '.xlsx',
  '.zip',
]);

type GithubRepoResponse = {
  archived: boolean;
  default_branch: string;
  description: string | null;
  forks_count: number;
  full_name: string;
  html_url: string;
  language: string | null;
  license: { spdx_id: string | null; name: string | null } | null;
  open_issues_count: number;
  private: boolean;
  pushed_at: string | null;
  size: number;
  stargazers_count: number;
  topics?: string[];
  updated_at: string;
  visibility?: string;
  owner: {
    login: string;
    html_url: string;
  };
  homepage: string | null;
};

type GithubBranchResponse = {
  commit: {
    commit: {
      tree: {
        sha: string;
      };
    };
  };
};

type GithubTreeEntry = {
  path: string;
  sha: string;
  size?: number;
  type: 'blob' | 'commit' | 'tree';
};

type GithubTreeResponse = {
  truncated: boolean;
  tree: GithubTreeEntry[];
};

type GithubBlobResponse = {
  content: string;
  encoding: string;
  size: number;
};

export type GithubRepositoryReference = {
  owner: string;
  repo: string;
  url: string;
};

export type GithubRepositoryFile = {
  content: string;
  language: string | null;
  path: string;
  reason: string;
  sha: string;
  size: number;
  type: 'file';
};

export type GithubSkippedFile = {
  path: string;
  reason: string;
  size: number | null;
};

export type GithubRepositoryMetadata = {
  archived: boolean;
  defaultBranch: string;
  description: string | null;
  forksCount: number;
  fullName: string;
  homepageUrl: string | null;
  htmlUrl: string;
  language: string | null;
  license: {
    name: string | null;
    spdxId: string | null;
  } | null;
  openIssuesCount: number;
  ownerLogin: string;
  pushedAt: string | null;
  size: number;
  stargazersCount: number;
  topics: string[];
  updatedAt: string;
  visibility: string | null;
};

export type GithubRepositorySnapshot = {
  metadata: GithubRepositoryMetadata;
  repoUrl: string;
  selectedFiles: GithubRepositoryFile[];
  skippedFiles: GithubSkippedFile[];
  totalFilesReviewed: number;
  treeTruncated: boolean;
};

const safeDecodeContent = (content: string) => Buffer.from(content, 'base64').toString('utf8');

const compactWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const toPathSegments = (path: string) =>
  path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());

const isBlockedExtension = (path: string) => {
  const lower = path.toLowerCase();

  return [...blockedExtensions].some((extension) => lower.endsWith(extension));
};

const isLockfile = (path: string) => lockfileNames.has(path.split('/').pop()?.toLowerCase() ?? '');

const getExtension = (path: string) => {
  const lower = path.toLowerCase();
  const match = lower.match(/(\.[^./]+)$/);

  return match?.[1] ?? '';
};

const getLanguage = (path: string) => {
  const extension = getExtension(path);

  switch (extension) {
    case '.cjs':
    case '.js':
    case '.jsx':
    case '.mjs':
      return 'javascript';
    case '.css':
      return 'css';
    case '.go':
      return 'go';
    case '.graphql':
    case '.gql':
      return 'graphql';
    case '.html':
      return 'html';
    case '.json':
      return 'json';
    case '.md':
    case '.mdx':
      return 'markdown';
    case '.prisma':
      return 'prisma';
    case '.py':
      return 'python';
    case '.rb':
      return 'ruby';
    case '.rs':
      return 'rust';
    case '.sh':
      return 'bash';
    case '.sql':
      return 'sql';
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.vue':
      return 'vue';
    case '.yml':
    case '.yaml':
      return 'yaml';
    default:
      return null;
  }
};

const getSelectionReason = (path: string) => {
  const lower = path.toLowerCase();

  if (lower === 'package.json') {
    return 'Dependency manifest and scripts';
  }

  if (lower === 'prisma/schema.prisma') {
    return 'Primary data model';
  }

  if (lower === 'tsconfig.json' || lower.endsWith('/tsconfig.json')) {
    return 'TypeScript compiler settings';
  }

  if (lower === '.github/workflows') {
    return 'CI workflow configuration';
  }

  if (
    lower.endsWith('dockerfile') ||
    lower.endsWith('docker-compose.yml') ||
    lower.endsWith('docker-compose.yaml')
  ) {
    return 'Deployment and runtime configuration';
  }

  if (lower === 'readme.md' || lower.endsWith('/readme.md')) {
    return 'Project overview and setup notes';
  }

  if (
    lower.startsWith('src/') ||
    lower.startsWith('app/') ||
    lower.startsWith('pages/') ||
    lower.startsWith('components/') ||
    lower.startsWith('server/') ||
    lower.startsWith('api/') ||
    lower.startsWith('routes/') ||
    lower.startsWith('controllers/') ||
    lower.startsWith('services/') ||
    lower.startsWith('lib/') ||
    lower.startsWith('utils/') ||
    lower.startsWith('prisma/') ||
    lower.startsWith('tests/') ||
    lower.includes('/src/') ||
    lower.includes('/app/') ||
    lower.includes('/pages/') ||
    lower.includes('/components/') ||
    lower.includes('/services/') ||
    lower.includes('/controllers/')
  ) {
    return 'Implementation source code';
  }

  if (lower.startsWith('.github/')) {
    return 'Repository automation and CI';
  }

  if (lower.endsWith('.md')) {
    return 'Documentation';
  }

  if (lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    return 'Configuration file';
  }

  return null;
};

const getSelectionScore = (path: string) => {
  const lower = path.toLowerCase();
  let score = 0;

  if (lower === 'package.json') {
    score += 120;
  }

  if (lower === 'prisma/schema.prisma') {
    score += 115;
  }

  if (lower === 'tsconfig.json' || lower.endsWith('/tsconfig.json')) {
    score += 100;
  }

  if (lower.startsWith('.github/workflows/')) {
    score += 95;
  }

  if (
    lower.endsWith('dockerfile') ||
    lower.endsWith('docker-compose.yml') ||
    lower.endsWith('docker-compose.yaml')
  ) {
    score += 90;
  }

  if (lower.startsWith('src/') || lower.includes('/src/')) {
    score += 80;
  }

  if (lower.startsWith('app/') || lower.includes('/app/')) {
    score += 75;
  }

  if (
    lower.startsWith('pages/') ||
    lower.startsWith('components/') ||
    lower.startsWith('routes/') ||
    lower.startsWith('controllers/') ||
    lower.startsWith('services/') ||
    lower.startsWith('server/') ||
    lower.startsWith('api/') ||
    lower.startsWith('lib/') ||
    lower.startsWith('utils/')
  ) {
    score += 70;
  }

  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx')
  ) {
    score += 45;
  }

  if (lower.endsWith('.md')) {
    score += 20;
  }

  if (lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    score += 35;
  }

  if (
    lower.includes('test') ||
    lower.includes('__tests__') ||
    lower.includes('.spec.') ||
    lower.includes('.test.')
  ) {
    score += 15;
  }

  return score;
};

const isBlockedPath = (path: string) => {
  const lower = path.toLowerCase();
  const segments = toPathSegments(path);

  if (segments.some((segment) => blockedDirectorySegments.has(segment))) {
    return 'Vendor, build, or generated directory';
  }

  if (isBlockedExtension(path)) {
    return 'Binary or image file';
  }

  if (lower.endsWith('.map')) {
    return 'Generated source map';
  }

  if (lower.includes('/generated/') || lower.startsWith('generated/')) {
    return 'Generated file';
  }

  if (lower.endsWith('.min.js') || lower.endsWith('.min.css')) {
    return 'Minified build artifact';
  }

  return null;
};

const tryParseJson = (value: string) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const toApiError = (statusCode: number, code: string, message: string, expose = true) =>
  new ApiError(statusCode, code, message, expose);

const handleGithubError = async (response: Response) => {
  const body = await response.text();
  const parsedBody = tryParseJson(body);
  const message = compactWhitespace(
    typeof parsedBody === 'object' && parsedBody && 'message' in parsedBody
      ? String((parsedBody as { message?: string }).message ?? '')
      : body,
  );

  if (
    response.status === 403 &&
    (response.headers.get('x-ratelimit-remaining') === '0' ||
      message.toLowerCase().includes('rate limit'))
  ) {
    throw toApiError(429, 'GITHUB_RATE_LIMITED', 'GitHub rate limit reached. Try again later.');
  }

  if (response.status === 404) {
    throw toApiError(
      404,
      'GITHUB_REPOSITORY_UNAVAILABLE',
      'Public repository access is unavailable. The repository may be private, missing, or restricted.',
    );
  }

  if (response.status === 403) {
    throw toApiError(
      403,
      'GITHUB_REPOSITORY_FORBIDDEN',
      'GitHub blocked access to this public repository.',
    );
  }

  throw toApiError(
    response.status >= 500 ? 502 : response.status,
    'GITHUB_REQUEST_FAILED',
    message ? 'GitHub could not complete the repository request.' : 'GitHub request failed.',
  );
};

const githubRequest = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${githubApiBaseUrl}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': githubUserAgent,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    await handleGithubError(response);
  }

  const body = (await response.json()) as T;
  return body;
};

const normalizeRepoName = (value: string) => {
  const repo = value.trim().replace(/\.git$/i, '');

  if (!repo || !/^[A-Za-z0-9._-]+$/.test(repo)) {
    throw toApiError(400, 'GITHUB_INVALID_URL', 'Provide a valid GitHub repository URL.');
  }

  return repo;
};

const normalizeOwnerName = (value: string) => {
  const owner = value.trim();

  if (!owner || !/^[A-Za-z0-9-]+$/.test(owner)) {
    throw toApiError(400, 'GITHUB_INVALID_URL', 'Provide a valid GitHub repository URL.');
  }

  return owner;
};

export const parseGithubRepositoryUrl = (repoUrl: string): GithubRepositoryReference => {
  let parsed: URL;

  try {
    parsed = new URL(repoUrl.trim());
  } catch {
    throw toApiError(400, 'GITHUB_INVALID_URL', 'Provide a valid GitHub repository URL.');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    parsed.protocol !== 'https:' ||
    (hostname !== 'github.com' && hostname !== 'www.github.com')
  ) {
    throw toApiError(400, 'GITHUB_INVALID_URL', 'Provide a valid GitHub repository URL.');
  }

  const segments = parsed.pathname.split('/').filter(Boolean);

  if (segments.length !== 2) {
    throw toApiError(
      400,
      'GITHUB_INVALID_URL',
      'Provide the root GitHub repository URL, such as https://github.com/owner/repo.',
    );
  }

  const owner = normalizeOwnerName(decodeURIComponent(segments[0]));
  const repo = normalizeRepoName(decodeURIComponent(segments[1]));

  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
  };
};

const fetchRepositoryMetadata = async (reference: GithubRepositoryReference) => {
  const repo = await githubRequest<GithubRepoResponse>(
    `/repos/${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.repo)}`,
  );

  return {
    archived: repo.archived,
    defaultBranch: repo.default_branch,
    description: repo.description,
    forksCount: repo.forks_count,
    fullName: repo.full_name,
    homepageUrl: repo.homepage,
    htmlUrl: repo.html_url,
    language: repo.language,
    license: repo.license
      ? {
          name: repo.license.name,
          spdxId: repo.license.spdx_id,
        }
      : null,
    openIssuesCount: repo.open_issues_count,
    ownerLogin: repo.owner.login,
    pushedAt: repo.pushed_at,
    size: repo.size,
    stargazersCount: repo.stargazers_count,
    topics: repo.topics ?? [],
    updatedAt: repo.updated_at,
    visibility: repo.visibility ?? (repo.private ? 'private' : 'public'),
  } satisfies GithubRepositoryMetadata;
};

const fetchDefaultBranchTreeSha = async (
  reference: GithubRepositoryReference,
  defaultBranch: string,
) => {
  const branch = await githubRequest<GithubBranchResponse>(
    `/repos/${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.repo)}/branches/${encodeURIComponent(defaultBranch)}`,
  );

  return branch.commit.commit.tree.sha;
};

const fetchTree = async (reference: GithubRepositoryReference, treeSha: string) =>
  githubRequest<GithubTreeResponse>(
    `/repos/${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.repo)}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`,
  );

const shouldSkipFile = (entry: GithubTreeEntry) => {
  const path = entry.path;
  const lower = path.toLowerCase();

  const blockedReason = isBlockedPath(path);
  if (blockedReason) {
    return blockedReason;
  }

  if (isLockfile(path) && (entry.size ?? 0) > maxLockfileBytes) {
    return 'Lockfile exceeds the safe review limit';
  }

  if ((entry.size ?? 0) > maxFileBytes) {
    return 'File exceeds the safe review limit';
  }

  if (
    !getSelectionReason(path) &&
    !lower.endsWith('.ts') &&
    !lower.endsWith('.tsx') &&
    !lower.endsWith('.js') &&
    !lower.endsWith('.jsx') &&
    !lower.endsWith('.json') &&
    !lower.endsWith('.yaml') &&
    !lower.endsWith('.yml') &&
    !lower.endsWith('.md') &&
    !lower.endsWith('.prisma') &&
    !lower.endsWith('dockerfile')
  ) {
    return 'Not audit-relevant enough for compact review';
  }

  return null;
};

const buildSelectedFile = async (
  reference: GithubRepositoryReference,
  entry: GithubTreeEntry,
  reason: string,
) => {
  const blob = await githubRequest<GithubBlobResponse>(
    `/repos/${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.repo)}/git/blobs/${encodeURIComponent(entry.sha)}`,
  );

  if (blob.encoding !== 'base64') {
    throw toApiError(
      502,
      'GITHUB_REQUEST_FAILED',
      `GitHub returned an unexpected encoding for ${entry.path}.`,
    );
  }

  const content = safeDecodeContent(blob.content).replace(/\r\n/g, '\n');

  return {
    content:
      content.length > maxBlobTextLength ? content.slice(0, maxBlobTextLength).trimEnd() : content,
    language: getLanguage(entry.path),
    path: entry.path,
    reason,
    sha: entry.sha,
    size: blob.size,
    type: 'file' as const,
  };
};

const sortCandidateFiles = (a: GithubTreeEntry, b: GithubTreeEntry) => {
  const scoreDifference = getSelectionScore(b.path) - getSelectionScore(a.path);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return a.path.localeCompare(b.path);
};

const formatSize = (value: number) => `${Math.round(value / 1024)} KB`;

export const fetchPublicGithubRepository = async (
  repoUrl: string,
): Promise<GithubRepositorySnapshot> => {
  const reference = parseGithubRepositoryUrl(repoUrl);
  const metadata = await fetchRepositoryMetadata(reference);
  const treeSha = await fetchDefaultBranchTreeSha(reference, metadata.defaultBranch);
  const tree = await fetchTree(reference, treeSha);
  const skippedFiles: GithubSkippedFile[] = [];
  const candidates = tree.tree
    .filter((entry): entry is GithubTreeEntry => entry.type === 'blob')
    .map((entry) => ({
      entry,
      reason: getSelectionReason(entry.path),
      score: getSelectionScore(entry.path),
      skipReason: shouldSkipFile(entry),
    }))
    .filter(({ skipReason, score }) => !skipReason && score > 0)
    .sort((left, right) => sortCandidateFiles(left.entry, right.entry));

  const selectedFiles: GithubRepositoryFile[] = [];
  let selectedBytes = 0;

  for (const candidate of candidates) {
    if (selectedFiles.length >= maxSelectedFiles || selectedBytes >= maxTotalSelectedBytes) {
      skippedFiles.push({
        path: candidate.entry.path,
        reason: 'Excluded to keep the review context compact',
        size: candidate.entry.size ?? null,
      });
      continue;
    }

    const reason = candidate.reason ?? 'Audit-relevant source file';
    const file = await buildSelectedFile(reference, candidate.entry, reason);

    if (selectedBytes + file.size > maxTotalSelectedBytes && selectedFiles.length > 0) {
      skippedFiles.push({
        path: candidate.entry.path,
        reason: 'Excluded to keep the review context compact',
        size: candidate.entry.size ?? null,
      });
      continue;
    }

    selectedFiles.push(file);
    selectedBytes += file.size;
  }

  for (const entry of tree.tree) {
    if (entry.type !== 'blob') {
      continue;
    }

    const skipReason = shouldSkipFile(entry);

    if (skipReason) {
      skippedFiles.push({
        path: entry.path,
        reason: skipReason,
        size: entry.size ?? null,
      });
    }
  }

  const uniqueSkippedFiles = Array.from(
    new Map(skippedFiles.map((file) => [`${file.path}:${file.reason}`, file])).values(),
  ).sort((left, right) => left.path.localeCompare(right.path));

  return {
    metadata,
    repoUrl: reference.url,
    selectedFiles,
    skippedFiles: uniqueSkippedFiles,
    totalFilesReviewed: tree.tree.filter((entry) => entry.type === 'blob').length,
    treeTruncated: tree.truncated,
  };
};

export const buildGithubRepositoryContextSection = (snapshot: GithubRepositorySnapshot) => {
  const lines = [
    'GitHub repository context:',
    `- Repository URL: ${snapshot.repoUrl}`,
    `- Full name: ${snapshot.metadata.fullName}`,
    `- Default branch: ${snapshot.metadata.defaultBranch}`,
    `- Visibility: ${snapshot.metadata.visibility ?? 'unknown'}`,
    `- Description: ${snapshot.metadata.description ?? 'Not provided'}`,
    `- Stars: ${snapshot.metadata.stargazersCount}`,
    `- Forks: ${snapshot.metadata.forksCount}`,
    `- Open issues: ${snapshot.metadata.openIssuesCount}`,
    `- License: ${snapshot.metadata.license?.spdxId ?? snapshot.metadata.license?.name ?? 'Unknown'}`,
    `- Primary language: ${snapshot.metadata.language ?? 'Unknown'}`,
    `- Repository size: ${formatSize(snapshot.metadata.size)}`,
    `- Tree truncated: ${snapshot.treeTruncated ? 'yes' : 'no'}`,
    `- Files reviewed: ${snapshot.totalFilesReviewed}`,
    `- Selected files: ${snapshot.selectedFiles.length}`,
  ];

  if (snapshot.selectedFiles.length > 0) {
    lines.push('', 'Selected files:');

    for (const file of snapshot.selectedFiles) {
      lines.push(
        '',
        `File: ${file.path}`,
        `Reason: ${file.reason}`,
        `Size: ${file.size} bytes`,
        'Content:',
        '```',
        file.content,
        '```',
      );
    }
  }

  if (snapshot.skippedFiles.length > 0) {
    lines.push('', 'Skipped files:');

    for (const file of snapshot.skippedFiles.slice(0, 40)) {
      lines.push(`- ${file.path}: ${file.reason}`);
    }
  }

  return lines.join('\n');
};

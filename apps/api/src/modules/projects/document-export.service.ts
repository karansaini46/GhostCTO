import { existsSync } from 'node:fs';

import puppeteer from 'puppeteer';

import { config } from '../../core/config.js';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ApiError } from '../../lib/api-error.js';

const supportedDocumentTypes = new Set([
  'roadmap',
  'ROADMAP',
  'STACK_ADVICE',
  'stack_advisor',
  'TECH_SPEC',
  'technical_spec',
  'DEVELOPER_JD',
  'developer_jd',
  'developer_job_description',
]);

const structuredOutputKeys = [
  'roadmap',
  'stackAdvice',
  'technicalSpec',
  'developerJd',
  'developerJD',
  'developerJobDescription',
  'developer_job_description',
];

const skippedStructuredKeys = new Set([
  'auditReportId',
  'codeAudit',
  'generatedAt',
  'moduleType',
  'quoteAnalysis',
  'quoteAnalysisId',
  'reportMarkdown',
  'request',
  'requestOverrides',
  'usage',
]);

const browserExecutableCandidates = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
];

const documentSelect = {
  completedAt: true,
  content: true,
  createdAt: true,
  id: true,
  metadata: true,
  project: {
    select: {
      budgetRange: true,
      currentStage: true,
      founderTechnicalLevel: true,
      ideaSummary: true,
      industry: true,
      launchTimeline: true,
      mustHaveFeatures: true,
      name: true,
      productType: true,
      targetCustomer: true,
    },
  },
  projectId: true,
  status: true,
  summary: true,
  title: true,
  type: true,
  updatedAt: true,
  version: true,
} satisfies Prisma.GeneratedDocumentSelect;

type ExportDocument = Prisma.GeneratedDocumentGetPayload<{ select: typeof documentSelect }>;
type ExportDocumentWithProject = ExportDocument & {
  project: NonNullable<ExportDocument['project']>;
};

type JsonRecord = Record<string, Prisma.JsonValue>;

type ExportPdfResult = {
  buffer: Buffer;
  filename: string;
};

const isRecord = (value: Prisma.JsonValue | null | undefined): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderInlineMarkdown = (value: string) =>
  escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

const formatLabel = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (first) => first.toUpperCase());

const formatOptionValue = (value: string | null) =>
  value
    ? value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, (first) => first.toUpperCase())
    : 'Not set';

const compactText = (value: string) => value.replace(/\s+/g, ' ').trim();

const toStringArray = (value: Prisma.JsonValue): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const getDocumentTypeLabel = (type: string) => {
  if (type === 'roadmap' || type === 'ROADMAP') {
    return 'Roadmap';
  }

  if (type === 'STACK_ADVICE' || type === 'stack_advisor') {
    return 'Stack Advice';
  }

  if (type === 'TECH_SPEC' || type === 'technical_spec') {
    return 'Technical Spec';
  }

  if (type === 'DEVELOPER_JD' || type === 'developer_jd' || type === 'developer_job_description') {
    return 'Developer JD';
  }

  return formatLabel(type);
};

const sanitizeFilename = (value: string) => {
  const filename = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);

  return filename || 'document';
};

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);

const parseTable = (lines: string[], startIndex: number) => {
  const rows: string[][] = [];
  let index = startIndex;

  while (index < lines.length && /^\s*\|.+\|\s*$/.test(lines[index] ?? '')) {
    const cells = (lines[index] ?? '')
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

    rows.push(cells);
    index += 1;
  }

  if (rows.length < 2 || !rows[1]?.every((cell) => /^:?-{3,}:?$/.test(cell))) {
    return null;
  }

  return {
    html: [
      '<table>',
      '<thead><tr>',
      ...rows[0].map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`),
      '</tr></thead>',
      '<tbody>',
      ...rows
        .slice(2)
        .flatMap((row) => [
          '<tr>',
          ...row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`),
          '</tr>',
        ]),
      '</tbody>',
      '</table>',
    ].join(''),
    nextIndex: index,
  };
};

const renderMarkdown = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  const paragraphLines: string[] = [];
  const codeLines: string[] = [];
  let listType: 'ol' | 'ul' | null = null;
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    html.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
    paragraphLines.length = 0;
  };

  const closeList = () => {
    if (!listType) {
      return;
    }

    html.push(`</${listType}>`);
    listType = null;
  };

  const openList = (type: 'ol' | 'ul') => {
    if (listType === type) {
      return;
    }

    closeList();
    html.push(`<${type}>`);
    listType = type;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushParagraph();
      closeList();

      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines.length = 0;
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }

      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const table = parseTable(lines, index);

    if (table) {
      flushParagraph();
      closeList();
      html.push(table.html);
      index = table.nextIndex - 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);

    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const unorderedItem = /^[-*]\s+(.+)$/.exec(trimmed);

    if (unorderedItem) {
      flushParagraph();
      openList('ul');
      html.push(`<li>${renderInlineMarkdown(unorderedItem[1])}</li>`);
      continue;
    }

    const orderedItem = /^\d+\.\s+(.+)$/.exec(trimmed);

    if (orderedItem) {
      flushParagraph();
      openList('ol');
      html.push(`<li>${renderInlineMarkdown(orderedItem[1])}</li>`);
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph();
  closeList();

  if (inCodeBlock && codeLines.length) {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return html.join('\n');
};

const getStructuredOutput = (metadata: Prisma.JsonValue) => {
  if (!isRecord(metadata)) {
    return null;
  }

  for (const key of structuredOutputKeys) {
    const value = metadata[key];

    if (isRecord(value)) {
      return value;
    }
  }

  return isRecord(metadata) && metadata.reportMarkdown ? metadata : null;
};

const getStructuredItemTitle = (value: JsonRecord, fallback: string) => {
  const titleCandidate =
    value.title ??
    value.name ??
    value.phase ??
    value.category ??
    value.question ??
    value.criterion ??
    value.skill ??
    value.action ??
    value.responsibility ??
    value.feature ??
    value.path;

  return typeof titleCandidate === 'string' && titleCandidate.trim() ? titleCandidate : fallback;
};

const renderPrimitiveValue = (value: Prisma.JsonValue) => {
  if (value === null) {
    return '<p class="muted">Not provided</p>';
  }

  if (typeof value === 'string') {
    return `<p>${renderInlineMarkdown(value)}</p>`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return `<p>${escapeHtml(String(value))}</p>`;
  }

  return '';
};

const renderStructuredValue = (key: string, value: Prisma.JsonValue, depth = 0): string => {
  if (skippedStructuredKeys.has(key)) {
    return '';
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return `
      <section class="structured-section depth-${depth}">
        <h3>${escapeHtml(formatLabel(key))}</h3>
        ${renderPrimitiveValue(value)}
      </section>
    `;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return '';
    }

    if (
      value.every(
        (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
      )
    ) {
      return `
        <section class="structured-section depth-${depth}">
          <h3>${escapeHtml(formatLabel(key))}</h3>
          <ul>
            ${value.map((item) => `<li>${renderInlineMarkdown(String(item))}</li>`).join('')}
          </ul>
        </section>
      `;
    }

    return `
      <section class="structured-section depth-${depth}">
        <h3>${escapeHtml(formatLabel(key))}</h3>
        <div class="structured-list">
          ${value
            .map((item, index) => {
              if (!isRecord(item)) {
                return `<div class="structured-item">${renderPrimitiveValue(item)}</div>`;
              }

              const visibleEntries = Object.entries(item).filter(
                ([itemKey]) => !skippedStructuredKeys.has(itemKey),
              );

              return `
                <article class="structured-item">
                  <h4>${escapeHtml(getStructuredItemTitle(item, `${formatLabel(key)} ${index + 1}`))}</h4>
                  <dl>
                    ${visibleEntries
                      .map(([itemKey, itemValue]) => renderDescriptionEntry(itemKey, itemValue))
                      .join('')}
                  </dl>
                </article>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).filter(
      ([entryKey]) => !skippedStructuredKeys.has(entryKey),
    );

    if (!entries.length) {
      return '';
    }

    return `
      <section class="structured-section depth-${depth}">
        <h3>${escapeHtml(formatLabel(key))}</h3>
        <dl>
          ${entries.map(([entryKey, entryValue]) => renderDescriptionEntry(entryKey, entryValue)).join('')}
        </dl>
      </section>
    `;
  }

  return '';
};

const renderDescriptionEntry = (key: string, value: Prisma.JsonValue): string => {
  if (skippedStructuredKeys.has(key)) {
    return '';
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return '';
    }

    if (
      value.every(
        (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
      )
    ) {
      return `
        <dt>${escapeHtml(formatLabel(key))}</dt>
        <dd>
          <ul>
            ${value.map((item) => `<li>${renderInlineMarkdown(String(item))}</li>`).join('')}
          </ul>
        </dd>
      `;
    }

    return `
      <dt>${escapeHtml(formatLabel(key))}</dt>
      <dd>
        ${value.map((item, index) => renderNestedValue(`${key} ${index + 1}`, item)).join('')}
      </dd>
    `;
  }

  if (isRecord(value)) {
    return `
      <dt>${escapeHtml(formatLabel(key))}</dt>
      <dd>${renderNestedValue(key, value)}</dd>
    `;
  }

  return `
    <dt>${escapeHtml(formatLabel(key))}</dt>
    <dd>${renderPrimitiveValue(value)}</dd>
  `;
};

const renderNestedValue = (key: string, value: Prisma.JsonValue): string => {
  if (isRecord(value)) {
    return `
      <div class="nested-object">
        <h5>${escapeHtml(getStructuredItemTitle(value, formatLabel(key)))}</h5>
        <dl>
          ${Object.entries(value)
            .filter(([entryKey]) => !skippedStructuredKeys.has(entryKey))
            .map(([entryKey, entryValue]) => renderDescriptionEntry(entryKey, entryValue))
            .join('')}
        </dl>
      </div>
    `;
  }

  return renderPrimitiveValue(value);
};

const renderStructuredOutput = (metadata: Prisma.JsonValue) => {
  const structuredOutput = getStructuredOutput(metadata);

  if (!structuredOutput) {
    return '';
  }

  const sections = Object.entries(structuredOutput)
    .filter(([key]) => !skippedStructuredKeys.has(key))
    .map(([key, value]) => renderStructuredValue(key, value))
    .filter(Boolean)
    .join('');

  if (!sections) {
    return '';
  }

  return `
    <section class="report-section">
      <h2>Structured Output</h2>
      ${sections}
    </section>
  `;
};

const renderProjectSummary = (document: ExportDocumentWithProject) => {
  const project = document.project;
  const mustHaveFeatures = toStringArray(project.mustHaveFeatures);

  return `
    <section class="project-summary">
      <h2>Project Summary</h2>
      <dl>
        <dt>Project</dt>
        <dd>${escapeHtml(project.name)}</dd>
        <dt>Idea</dt>
        <dd>${escapeHtml(project.ideaSummary ?? 'Not set')}</dd>
        <dt>Target customer</dt>
        <dd>${escapeHtml(project.targetCustomer ?? 'Not set')}</dd>
        <dt>Industry</dt>
        <dd>${escapeHtml(project.industry ?? 'Not set')}</dd>
        <dt>Stage</dt>
        <dd>${escapeHtml(formatOptionValue(project.currentStage))}</dd>
        <dt>Product type</dt>
        <dd>${escapeHtml(formatOptionValue(project.productType))}</dd>
        <dt>Budget</dt>
        <dd>${escapeHtml(formatOptionValue(project.budgetRange))}</dd>
        <dt>Launch timeline</dt>
        <dd>${escapeHtml(formatOptionValue(project.launchTimeline))}</dd>
        <dt>Founder technical level</dt>
        <dd>${escapeHtml(formatOptionValue(project.founderTechnicalLevel))}</dd>
      </dl>
      ${
        mustHaveFeatures.length
          ? `
            <h3>Launch Scope</h3>
            <ul>
              ${mustHaveFeatures.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
            </ul>
          `
          : ''
      }
    </section>
  `;
};

const buildHtmlDocument = (document: ExportDocumentWithProject, exportedAt: Date) => {
  const documentDate = document.completedAt ?? document.updatedAt ?? document.createdAt;
  const markdownHtml = document.content ? renderMarkdown(document.content) : '';
  const structuredOutputHtml = renderStructuredOutput(document.metadata);

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(document.title)}</title>
        <style>
          @page {
            size: A4;
            margin: 0.72in 0.62in 0.82in;
          }

          * {
            box-sizing: border-box;
          }

          body {
            color: #172033;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            line-height: 1.55;
            margin: 0;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .cover {
            border-bottom: 1px solid #d7deea;
            margin-bottom: 24px;
            padding-bottom: 20px;
          }

          .brand {
            align-items: center;
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
          }

          .brand-mark {
            align-items: center;
            background: #eef5ff;
            border: 1px solid #b9cdf6;
            border-radius: 7px;
            color: #2658b8;
            display: flex;
            font-size: 12px;
            font-weight: 800;
            height: 34px;
            justify-content: center;
            width: 34px;
          }

          .brand-name {
            color: #111827;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0;
          }

          .brand-subtitle {
            color: #697589;
            font-size: 10px;
            margin-top: 1px;
          }

          h1,
          h2,
          h3,
          h4,
          h5 {
            break-after: avoid;
            color: #111827;
            letter-spacing: 0;
            line-height: 1.2;
            margin: 0;
          }

          h1 {
            font-size: 30px;
            margin-bottom: 12px;
          }

          h2 {
            border-bottom: 1px solid #d7deea;
            font-size: 18px;
            margin: 26px 0 12px;
            padding-bottom: 8px;
          }

          h3 {
            font-size: 14px;
            margin: 18px 0 8px;
          }

          h4 {
            font-size: 12px;
            margin-bottom: 8px;
          }

          h5 {
            font-size: 11px;
            margin-bottom: 6px;
          }

          p {
            margin: 0 0 10px;
          }

          ul,
          ol {
            margin: 8px 0 12px 18px;
            padding: 0;
          }

          li {
            margin: 0 0 5px;
          }

          code {
            background: #f3f6fb;
            border: 1px solid #dce4f1;
            border-radius: 4px;
            color: #22304a;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
            font-size: 10.5px;
            padding: 1px 4px;
          }

          pre {
            background: #101827;
            border-radius: 8px;
            color: #e5edf8;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
            font-size: 10px;
            line-height: 1.5;
            margin: 12px 0;
            padding: 12px;
            white-space: pre-wrap;
            word-break: break-word;
          }

          pre code {
            background: transparent;
            border: 0;
            color: inherit;
            padding: 0;
          }

          table {
            border-collapse: collapse;
            margin: 12px 0 16px;
            table-layout: fixed;
            width: 100%;
          }

          th,
          td {
            border: 1px solid #d7deea;
            padding: 7px;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #f3f6fb;
            color: #111827;
            font-weight: 800;
          }

          .meta {
            color: #697589;
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: 18px;
          }

          .meta-item {
            background: #f7f9fc;
            border: 1px solid #dbe3ee;
            border-radius: 8px;
            padding: 10px;
          }

          .meta-label {
            color: #697589;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .meta-value {
            color: #172033;
            font-size: 12px;
            font-weight: 700;
            margin-top: 2px;
          }

          .summary {
            color: #4a5568;
            font-size: 13px;
            line-height: 1.6;
            margin-top: 12px;
            max-width: 92%;
          }

          .project-summary {
            background: #f7f9fc;
            border: 1px solid #dbe3ee;
            border-radius: 10px;
            margin: 20px 0 26px;
            padding: 16px;
          }

          .project-summary h2 {
            border: 0;
            margin-top: 0;
            padding-bottom: 0;
          }

          dl {
            display: grid;
            gap: 7px 12px;
            grid-template-columns: 150px minmax(0, 1fr);
            margin: 0;
          }

          dt {
            color: #697589;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }

          dd {
            margin: 0;
            min-width: 0;
          }

          .report-section {
            margin-top: 24px;
          }

          .markdown-body > :first-child,
          .structured-section > :first-child {
            margin-top: 0;
          }

          .structured-section {
            margin-bottom: 18px;
          }

          .structured-list {
            display: grid;
            gap: 10px;
          }

          .structured-item,
          .nested-object {
            background: #ffffff;
            border: 1px solid #dbe3ee;
            border-radius: 8px;
            padding: 11px;
          }

          .structured-item {
            break-inside: avoid;
          }

          .structured-item dl,
          .nested-object dl {
            grid-template-columns: 120px minmax(0, 1fr);
          }

          .muted {
            color: #697589;
          }
        </style>
      </head>
      <body>
        <header class="cover">
          <div class="brand">
            <div class="brand-mark">GC</div>
            <div>
              <div class="brand-name">GhostCTO</div>
              <div class="brand-subtitle">Founder technical workspace</div>
            </div>
          </div>
          <h1>${escapeHtml(document.title)}</h1>
          ${
            document.summary
              ? `<p class="summary">${escapeHtml(compactText(document.summary))}</p>`
              : ''
          }
          <div class="meta">
            <div class="meta-item">
              <div class="meta-label">Document type</div>
              <div class="meta-value">${escapeHtml(getDocumentTypeLabel(document.type))}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Document date</div>
              <div class="meta-value">${escapeHtml(formatDate(documentDate))}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Version</div>
              <div class="meta-value">v${document.version}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Project</div>
              <div class="meta-value">${escapeHtml(document.project.name)}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Exported</div>
              <div class="meta-value">${escapeHtml(formatDate(exportedAt))}</div>
            </div>
          </div>
        </header>

        ${renderProjectSummary(document)}

        <section class="report-section">
          <h2>Report</h2>
          <div class="markdown-body">
            ${markdownHtml || '<p class="muted">No report content is available.</p>'}
          </div>
        </section>

        ${structuredOutputHtml}
      </body>
    </html>
  `;
};

const renderPdf = async (html: string) => {
  const executablePath =
    config.pdfBrowserExecutablePath ??
    browserExecutableCandidates.find((candidate) => existsSync(candidate));
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMediaType('screen');
    const pdf = await page.pdf({
      displayHeaderFooter: true,
      footerTemplate: `
        <div style="color:#697589;font-family:Inter,Arial,sans-serif;font-size:8px;padding:0 0.62in;text-align:right;width:100%;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      format: 'A4',
      headerTemplate: '<div></div>',
      margin: {
        bottom: '0.82in',
        left: '0.62in',
        right: '0.62in',
        top: '0.72in',
      },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};

const getDocumentForExport = async (
  userId: string,
  projectId: string,
  documentId: string,
): Promise<ExportDocumentWithProject> => {
  const document = await prisma.generatedDocument.findFirst({
    select: documentSelect,
    where: {
      id: documentId,
      projectId,
      userId,
    },
  });

  if (!document) {
    throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
  }

  if (!document.project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  }

  if (!supportedDocumentTypes.has(document.type)) {
    throw new ApiError(
      400,
      'UNSUPPORTED_DOCUMENT_EXPORT',
      'This document type is not supported for PDF export yet.',
    );
  }

  if (document.status !== 'COMPLETED' || !document.content?.trim()) {
    throw new ApiError(409, 'DOCUMENT_NOT_READY', 'This document is not ready for PDF export yet.');
  }

  return document as ExportDocumentWithProject;
};

export const exportProjectDocumentPdfForUser = async (
  userId: string,
  projectId: string,
  documentId: string,
): Promise<ExportPdfResult> => {
  const document = await getDocumentForExport(userId, projectId, documentId);
  const exportedAt = new Date();
  const html = buildHtmlDocument(document, exportedAt);
  const buffer = await renderPdf(html);

  return {
    buffer,
    filename: `${sanitizeFilename(document.project.name)}-${sanitizeFilename(document.title)}-v${document.version}.pdf`,
  };
};

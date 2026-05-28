import { Fragment } from 'react';

import { cn } from '../../lib/cn';

export type MarkdownReportProps = {
  className?: string;
  content: string;
};

const renderInline = (value: string) => {
  const parts = value.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
};

export const MarkdownReport = ({ className, content }: MarkdownReportProps) => {
  const lines = content.split('\n');
  const elements = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      elements.push(
        <pre
          className="my-5 max-h-96 overflow-auto rounded-panel border border-subtle bg-surface-raised p-4 text-sm leading-6 text-text"
          key={`code-${index}`}
        >
          {codeLines.join('\n')}
        </pre>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 className="mt-8 font-editorial text-4xl font-semibold text-text first:mt-0" key={index}>
          {trimmed.slice(2)}
        </h1>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          className="mt-8 border-t border-subtle pt-6 font-editorial text-3xl font-semibold text-text"
          key={index}
        >
          {trimmed.slice(3)}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 className="mt-6 text-lg font-semibold text-text" key={index}>
          {trimmed.slice(4)}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }

      elements.push(
        <ul className="my-4 space-y-2" key={`ul-${index}`}>
          {items.map((item) => (
            <li className="flex gap-3 text-sm leading-7 text-secondary" key={item}>
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }

      elements.push(
        <ol
          className="my-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-secondary"
          key={`ol-${index}`}
        >
          {items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (trimmed.includes('|') && lines[index + 1]?.includes('|')) {
      const rows = [];

      while (index < lines.length && lines[index].includes('|')) {
        const row = lines[index]
          .split('|')
          .map((cell) => cell.trim())
          .filter(Boolean);

        if (!row.every((cell) => /^-+$/.test(cell))) {
          rows.push(row);
        }
        index += 1;
      }

      const [head, ...body] = rows;

      elements.push(
        <div
          className="my-5 overflow-x-auto rounded-panel border border-subtle"
          key={`table-${index}`}
        >
          <table className="min-w-full divide-y divide-subtle text-sm">
            <thead className="bg-surface-raised text-left text-text">
              <tr>
                {head?.map((cell) => (
                  <th className="px-3 py-2 font-semibold" key={cell}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle bg-surface-card text-secondary">
              {body.map((row, rowIndex) => (
                <tr key={`${row.join('-')}-${rowIndex}`}>
                  {row.map((cell) => (
                    <td className="px-3 py-2 align-top" key={cell}>
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    elements.push(
      <p className="my-3 text-sm leading-7 text-secondary" key={index}>
        {renderInline(trimmed)}
      </p>,
    );
    index += 1;
  }

  return <div className={cn('prose max-w-none', className)}>{elements}</div>;
};

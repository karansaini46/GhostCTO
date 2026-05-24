import { Badge } from '../../components/ui';
import type { DemoOutput } from './demo-sample-data';

type DemoOutputPanelProps = {
  output: DemoOutput;
  showMarkdown?: boolean;
};

export const DemoOutputPanel = ({ output, showMarkdown = false }: DemoOutputPanelProps) => (
  <div className="rounded-lg border border-border bg-surface p-5 shadow-panel">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{output.artifactType}</Badge>
          <Badge>{output.title}</Badge>
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-normal text-text">{output.verdict}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{output.summary}</p>
      </div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {output.metrics.map((metric) => (
        <div className="rounded-md border border-border bg-surface-raised p-4" key={metric.label}>
          <p className="text-xs uppercase tracking-normal text-muted">{metric.label}</p>
          <div className="mt-2">
            <Badge variant={metric.tone}>{metric.value}</Badge>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {output.sections.map((section) => (
        <section className="rounded-md border border-border bg-surface-raised p-4" key={section.title}>
          <h3 className="text-sm font-semibold tracking-normal text-text">{section.title}</h3>
          <ul className="mt-3 space-y-2">
            {section.items.map((item) => (
              <li className="text-sm leading-6 text-muted" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>

    {showMarkdown ? (
      <div className="mt-5 rounded-md border border-border bg-background p-4">
        <p className="text-xs uppercase tracking-normal text-muted">Generated document</p>
        <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap text-sm leading-6 text-text">
          {output.markdown}
        </pre>
      </div>
    ) : null}
  </div>
);

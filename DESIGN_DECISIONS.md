# GhostCTO Design Decisions

## Visual Direction

GhostCTO now uses a calm editorial product language: warm paper backgrounds, porcelain surfaces,
linen borders, muted sage accents, graphite text, and soft shadows. The interface is designed to
feel like a technical advisor preparing a founder for a serious vendor conversation.

## Color System

The app uses CSS tokens for background, surface, soft surface, card surface, elevated surface,
primary text, secondary text, muted text, borders, subtle borders, accent, accent soft, success,
warning, danger, clay, and focus. Accent color is intentionally restrained and used for guidance,
active states, and important next actions.

## Typography System

The UI font is Instrument Sans. The editorial/report accent font is Newsreader. Page titles,
report titles, and key marketing statements use the editorial face; controls, forms, navigation,
and dense product areas use the UI face.

## Layout Strategy

Pages use a quieter hierarchy: one dominant action, one supporting explanation, then grouped
details. Reports use document-like spacing, strong section titles, metadata badges, and readable
content blocks. Cards are used for concrete items and tools, not as a repeated page decoration.

## Navigation Strategy

The app shell is organized around the founder journey. Global navigation covers Home, Create
Project, Billing, Settings, and Admin when applicable. Project pages add grouped navigation for
Overview, Plan, Hire, Review, Ask, and Documents.

## UX Hierarchy Decisions

The dashboard prioritizes the recommended next action over metrics. The project room groups tools
into Plan the product, Hire safely, Review the work, and Ask your CTO. Empty, loading, limit, and
error states explain what happened and what to do next in practical language.

## Motion Principles

Motion is handled with lightweight CSS transitions and keyframes. Page entrances, panels, buttons,
drawers, modals, tabs, loading states, and report appearances use subtle easing. Motion is short,
quiet, and disabled for reduced-motion users.

## Founder Support

The redesign avoids developer-console patterns and keeps technical detail progressive. It explains
what each tool is for, when to use it, what output it creates, and how that output helps a founder
brief a developer, compare a quote, or question technical risk.

## Components Created Or Refactored

- Refactored: Button, Input, Textarea, Select, Card, Badge, Tabs, Modal, EmptyState, LoadingState,
  PageHeader, AppShell.
- Added: Surface, SectionHeader, ChoiceCard, Checkbox, Tooltip, Drawer, Accordion, Stepper,
  ErrorState, DocumentSection, ReportCard, VerdictCard, RiskScore, CopyButton, ExportButton,
  MarkdownReport.
- Added dedicated Roadmap and Developer Brief pages using existing project document endpoints.

## Known Follow-Ups

- Add richer structured renderers for each module result when backend metadata is available.
- Add visual regression coverage for report pages at mobile and desktop breakpoints.
- Consider bundling font files later if production policy requires avoiding hosted font delivery.

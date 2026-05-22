import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../../components/ui';
import { ApiError } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useAuth } from '../auth/auth-context';
import { createProjectRequest } from './project-api';
import {
  budgetRangeOptions,
  existingAssetOptions,
  getProjectOptionLabel,
  launchTimelineOptions,
  monetizationOptions,
  productTypeOptions,
  stageOptions,
  technicalLevelOptions,
} from './project-options';
import type { ProjectPayload } from './project-types';

type ProjectDraft = Omit<ProjectPayload, 'mustHaveFeatures'> & {
  mustHaveFeatures: string;
};

type FieldKey = keyof ProjectDraft;

const initialDraft: ProjectDraft = {
  biggestConcern: '',
  budgetRange: '',
  currentStage: '',
  existingAssets: [],
  founderTechnicalLevel: '',
  ideaSummary: '',
  industry: '',
  launchTimeline: '',
  monetization: '',
  mustHaveFeatures: '',
  name: '',
  productType: '',
  targetCustomer: '',
};

const steps: { description: string; fields: FieldKey[]; title: string }[] = [
  {
    description: 'Clarify the venture, buyer, and problem before scope decisions.',
    fields: ['name', 'ideaSummary', 'targetCustomer'],
    title: 'Foundation',
  },
  {
    description: 'Define the market shape and revenue model.',
    fields: ['industry', 'productType', 'monetization'],
    title: 'Market',
  },
  {
    description: 'Set delivery constraints for budget, stage, timeline, and technical comfort.',
    fields: ['currentStage', 'budgetRange', 'launchTimeline', 'founderTechnicalLevel'],
    title: 'Execution',
  },
  {
    description: 'Capture the assets, launch scope, and risk that should guide the first build.',
    fields: ['existingAssets', 'mustHaveFeatures', 'biggestConcern'],
    title: 'Context',
  },
  {
    description: 'Review the project context before creating the workspace record.',
    fields: [],
    title: 'Review',
  },
];

const countWords = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

const parseFeatureLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const hasOption = (options: { value: string }[], value: string): boolean =>
  options.some((option) => option.value === value);

const validateDetailedText = (
  value: string,
  label: string,
  minCharacters: number,
  minWords: number,
) => {
  if (value.trim().length < minCharacters) {
    return `${label} needs more detail.`;
  }

  if (countWords(value) < minWords) {
    return `${label} should be a complete answer, not a short phrase.`;
  }

  return null;
};

const validateDraft = (draft: ProjectDraft, fields: FieldKey[]) => {
  const errors: Partial<Record<FieldKey, string>> = {};

  for (const field of fields) {
    if (field === 'name' && draft.name.trim().length < 3) {
      errors.name = 'Add a working project name.';
    }

    if (field === 'ideaSummary') {
      const error = validateDetailedText(draft.ideaSummary, 'Idea summary', 80, 12);
      if (error) {
        errors.ideaSummary = error;
      }
    }

    if (field === 'targetCustomer') {
      const error = validateDetailedText(draft.targetCustomer, 'Target customer', 60, 10);
      if (error) {
        errors.targetCustomer = error;
      }
    }

    if (field === 'industry' && draft.industry.trim().length < 2) {
      errors.industry = 'Add the closest industry or category.';
    }

    if (field === 'productType' && !hasOption(productTypeOptions, draft.productType)) {
      errors.productType = 'Select a product type.';
    }

    if (field === 'monetization' && !hasOption(monetizationOptions, draft.monetization)) {
      errors.monetization = 'Select the likely revenue model.';
    }

    if (field === 'currentStage' && !hasOption(stageOptions, draft.currentStage)) {
      errors.currentStage = 'Select the current stage.';
    }

    if (field === 'budgetRange' && !hasOption(budgetRangeOptions, draft.budgetRange)) {
      errors.budgetRange = 'Select the realistic budget range.';
    }

    if (field === 'launchTimeline' && !hasOption(launchTimelineOptions, draft.launchTimeline)) {
      errors.launchTimeline = 'Select the desired launch timeline.';
    }

    if (
      field === 'founderTechnicalLevel' &&
      !hasOption(technicalLevelOptions, draft.founderTechnicalLevel)
    ) {
      errors.founderTechnicalLevel = 'Select the founder technical level.';
    }

    if (field === 'existingAssets') {
      if (draft.existingAssets.length === 0) {
        errors.existingAssets = 'Select existing assets, or choose no assets yet.';
      } else if (draft.existingAssets.includes('no_assets') && draft.existingAssets.length > 1) {
        errors.existingAssets = 'Choose either no assets yet or specific assets.';
      }
    }

    if (field === 'mustHaveFeatures') {
      const features = parseFeatureLines(draft.mustHaveFeatures);

      if (features.length < 3) {
        errors.mustHaveFeatures = 'List at least three launch-critical features.';
      } else if (features.some((feature) => feature.length < 12)) {
        errors.mustHaveFeatures = 'Each feature should include enough context to estimate scope.';
      } else if (
        new Set(features.map((feature) => feature.toLowerCase())).size !== features.length
      ) {
        errors.mustHaveFeatures = 'Must-have features should not repeat.';
      }
    }

    if (field === 'biggestConcern') {
      const error = validateDetailedText(draft.biggestConcern, 'Biggest concern', 50, 8);
      if (error) {
        errors.biggestConcern = error;
      }
    }
  }

  return errors;
};

const toPayload = (draft: ProjectDraft): ProjectPayload => ({
  ...draft,
  biggestConcern: draft.biggestConcern.trim(),
  ideaSummary: draft.ideaSummary.trim(),
  industry: draft.industry.trim(),
  mustHaveFeatures: parseFeatureLines(draft.mustHaveFeatures),
  name: draft.name.trim(),
  targetCustomer: draft.targetCustomer.trim(),
});

const getDraftFromStorage = (storageKey: string): ProjectDraft => {
  try {
    const savedDraft = window.localStorage.getItem(storageKey);

    if (!savedDraft) {
      return initialDraft;
    }

    const parsed = JSON.parse(savedDraft) as Partial<ProjectDraft>;

    return {
      ...initialDraft,
      ...parsed,
      existingAssets: Array.isArray(parsed.existingAssets) ? parsed.existingAssets : [],
    };
  } catch {
    return initialDraft;
  }
};

type StepButtonProps = {
  index: number;
  isActive: boolean;
  isComplete: boolean;
  title: string;
};

const StepButton = ({ index, isActive, isComplete, title }: StepButtonProps) => (
  <div
    className={cn(
      'flex min-w-0 items-center gap-3 rounded-md border px-3 py-2',
      isActive
        ? 'border-accent/50 bg-accent/10 text-text'
        : 'border-border bg-surface-raised text-muted',
    )}
  >
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
        isComplete
          ? 'border-success bg-success/15 text-success'
          : isActive
            ? 'border-accent bg-accent/15 text-accent'
            : 'border-border text-muted',
      )}
    >
      {index + 1}
    </span>
    <span className="truncate text-sm font-medium">{title}</span>
  </div>
);

type ReviewRowProps = {
  label: string;
  value: string;
};

const ReviewRow = ({ label, value }: ReviewRowProps) => (
  <div className="rounded-md border border-border bg-surface-raised p-4">
    <p className="text-xs uppercase tracking-normal text-muted">{label}</p>
    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text">{value}</p>
  </div>
);

export const ProjectOnboardingPage = () => {
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const draftStorageKey = user ? `ghostcto.project-onboarding.${user.id}` : null;
  const [draft, setDraft] = useState<ProjectDraft>(initialDraft);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const currentStep = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const allFields = useMemo(() => steps.flatMap((step) => step.fields), []);

  useEffect(() => {
    if (!draftStorageKey) {
      return;
    }

    setDraft(getDraftFromStorage(draftStorageKey));
    setHasLoadedDraft(true);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || !hasLoadedDraft) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setLastSavedAt(new Date());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [draft, draftStorageKey, hasLoadedDraft]);

  const updateField = (field: FieldKey, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleAsset = (value: string) => {
    setDraft((current) => {
      const selected = current.existingAssets.includes(value);

      if (value === 'no_assets') {
        return {
          ...current,
          existingAssets: selected ? [] : ['no_assets'],
        };
      }

      const assets = current.existingAssets.filter((asset) => asset !== 'no_assets');

      return {
        ...current,
        existingAssets: selected
          ? assets.filter((asset) => asset !== value)
          : [...assets, value],
      };
    });
    setFieldErrors((current) => ({ ...current, existingAssets: undefined }));
  };

  const validateCurrentStep = () => {
    const errors = validateDraft(draft, currentStep.fields);
    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    setSubmitError(null);

    if (!validateCurrentStep()) {
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => {
    setSubmitError(null);
    setFieldErrors({});
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const errors = validateDraft(draft, allFields);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstStepWithError = steps.findIndex((step) =>
        step.fields.some((field) => errors[field]),
      );
      setStepIndex(Math.max(firstStepWithError, 0));
      setSubmitError('Complete the highlighted fields before creating the project.');
      return;
    }

    if (!accessToken) {
      setSubmitError('Your session has expired. Please sign in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createProjectRequest(accessToken, toPayload(draft));

      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }

      navigate(`/projects/${response.project.id}`, { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : 'Unable to create the project.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectProps = (field: FieldKey) => ({
    error: fieldErrors[field],
    onChange: (event: ChangeEvent<HTMLSelectElement>) => updateField(field, event.target.value),
    value: draft[field] as string,
  });

  const renderCurrentStep = () => {
    if (stepIndex === 0) {
      return (
        <div className="space-y-5">
          <Input
            error={fieldErrors.name}
            hint="Use a clear working name. You can change it later."
            label="Project name"
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="Example: Vendor trust platform"
            value={draft.name}
          />
          <Textarea
            error={fieldErrors.ideaSummary}
            hint="Explain who it serves, what painful problem it solves, and what outcome the customer should get."
            label="Idea summary"
            onChange={(event) => updateField('ideaSummary', event.target.value)}
            placeholder="Describe the product in practical terms, including the core workflow and expected customer result."
            value={draft.ideaSummary}
          />
          <Textarea
            error={fieldErrors.targetCustomer}
            hint="Name the buyer or user, their context, current workaround, and why this matters now."
            label="Target customer"
            onChange={(event) => updateField('targetCustomer', event.target.value)}
            placeholder="Example: Seed-stage founders who need to compare vendor quotes before committing budget..."
            value={draft.targetCustomer}
          />
        </div>
      );
    }

    if (stepIndex === 1) {
      return (
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            error={fieldErrors.industry}
            hint="Use the category customers or investors would recognize."
            label="Industry"
            onChange={(event) => updateField('industry', event.target.value)}
            placeholder="Example: Healthtech, fintech, B2B operations"
            value={draft.industry}
          />
          <Select label="Product type" placeholder="Select product type" {...selectProps('productType')}>
            {productTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="md:col-span-2">
            <Select
              hint="Pick the model you expect to test first."
              label="Monetization"
              placeholder="Select monetization"
              {...selectProps('monetization')}
            >
              {monetizationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      );
    }

    if (stepIndex === 2) {
      return (
        <div className="grid gap-5 md:grid-cols-2">
          <Select label="Current stage" placeholder="Select stage" {...selectProps('currentStage')}>
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Budget range"
            placeholder="Select budget range"
            {...selectProps('budgetRange')}
          >
            {budgetRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Desired launch timeline"
            placeholder="Select timeline"
            {...selectProps('launchTimeline')}
          >
            {launchTimelineOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            hint="This sets the level of technical detail used in future planning."
            label="Founder technical level"
            placeholder="Select technical level"
            {...selectProps('founderTechnicalLevel')}
          >
            {technicalLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      );
    }

    if (stepIndex === 3) {
      return (
        <div className="space-y-5">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-text">Existing assets</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Select what already exists so recommendations can reuse the strongest work.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {existingAssetOptions.map((option) => (
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md border bg-surface-raised p-3 text-sm transition-colors',
                    draft.existingAssets.includes(option.value)
                      ? 'border-accent/50 text-text'
                      : 'border-border text-muted hover:border-accent/30 hover:text-text',
                  )}
                  key={option.value}
                >
                  <input
                    checked={draft.existingAssets.includes(option.value)}
                    className="h-4 w-4 accent-accent"
                    onChange={() => toggleAsset(option.value)}
                    type="checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {fieldErrors.existingAssets ? (
              <p className="text-sm text-danger">{fieldErrors.existingAssets}</p>
            ) : null}
          </div>
          <Textarea
            error={fieldErrors.mustHaveFeatures}
            hint="Add one feature per line. Include what the user does and the business reason it belongs in the first launch."
            label="Must-have features"
            onChange={(event) => updateField('mustHaveFeatures', event.target.value)}
            placeholder={'Example: Founder uploads a vendor quote and gets a risk summary\nExample: Team compares quote line items against market norms\nExample: Founder exports a negotiation checklist'}
            value={draft.mustHaveFeatures}
          />
          <Textarea
            error={fieldErrors.biggestConcern}
            hint="Describe the risk that could slow the launch, waste budget, or make the product hard to adopt."
            label="Biggest concern"
            onChange={(event) => updateField('biggestConcern', event.target.value)}
            placeholder="Example: I am worried about building too much before I know which workflow customers will pay for..."
            value={draft.biggestConcern}
          />
        </div>
      );
    }

    const payload = toPayload(draft);

    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <ReviewRow label="Project name" value={payload.name || 'Not set'} />
          <ReviewRow label="Industry" value={payload.industry || 'Not set'} />
          <ReviewRow
            label="Product type"
            value={getProjectOptionLabel.productType(payload.productType)}
          />
          <ReviewRow
            label="Monetization"
            value={getProjectOptionLabel.monetization(payload.monetization)}
          />
          <ReviewRow
            label="Current stage"
            value={getProjectOptionLabel.currentStage(payload.currentStage)}
          />
          <ReviewRow
            label="Budget range"
            value={getProjectOptionLabel.budgetRange(payload.budgetRange)}
          />
          <ReviewRow
            label="Launch timeline"
            value={getProjectOptionLabel.launchTimeline(payload.launchTimeline)}
          />
          <ReviewRow
            label="Technical level"
            value={getProjectOptionLabel.founderTechnicalLevel(payload.founderTechnicalLevel)}
          />
        </div>
        <ReviewRow label="Idea summary" value={payload.ideaSummary || 'Not set'} />
        <ReviewRow label="Target customer" value={payload.targetCustomer || 'Not set'} />
        <ReviewRow
          label="Existing assets"
          value={
            payload.existingAssets
              .map((asset) => getProjectOptionLabel.existingAsset(asset))
              .join(', ') || 'Not set'
          }
        />
        <ReviewRow
          label="Must-have features"
          value={payload.mustHaveFeatures.map((feature) => `- ${feature}`).join('\n') || 'Not set'}
        />
        <ReviewRow label="Biggest concern" value={payload.biggestConcern || 'Not set'} />
      </div>
    );
  };

  return (
    <form className="space-y-8" onSubmit={submit}>
      <PageHeader
        description="Capture the facts future planning and execution work depends on."
        eyebrow="Project onboarding"
        title="Create project context"
      />

      <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-text">Progress</p>
              <p className="text-sm text-muted">{progress}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              {lastSavedAt
                ? `Draft saved ${lastSavedAt.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Draft autosaves in this browser'}
            </p>
          </div>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <StepButton
                index={index}
                isActive={index === stepIndex}
                isComplete={index < stepIndex}
                key={step.title}
                title={step.title}
              />
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{currentStep.title}</CardTitle>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>{renderCurrentStep()}</CardContent>
          <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {submitError ? (
                <p className="text-sm leading-6 text-danger">{submitError}</p>
              ) : (
                <p className="text-sm leading-6 text-muted">
                  Step {stepIndex + 1} of {steps.length}
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                disabled={stepIndex === 0 || isSubmitting}
                onClick={goBack}
                type="button"
                variant="secondary"
              >
                Back
              </Button>
              {stepIndex < steps.length - 1 ? (
                <Button onClick={goNext} type="button">
                  Continue
                </Button>
              ) : (
                <Button isLoading={isSubmitting} type="submit">
                  Create project
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
};

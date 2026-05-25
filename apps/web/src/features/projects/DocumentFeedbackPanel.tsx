import { useEffect, useState } from 'react';

import { Button, Select, Textarea } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { submitProjectDocumentFeedbackRequest } from './project-api';
import type {
  ProjectDocument,
  ProjectDocumentFeedback,
  ProjectDocumentFeedbackIssueType,
  ProjectDocumentFeedbackUsefulness,
} from './project-types';

const usefulnessOptions: Array<{
  label: string;
  value: ProjectDocumentFeedbackUsefulness;
}> = [
  { label: 'Useful', value: 'USEFUL' },
  { label: 'Needs work', value: 'NEEDS_WORK' },
  { label: 'Wrong', value: 'WRONG' },
];

const issueTypeOptions: Array<{
  label: string;
  value: ProjectDocumentFeedbackIssueType;
}> = [
  { label: 'Missing project context', value: 'MISSING_CONTEXT' },
  { label: 'Incorrect content', value: 'INCORRECT_CONTENT' },
  { label: 'Too generic', value: 'TOO_GENERIC' },
  { label: 'Missing detail', value: 'MISSING_DETAIL' },
  { label: 'Hard to act on', value: 'HARD_TO_ACT_ON' },
  { label: 'Other', value: 'OTHER' },
];

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Unable to save feedback.';
};

type DocumentFeedbackPanelProps = {
  accessToken: string | null;
  document: ProjectDocument | null;
  onFeedbackSaved?: (feedback: ProjectDocumentFeedback) => void;
  projectId: string;
};

export const DocumentFeedbackPanel = ({
  accessToken,
  document,
  onFeedbackSaved,
  projectId,
}: DocumentFeedbackPanelProps) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [issueType, setIssueType] = useState<ProjectDocumentFeedbackIssueType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [usefulness, setUsefulness] = useState<ProjectDocumentFeedbackUsefulness | null>(null);

  useEffect(() => {
    setComment(document?.feedback?.comment ?? '');
    setError(null);
    setIssueType(document?.feedback?.issueType ?? null);
    setSavedMessage(null);
    setUsefulness(document?.feedback?.usefulness ?? null);
  }, [document?.feedback, document?.id]);

  if (!document || document.status !== 'COMPLETED') {
    return null;
  }

  const handleSave = async () => {
    if (!accessToken || !usefulness) {
      return;
    }

    setError(null);
    setIsSaving(true);
    setSavedMessage(null);

    try {
      const response = await submitProjectDocumentFeedbackRequest(
        accessToken,
        projectId,
        document.id,
        {
          comment: comment.trim() || null,
          issueType: usefulness === 'USEFUL' ? null : issueType,
          usefulness,
        },
      );

      onFeedbackSaved?.(response.feedback);
      setSavedMessage('Feedback saved.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-normal text-text">Feedback</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            How useful was this output for your next decision?
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {usefulnessOptions.map((option) => (
            <Button
              aria-pressed={usefulness === option.value}
              key={option.value}
              onClick={() => {
                setUsefulness(option.value);
                if (option.value === 'USEFUL') {
                  setIssueType(null);
                }
              }}
              size="sm"
              variant={usefulness === option.value ? 'primary' : 'secondary'}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Select
          disabled={usefulness === 'USEFUL' || usefulness === null}
          label="Main issue"
          onChange={(event) =>
            setIssueType(
              event.target.value ? (event.target.value as ProjectDocumentFeedbackIssueType) : null,
            )
          }
          value={issueType ?? ''}
        >
          <option value="">No specific issue</option>
          {issueTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Textarea
          className="min-h-24"
          label="Comment"
          maxLength={2000}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add anything that would make this more useful."
          value={comment}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5">
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {savedMessage ? <p className="text-sm text-success">{savedMessage}</p> : null}
        </div>
        <Button disabled={!usefulness} isLoading={isSaving} onClick={handleSave} size="sm">
          Save feedback
        </Button>
      </div>
    </div>
  );
};

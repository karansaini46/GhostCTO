import { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  Tabs,
  Textarea,
} from '../../components/ui';

export const DashboardPreview = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('brief');

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button variant="secondary">Secondary action</Button>
            <Button>Primary action</Button>
          </>
        }
        description="A serious interface foundation for clear planning, technical direction, and founder review."
        eyebrow="GhostCTO"
        title="Workspace foundation"
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Form controls</CardTitle>
            <CardDescription>
              Inputs share spacing, focus, helper text, and validation states.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input hint="Used for concise values." label="Text input" placeholder="Enter a value" />
            <Select defaultValue="" label="Select input" placeholder="Choose an option">
              <option value="strategy">Strategy</option>
              <option value="delivery">Delivery</option>
              <option value="review">Review</option>
            </Select>
            <Textarea
              className="md:col-span-2"
              hint="Used for longer founder notes."
              label="Textarea"
              placeholder="Capture the important context."
            />
            <Input
              error="This field needs a valid value."
              label="Error state"
              placeholder="Validation state"
            />
          </CardContent>
          <CardFooter>
            <Button variant="ghost">Cancel</Button>
            <Button>Save</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System states</CardTitle>
            <CardDescription>Badges and buttons use the shared status tokens.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge variant="accent">Accent</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button isLoading>Loading</Button>
            </div>
            <Button className="w-full" onClick={() => setModalOpen(true)} variant="secondary">
              Open modal
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>Controlled tabs for dense product surfaces.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              items={[
                {
                  content:
                    'A brief view keeps the active decision, owner, and next step close together without visual noise.',
                  label: 'Brief',
                  value: 'brief',
                },
                {
                  content:
                    'A detail view supports deeper review while keeping the same token-backed structure.',
                  label: 'Detail',
                  value: 'detail',
                },
              ]}
              onValueChange={setActiveTab}
              value={activeTab}
            />
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <EmptyState
            description="This space is reserved for product content once workflows are defined."
            title="Ready for the first workflow"
          />
          <LoadingState label="Preparing workspace" />
        </div>
      </div>

      <Modal
        description="Modal structure for focused confirmation and short-form review."
        footer={
          <>
            <Button onClick={() => setModalOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Confirm</Button>
          </>
        }
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        title="Review action"
      >
        <p className="text-sm leading-6 text-muted">
          The modal uses the same surface, border, text, and focus treatment as the rest of the
          interface foundation.
        </p>
      </Modal>
    </div>
  );
};

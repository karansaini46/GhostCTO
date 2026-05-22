export const productTypeOptions = [
  { label: 'Software subscription', value: 'saas' },
  { label: 'Marketplace', value: 'marketplace' },
  { label: 'Consumer app', value: 'consumer_app' },
  { label: 'Internal tool', value: 'internal_tool' },
  { label: 'Commerce', value: 'commerce' },
  { label: 'Community', value: 'community' },
  { label: 'Content product', value: 'content' },
  { label: 'Service-led product', value: 'services' },
  { label: 'Hardware-enabled product', value: 'hardware_enabled' },
];

export const monetizationOptions = [
  { label: 'Subscription', value: 'subscription' },
  { label: 'Transaction fee', value: 'transaction_fee' },
  { label: 'One-time purchase', value: 'one_time_purchase' },
  { label: 'Services or implementation', value: 'services' },
  { label: 'Freemium upgrade', value: 'freemium' },
  { label: 'Licensing', value: 'licensing' },
  { label: 'Not decided yet', value: 'not_decided' },
];

export const stageOptions = [
  { label: 'Idea only', value: 'idea' },
  { label: 'Customer validation', value: 'validating' },
  { label: 'Prototype', value: 'prototype' },
  { label: 'MVP in progress', value: 'mvp' },
  { label: 'Private beta', value: 'beta' },
  { label: 'Launched', value: 'launched' },
  { label: 'Scaling', value: 'scaling' },
];

export const budgetRangeOptions = [
  { label: 'Under $5,000', value: 'under_5000' },
  { label: '$5,000 to $15,000', value: '5000_15000' },
  { label: '$15,000 to $50,000', value: '15000_50000' },
  { label: '$50,000 to $100,000', value: '50000_100000' },
  { label: 'Over $100,000', value: 'over_100000' },
  { label: 'Not set yet', value: 'not_set' },
];

export const launchTimelineOptions = [
  { label: 'Within 4 weeks', value: 'within_4_weeks' },
  { label: '4 to 8 weeks', value: '4_to_8_weeks' },
  { label: '8 to 12 weeks', value: '8_to_12_weeks' },
  { label: '3 to 6 months', value: '3_to_6_months' },
  { label: 'More than 6 months', value: 'more_than_6_months' },
  { label: 'Flexible', value: 'flexible' },
];

export const technicalLevelOptions = [
  { label: 'Non-technical founder', value: 'non_technical' },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Technical founder', value: 'technical' },
];

export const existingAssetOptions = [
  { label: 'Customer interviews', value: 'customer_interviews' },
  { label: 'Waitlist or leads', value: 'waitlist' },
  { label: 'Landing page', value: 'landing_page' },
  { label: 'Designs or wireframes', value: 'designs' },
  { label: 'Prototype', value: 'prototype' },
  { label: 'Domain', value: 'domain' },
  { label: 'Brand assets', value: 'brand_assets' },
  { label: 'Usage or market data', value: 'analytics' },
  { label: 'No assets yet', value: 'no_assets' },
];

const getLabel = (options: { label: string; value: string }[], value: string | null) =>
  options.find((option) => option.value === value)?.label ?? value ?? 'Not set';

export const getProjectOptionLabel = {
  budgetRange: (value: string | null) => getLabel(budgetRangeOptions, value),
  currentStage: (value: string | null) => getLabel(stageOptions, value),
  existingAsset: (value: string) => getLabel(existingAssetOptions, value),
  founderTechnicalLevel: (value: string | null) => getLabel(technicalLevelOptions, value),
  launchTimeline: (value: string | null) => getLabel(launchTimelineOptions, value),
  monetization: (value: string | null) => getLabel(monetizationOptions, value),
  productType: (value: string | null) => getLabel(productTypeOptions, value),
};

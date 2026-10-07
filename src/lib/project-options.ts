export const SERVICE_PACKAGES = [
  'Local SEO',
  'SEO',
  'Geographic SEO',
  'Website Development',
  'Website Maintenance',
  'Website Performance Optimization',
  'Website Redesign',
  'Mobile Enhancement',
  'Web Page Content Audit',
  'Web Development + SEO',
  'Web Redesign + SEO',
] as const;

export const SERVICE_BUNDLES = [
  'Website Redesign + Local SEO',
  'Website Development + SEO',
  'Mobile Enhancement + SEO',
  'Local SEO + Geographic SEO',
] as const;

export const BUNDLE_SERVICES: Record<(typeof SERVICE_BUNDLES)[number], readonly (typeof SERVICE_PACKAGES)[number][]> = {
  'Website Redesign + Local SEO': ['Website Redesign', 'Local SEO'],
  'Website Development + SEO': ['Website Development', 'SEO'],
  'Mobile Enhancement + SEO': ['Mobile Enhancement', 'SEO'],
  'Local SEO + Geographic SEO': ['Local SEO', 'Geographic SEO'],
};

export const SERVICE_OR_BUNDLE = [...SERVICE_PACKAGES, ...SERVICE_BUNDLES] as const;

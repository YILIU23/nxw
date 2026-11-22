import type { SiteConfig } from './types';

export const policeFilingDefaults = {
  policeFilingEnabled: false,
  policeFilingText: '',
  policeFilingHref: '',
  policeFilingNewTab: true,
};

// Old JSONB documents remain intact; fill the new fields when reading either version.
export function withSiteDefaults(site: SiteConfig): SiteConfig {
  return { ...site, footer: { ...policeFilingDefaults, ...site.footer } };
}

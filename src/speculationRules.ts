import type { SpeculationRules } from 'mochi-framework';

/**
 * Every mutation is a POST and speculation only issues GETs from <a href>, so no rule here can
 * trigger a side effect. Prerender stays conservative because it runs serverProps for real, and each
 * page render costs calls to the shared upstream API.
 */
export const speculationRules: SpeculationRules = {
  prefetch: [
    {
      where: {
        and: [
          { href_matches: '/*' },
          { not: { href_matches: '/_*' } },
          { not: { selector_matches: '[target=_blank]' } },
          { not: { selector_matches: '[rel~=nofollow]' } },
        ],
      },
      eagerness: 'moderate',
    },
  ],
  prerender: [
    {
      where: {
        and: [
          {
            or: [
              { href_matches: '/' },
              { href_matches: '/article/*' },
              { href_matches: '/profile/*' },
            ],
          },
          { not: { selector_matches: '[target=_blank]' } },
          { not: { selector_matches: '[rel~=nofollow]' } },
        ],
      },
      eagerness: 'conservative',
    },
  ],
};

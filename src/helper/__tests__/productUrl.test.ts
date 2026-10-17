import { describe, expect, it } from 'vitest';
import { resolveWooProductUrl } from '../productUrl';

const SITE = 'https://kickrooz.com';
const SLUG = 'nhl-edmonton-oilers-personalize-home-mix-away-kits-hoodie';
const PRETTY = `${SITE}/product/${SLUG}/`;
const PLAIN = 'https://kickrooz.com/?post_type=product&p=80831';

describe('resolveWooProductUrl', () => {
  it('keeps a real pretty permalink from the API', () => {
    expect(resolveWooProductUrl({ permalink: PRETTY, slug: SLUG }, SITE)).toBe(PRETTY);
  });

  it('rebuilds from the API slug when the permalink is the plain form', () => {
    expect(resolveWooProductUrl({ permalink: PLAIN, slug: SLUG }, SITE)).toBe(PRETTY);
  });

  it('prefers a pretty `link` field when permalink is plain', () => {
    expect(resolveWooProductUrl({ permalink: PLAIN, link: PRETTY, slug: SLUG }, SITE)).toBe(PRETTY);
  });

  it('normalizes a trailing slash on the site URL', () => {
    expect(resolveWooProductUrl({ permalink: PLAIN, slug: SLUG }, `${SITE}/`)).toBe(PRETTY);
  });

  it('falls back to the plain permalink when no slug is available', () => {
    expect(resolveWooProductUrl({ permalink: PLAIN }, SITE)).toBe(PLAIN);
  });

  it('rebuilds from slug when the permalink is empty', () => {
    expect(resolveWooProductUrl({ permalink: '', slug: SLUG }, SITE)).toBe(PRETTY);
  });

  it('returns null when there is nothing usable', () => {
    expect(resolveWooProductUrl(null, SITE)).toBeNull();
    expect(resolveWooProductUrl({}, SITE)).toBeNull();
    expect(resolveWooProductUrl({ permalink: PLAIN, slug: SLUG }, null)).toBe(PLAIN);
  });

  it('does not treat a pretty URL with query params as plain', () => {
    const withQuery = `${PRETTY}?utm_source=youtube`;
    expect(resolveWooProductUrl({ permalink: withQuery, slug: SLUG }, SITE)).toBe(withQuery);
  });
});

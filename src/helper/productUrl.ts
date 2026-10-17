const NON_PRETTY_PERMALINK = /[?&](?:post_type=product&p=\d+|p=\d+)/;

interface WooProductUrlFields {
  permalink?: unknown;
  link?: unknown;
  slug?: unknown;
}

/**
 * Resolves the public URL of a WooCommerce product.
 *
 * Prefers the API's `permalink` / `link` when it is a real (pretty) URL. The
 * WooCommerce REST API returns a plain `?post_type=product&p=ID` permalink for
 * products that are not published yet (e.g. products uploaded by the pipeline
 * with `status: "future"`), so in that case the canonical URL is rebuilt from
 * the API-provided `slug` under the site's `/product/` base.
 */
export function resolveWooProductUrl(
  product: WooProductUrlFields | null | undefined,
  siteUrl?: string | null,
): string | null {
  const preferred = firstPrettyUrl(product);
  if (preferred) return preferred;

  const base = typeof siteUrl === 'string' ? siteUrl.trim().replace(/\/+$/, '') : '';
  const slug = typeof product?.slug === 'string' ? product.slug.trim() : '';
  if (base && slug) return `${base}/product/${slug}/`;

  return firstNonEmptyUrl(product);
}

function firstPrettyUrl(product: WooProductUrlFields | null | undefined): string | null {
  for (const candidate of [product?.permalink, product?.link]) {
    if (typeof candidate === 'string') {
      const url = candidate.trim();
      if (url && !NON_PRETTY_PERMALINK.test(url)) return url;
    }
  }
  return null;
}

function firstNonEmptyUrl(product: WooProductUrlFields | null | undefined): string | null {
  for (const candidate of [product?.permalink, product?.link]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

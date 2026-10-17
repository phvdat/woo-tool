export const COMPILATION_SIZE = 5;

export interface CompilationProductInput {
  id: number | string;
  name: string;
  permalink?: string;
  slug?: string;
  images?: { src?: string }[];
}

export function buildCompilationBatchKey(ids: Array<number | string>): string {
  return ids.map(String).sort().join('-');
}

/**
 * Picks the first `size` products that carry at least one image, preserving the
 * incoming (newest-first) order. Products without an image can never contribute
 * a scene, so they are skipped rather than silently dropped to a shorter video.
 */
export function selectCompilationProducts<T extends CompilationProductInput>(
  products: T[],
  size = COMPILATION_SIZE
): T[] {
  return products.filter((p) => Boolean(p.images?.[0]?.src)).slice(0, size);
}

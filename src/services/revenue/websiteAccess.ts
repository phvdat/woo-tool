import { connectToDatabase } from "@/lib/mongodb";
import { WEBSITES_COLLECTION } from "@/constant/collections";

/**
 * The Website permission rule: a user may access a website they own, or one
 * they are listed as a member of. This mirrors the query used by
 * `GET /api/woo/website-config`.
 *
 * The email is lowercased to match how `members` is persisted (see
 * `UpdateWebsiteListModal`). Keep this in sync with that rule rather than
 * hand-rolling a variant.
 */
export function buildWebsiteAccessFilter(userEmail: string) {
  const email = userEmail.toLowerCase();

  return {
    $or: [{ owner: email }, { members: email }],
  };
}

/**
 * Stringified `websites._id` values the user owns or is a member of.
 *
 * Resolved from the `websites` collection at read time, so Revenue History
 * stays independent of permissions and never has to store a member list.
 */
export async function getAccessibleWebsiteIds(
  userEmail: string
): Promise<string[]> {
  const { db } = await connectToDatabase();

  const websites = await db
    .collection(WEBSITES_COLLECTION)
    .find(buildWebsiteAccessFilter(userEmail))
    .project({ _id: 1 })
    .toArray();

  return websites.map((website: any) => website._id.toString());
}

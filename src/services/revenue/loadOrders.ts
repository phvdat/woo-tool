import axios from "axios";
import { connectToDatabase } from "@/lib/mongodb";
import { WEBSITES_COLLECTION } from "@/constant/collections";
import { WooWebsitePayload } from "@/types/woo";
import { ObjectId } from "mongodb";
import { buildWebsiteAccessFilter } from "./websiteAccess";

interface LoadOrdersParams {
  websiteId?: string;
  /**
   * Restrict the fetch to websites this user owns or is a member of, so a
   * Refresh can never sync a website the user has no access to.
   * Omit it to fetch every configured website (used by the revenue cron).
   */
  userEmail?: string;
  /**
   * Optional lower/upper date bounds. Omit both to fetch the website's full
   * order history, which is what the revenue sync does.
   */
  from?: string;
  to?: string;
}

export async function loadOrders({
  websiteId,
  userEmail,
  from,
  to,
}: LoadOrdersParams) {
  const { db } = await connectToDatabase();

  const filter: any = {};

  if (userEmail) {
    Object.assign(filter, buildWebsiteAccessFilter(userEmail));
  }

  if (websiteId && websiteId !== "all") {
    filter._id = new ObjectId(websiteId);
  }

  const websites: WooWebsitePayload[] = await db
    .collection(WEBSITES_COLLECTION)
    .find(filter)
    .toArray() as any;
  const orders: any[] = [];

  for (const website of websites) {
    try {
      const woo = axios.create({
        baseURL: `${website.url}/wp-json/wc/v3`,
        auth: {
          username: website.wpUsername,
          password: website.wpAppPassword,
        },
        timeout: 60_000,
      });

      let page = 1;

      while (true) {
        const { data } = await woo.get("/orders", {
          params: {
            ...(from ? { after: from } : {}),
            ...(to ? { before: to } : {}),
            per_page: 100,
            page,
            orderby: "date",
            order: "asc",
          },
        });

        if (!data.length) break;

        orders.push(
          ...data.map((order: any) => ({
            ...order,
            websiteId: website._id,
            ownerEmail: website.owner || "",
            websiteName: website.shopName,
            websiteUrl: website.url,
          }))
        );
        if (data.length < 100) break;
        page++;
      }
    } catch (err: any) {
      console.error(`Failed to fetch orders from ${website.shopName} (${website.url}):`, err.message);
    }
  }

  return orders;
}
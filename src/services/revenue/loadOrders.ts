import axios from "axios";
import { connectToDatabase } from "@/lib/mongodb";
import { WEBSITES_COLLECTION } from "@/constant/collections";
import { WooWebsitePayload } from "@/types/woo";
import { ObjectId } from "mongodb";

interface LoadOrdersParams {
  websiteId?: string;
  userEmail: string;
  from: string;
  to: string;
}

export async function loadOrders({
  websiteId,
  userEmail,
  from,
  to,
}: LoadOrdersParams) {
  const { db } = await connectToDatabase();

  const filter: any = {
    $or: [
      { members: userEmail },
      { owner: userEmail },
    ],
  };

  if (websiteId && websiteId !== "all") {
    filter._id = new ObjectId(websiteId);
  }

  const websites: WooWebsitePayload[] = await db
    .collection(WEBSITES_COLLECTION)
    .find(filter)
    .toArray() as any;
  const orders: any[] = [];

  for (const website of websites) {
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
          after: from,
          before: to,
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
          websiteName: website.shopName,
          websiteUrl: website.url,
        }))
      );
      if (data.length < 100) break;
      page++;
    }
  }

  return orders;
}
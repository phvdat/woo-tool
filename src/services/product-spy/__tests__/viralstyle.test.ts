import { describe, expect, it } from "vitest";
import { mapViralstyleCampaign } from "../viralstyle";

describe("mapViralstyleCampaign", () => {
  it("maps marketplace campaign fields to a spy product", () => {
    const product = mapViralstyleCampaign(
      {
        campaign_id: 96997,
        name: "  LIFE BEGINS AT FORTY-TWO  ",
        uri: "/tees8/begins42",
        campaign_slug: "begins42",
        selling_price: 23.45,
        default_side: "BACK",
        front_image: "https://cdn.example.com/front.png",
        back_image: "https://cdn.example.com/back.png",
        front_thumb_image: "https://cdn.example.com/front-thumb.png",
        back_thumb_image: "https://cdn.example.com/back-thumb.png",
      },
      "https://viralstyle.com",
    );

    expect(product).toMatchObject({
      externalId: "96997",
      title: "LIFE BEGINS AT FORTY-TWO",
      url: "https://viralstyle.com/tees8/begins42",
      slug: "begins42",
      price: "23.45",
      image: "https://cdn.example.com/back-thumb.png",
      source: "viralstyle",
    });
    expect(product?.images).toEqual([
      "https://cdn.example.com/front.png",
      "https://cdn.example.com/back.png",
      "https://cdn.example.com/front-thumb.png",
      "https://cdn.example.com/back-thumb.png",
    ]);
  });

  it("falls back to creator and campaign slugs", () => {
    const product = mapViralstyleCampaign(
      {
        campaign_id: "42",
        name: "Fallback",
        creator_slug: "creator",
        campaign_slug: "slug",
      },
      "https://viralstyle.com/",
    );

    expect(product?.url).toBe("https://viralstyle.com/creator/slug");
  });

  it("rejects campaigns without an id, title, or URL", () => {
    expect(
      mapViralstyleCampaign({ name: "No ID", uri: "/a/b" }, "https://viralstyle.com"),
    ).toBeNull();
    expect(
      mapViralstyleCampaign({ campaign_id: 1, uri: "/a/b" }, "https://viralstyle.com"),
    ).toBeNull();
    expect(
      mapViralstyleCampaign({ campaign_id: 1, name: "No URL" }, "https://viralstyle.com"),
    ).toBeNull();
  });
});

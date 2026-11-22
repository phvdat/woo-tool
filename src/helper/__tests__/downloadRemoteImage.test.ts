import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import {
  downloadRemoteImage,
  RemoteImageDownloadError,
  REMOTE_IMAGE_USER_AGENT,
  sourceReferer,
} from "../downloadRemoteImage";

vi.mock("axios", () => {
  const get = vi.fn();
  return {
    default: {
      get,
      isAxiosError: (error: unknown) =>
        Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
    },
  };
});

const get = vi.mocked(axios.get);
const IMAGE_URL =
  "https://jezsport.com/wp-content/uploads/2026/11/CHAU-2DTshirt-13701-scaled.webp";

function httpError(status: number) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  });
}

beforeEach(() => {
  get.mockReset();
});

describe("downloadRemoteImage", () => {
  it("uses a current Chrome user agent and the image origin as referer", async () => {
    get.mockResolvedValue({
      data: Buffer.from("image"),
      status: 200,
    } as never);

    const result = await downloadRemoteImage(IMAGE_URL);

    expect(result.buffer.toString()).toBe("image");
    expect(result.attempts).toBe(1);
    expect(get).toHaveBeenCalledTimes(1);

    const config = get.mock.calls[0][1]!;
    expect(config.headers!["User-Agent"]).toBe(REMOTE_IMAGE_USER_AGENT);
    expect(config.headers!.Referer).toBe("https://jezsport.com/");
  });

  it("does not retry an explicit 403 denial", async () => {
    get.mockRejectedValue(httpError(403));

    const error = await downloadRemoteImage(IMAGE_URL, {
      retryDelayMs: 0,
    }).catch((caught) => caught);

    expect(get).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(RemoteImageDownloadError);
    expect(error).toMatchObject({
      url: IMAGE_URL,
      status: 403,
      attempts: 1,
      forbidden: true,
    });
  });

  it("retries transient failures and succeeds", async () => {
    get
      .mockRejectedValueOnce(httpError(500))
      .mockRejectedValueOnce(httpError(502))
      .mockResolvedValue({
        data: Buffer.from("image"),
        status: 200,
      } as never);

    const result = await downloadRemoteImage(IMAGE_URL, {
      retryDelayMs: 0,
    });

    expect(get).toHaveBeenCalledTimes(3);
    expect(result.attempts).toBe(3);
  });

  it("stops at maxAttempts for persistent transient failures", async () => {
    get.mockRejectedValue(httpError(503));

    const error = await downloadRemoteImage(IMAGE_URL, {
      maxAttempts: 2,
      retryDelayMs: 0,
    }).catch((caught) => caught);

    expect(get).toHaveBeenCalledTimes(2);
    expect(error).toMatchObject({
      status: 503,
      attempts: 2,
      forbidden: false,
    });
  });

  it("does not retry other permanent HTTP failures", async () => {
    get.mockRejectedValue(httpError(404));

    const error = await downloadRemoteImage(IMAGE_URL, {
      retryDelayMs: 0,
    }).catch((caught) => caught);

    expect(get).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ status: 404, attempts: 1 });
  });

  it("retries network errors without an HTTP status", async () => {
    get
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValue({
        data: Buffer.from("image"),
        status: 200,
      } as never);

    const result = await downloadRemoteImage(IMAGE_URL, {
      retryDelayMs: 0,
    });

    expect(get).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(2);
  });

  it("derives a referer only from a valid absolute URL", () => {
    expect(sourceReferer(IMAGE_URL)).toBe("https://jezsport.com/");
    expect(sourceReferer("not a url")).toBeUndefined();
  });
});

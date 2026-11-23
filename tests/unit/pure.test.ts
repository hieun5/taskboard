import { describe, expect, it } from "vitest";
import { signPayload, verifySignedPayload } from "@/lib/auth/crypto";
import { cleanFileName, fileTypeFor, formatBytes, opensInline } from "@/lib/files";
import { initials, timeAgo } from "@/lib/format";
import { topicInputSchema } from "@/lib/validation";

describe("signed payloads", () => {
  it("round-trips and rejects tampering", () => {
    const signed = signPayload('{"a":1}', "secret");
    expect(verifySignedPayload(signed, "secret")).toBe('{"a":1}');
    expect(verifySignedPayload(signed, "other")).toBeNull();
    const [body, mac] = signed.split(".");
    expect(verifySignedPayload(`${body}x.${mac}`, "secret")).toBeNull();
    expect(verifySignedPayload("garbage", "secret")).toBeNull();
  });
});

describe("files", () => {
  it("allows only listed types", () => {
    expect(fileTypeFor("Quote.PDF")?.mime).toBe("application/pdf");
    expect(fileTypeFor("photo.jpeg")?.kind).toBe("image");
    expect(fileTypeFor("page.html")).toBeNull();
    expect(fileTypeFor("drawing.svg")).toBeNull();
    expect(fileTypeFor("noext")).toBeNull();
  });
  it("only shows images and PDFs inline", () => {
    expect(opensInline("application/pdf")).toBe(true);
    expect(opensInline("image/png")).toBe(true);
    expect(opensInline("image/heic")).toBe(false);
    expect(opensInline("text/plain")).toBe(false);
  });
  it("cleans file names", () => {
    expect(cleanFileName("../../etc/passwd")).toBe("passwd");
    expect(cleanFileName('C:\\Users\\me\\a"b.pdf')).toBe("ab.pdf");
    expect(cleanFileName("")).toBe("file");
  });
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});

describe("format", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  it("describes elapsed time", () => {
    expect(timeAgo(new Date("2026-11-17T11:59:30Z"), now)).toBe("just now");
    expect(timeAgo(new Date("2026-11-17T10:00:00Z"), now)).toBe("2 hours ago");
    expect(timeAgo(new Date("2026-11-16T10:00:00Z"), now)).toBe("yesterday");
    expect(timeAgo(new Date("2026-11-03T10:00:00Z"), now)).toBe("2 weeks ago");
  });
  it("makes initials", () => {
    expect(initials("Hieu")).toBe("H");
    expect(initials("Uncle Bao Tran")).toBe("UT");
  });
});

describe("topic validation", () => {
  it("requires title, task and goal and trims them", () => {
    const ok = topicInputSchema.safeParse({ title: "  Hi ", task: "t", goal: "g", bodyMd: "" });
    expect(ok.success && ok.data.title).toBe("Hi");
    expect(topicInputSchema.safeParse({ title: " ", task: "t", goal: "g", bodyMd: "" }).success).toBe(false);
    expect(topicInputSchema.safeParse({ title: "x".repeat(141), task: "t", goal: "g", bodyMd: "" }).success).toBe(false);
    expect(topicInputSchema.safeParse({ title: "x", task: "t", goal: "g", bodyMd: "", status: "wrapped_up" }).success).toBe(false);
  });
});

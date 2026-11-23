import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getDownloadable, removeAttachment, startUpload } from "@/lib/data/attachments";
import { inviteMember } from "@/lib/data/members";
import { addEntry, deleteEntry, listEntries, updateEntry } from "@/lib/data/progress";
import { createTopic, deleteTopic, getTopic, listTopics, setTopicStatus, updateTopic } from "@/lib/data/topics";
import { markRead } from "@/lib/data/reads";
import { AppError } from "@/lib/errors";
import { localPathFor } from "@/lib/storage";
import { makeUser, topicInput, uploadFile } from "./helpers";

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (err) {
    if (err instanceof AppError) return err.code;
    throw err;
  }
};

describe("topics", () => {
  it("only the author can edit, change status or delete a topic", async () => {
    const author = await makeUser("Author");
    const other = await makeUser("Other");
    const id = await createTopic(author, topicInput());

    expect(await code(updateTopic(other, id, topicInput({ title: "Hijacked" })))).toBe("forbidden");
    expect(await code(setTopicStatus(other, id, "done"))).toBe("forbidden");
    expect(await code(deleteTopic(other, id))).toBe("forbidden");
    expect((await getTopic(id)).title).toBe("Fix the garage door");

    await updateTopic(author, id, topicInput({ title: "Fixed title" }));
    await setTopicStatus(author, id, "done");
    const topic = await getTopic(id);
    expect(topic.title).toBe("Fixed title");
    expect(topic.status).toBe("done");
  });

  it("validates input on the server", async () => {
    const author = await makeUser();
    expect(await code(createTopic(author, topicInput({ title: "   " })))).toBe("invalid");
    expect(await code(createTopic(author, topicInput({ goal: "x".repeat(501) })))).toBe("invalid");
    expect(await code(setTopicStatus(author, await createTopic(author, topicInput()), "bogus"))).toBe("invalid");
  });

  it("searches and filters the board, and tracks what's new", async () => {
    const a = await makeUser("A");
    const b = await makeUser("B");
    const t1 = await createTopic(a, topicInput({ title: "Plant tomatoes zebra", status: "active" }));
    await createTopic(a, topicInput({ title: "Clean gutters zebra", status: "done" }));

    const found = await listTopics(b, { q: "zebra" });
    expect(found.map((t) => t.title).sort()).toEqual(["Clean gutters zebra", "Plant tomatoes zebra"]);
    expect((await listTopics(b, { q: "zebra", status: "active" })).map((t) => t.id)).toEqual([t1]);
    expect(await listTopics(b, { q: "100%_" })).toEqual([]);

    // New to B until B reads it; never "new" to its author.
    expect(found.every((t) => t.unread)).toBe(true);
    expect((await listTopics(a, { q: "zebra" })).some((t) => t.unread)).toBe(false);
    await markRead(b.id, t1);
    expect((await listTopics(b, { q: "tomatoes" }))[0].unread).toBe(false);

    // A's progress makes it new to B again, with counts on the board.
    await addEntry(a, t1, { bodyMd: "Planted six" });
    const [row] = await listTopics(b, { q: "tomatoes" });
    expect(row.unread).toBe(true);
    expect(row.updates).toBe(1);
  });
});

describe("progress entries", () => {
  it("anyone can add progress; only its author can change it", async () => {
    const owner = await makeUser("Owner");
    const helper = await makeUser("Helper");
    const topicId = await createTopic(owner, topicInput());
    const { id } = await addEntry(helper, topicId, { bodyMd: "Did the first half" });

    expect(await code(updateEntry(owner, id, { bodyMd: "edited by owner" }))).toBe("forbidden");
    expect(await code(deleteEntry(owner, id))).toBe("forbidden");
    await updateEntry(helper, id, { bodyMd: "Did the first half (edited)" });
    expect((await listEntries(topicId))[0].bodyMd).toBe("Did the first half (edited)");

    expect(await code(addEntry(helper, topicId, { bodyMd: "  " }))).toBe("invalid");
    expect(await code(addEntry(helper, "00000000-0000-4000-8000-000000000000", { bodyMd: "x" }))).toBe("not_found");

    await deleteEntry(helper, id);
    expect(await listEntries(topicId)).toHaveLength(0);
  });
});

describe("attachments", () => {
  it("rejects unsupported and oversized files", async () => {
    const user = await makeUser();
    expect(await code(startUpload(user, { fileName: "evil.html", size: 10 }))).toBe("invalid");
    expect(await code(startUpload(user, { fileName: "big.pdf", size: 26 * 1024 * 1024 }))).toBe("invalid");
    expect(await code(startUpload(user, { fileName: "empty.pdf", size: 0 }))).toBe("invalid");
  });

  it("can't attach someone else's upload", async () => {
    const a = await makeUser("A");
    const b = await makeUser("B");
    const { id } = await uploadFile(a);
    expect(await code(createTopic(b, topicInput(), [id]))).toBe("invalid");
    // Unattached uploads are private to their uploader.
    expect(await code(getDownloadable(b, id))).toBe("not_found");
    expect(await code(getDownloadable(a, id))).toBe("ok");
  });

  it("attached files are readable by members; only the post's author can remove them", async () => {
    const author = await makeUser("Author");
    const reader = await makeUser("Reader");
    const { id } = await uploadFile(author, "plan.pdf");
    const topicId = await createTopic(author, topicInput(), [id]);
    expect((await getTopic(topicId)).attachments.map((f) => f.id)).toEqual([id]);
    expect(await code(getDownloadable(reader, id))).toBe("ok");
    expect(await code(removeAttachment(reader, id))).toBe("forbidden");
    await removeAttachment(author, id);
    expect((await getTopic(topicId)).attachments).toHaveLength(0);
  });

  it("deleting a topic removes its progress and files from storage", async () => {
    const author = await makeUser("Author");
    const helper = await makeUser("Helper");
    const topicFile = await uploadFile(author, "a.pdf");
    const topicId = await createTopic(author, topicInput(), [topicFile.id]);
    const entryFile = await uploadFile(helper, "b.png", "png-bytes");
    await addEntry(helper, topicId, { bodyMd: "" }, [entryFile.id]);
    expect(existsSync(localPathFor(topicFile.key))).toBe(true);
    expect(existsSync(localPathFor(entryFile.key))).toBe(true);

    await deleteTopic(author, topicId);
    expect(await code(getTopic(topicId))).toBe("not_found");
    expect(existsSync(localPathFor(topicFile.key))).toBe(false);
    expect(existsSync(localPathFor(entryFile.key))).toBe(false);
  });
});

describe("invites", () => {
  it("only admins can invite", async () => {
    const member = await makeUser("Member");
    expect(await code(inviteMember(member, "someone@test.local"))).toBe("forbidden");
    const admin = await makeUser("Admin", { isAdmin: true });
    expect(await code(inviteMember(admin, "not-an-email"))).toBe("invalid");
    expect(await inviteMember(admin, "Someone@Test.local")).toEqual({ email: "someone@test.local", alreadyMember: false });
  });
});

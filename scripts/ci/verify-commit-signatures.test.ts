/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import {
  resolvePullRequestShas,
  resolvePushShas,
  verifyCommitSignatures,
  type CommitVerificationPayload,
} from "./verify-commit-signatures.js";

function verified(sha: string): CommitVerificationPayload {
  return { sha, verified: true, reason: "valid" };
}

describe("verifyCommitSignatures", () => {
  it("passes when all commits are verified", async () => {
    const fetchVerification = vi.fn(async (sha: string) => verified(sha));
    const result = await verifyCommitSignatures({
      shas: ["aaa", "bbb"],
      fetchVerification,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.checked).toHaveLength(2);
    }
    expect(fetchVerification).toHaveBeenCalledTimes(2);
  });

  it("fails when one commit is unverified", async () => {
    const fetchVerification = vi.fn(async (sha: string) => {
      if (sha === "bbb") {
        return { sha, verified: false, reason: "unsigned" };
      }
      return verified(sha);
    });
    const result = await verifyCommitSignatures({
      shas: ["aaa", "bbb", "ccc"],
      fetchVerification,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures).toEqual([{ sha: "bbb", reason: "unsigned" }]);
    }
  });

  it("fails closed on API failure", async () => {
    const fetchVerification = vi.fn(async () => {
      throw new Error("HTTP 502");
    });
    const result = await verifyCommitSignatures({
      shas: ["aaa"],
      fetchVerification,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/API failure/i);
      expect(result.failures[0]?.reason).toMatch(/api_failure/i);
    }
  });

  it("fails on empty commit range", async () => {
    const result = await verifyCommitSignatures({
      shas: [],
      fetchVerification: vi.fn(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/empty commit range/i);
    }
  });

  it("deduplicates duplicate SHAs", async () => {
    const fetchVerification = vi.fn(async (sha: string) => verified(sha));
    const result = await verifyCommitSignatures({
      shas: ["AAA", "aaa", "bbb"],
      fetchVerification,
    });
    expect(result.ok).toBe(true);
    expect(fetchVerification).toHaveBeenCalledTimes(2);
  });

  it("accepts a verified merge commit", async () => {
    const mergeSha = "deadbeefmerge01";
    const result = await verifyCommitSignatures({
      shas: [mergeSha],
      fetchVerification: async () => ({
        sha: mergeSha,
        verified: true,
        reason: "valid",
      }),
    });
    expect(result.ok).toBe(true);
  });

  it("fails on malformed verification payload", async () => {
    const result = await verifyCommitSignatures({
      shas: ["aaa"],
      fetchVerification: async () =>
        ({
          sha: "aaa",
          reason: "valid",
        }) as CommitVerificationPayload,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures[0]?.reason).toBe("malformed_verification_payload");
    }
  });
});

describe("resolve commit ranges", () => {
  it("lists pull request commits via base..head", () => {
    const shas = resolvePullRequestShas({
      baseSha: "base",
      headSha: "head",
      listCommits: () => ["c1", "c2", "c2"],
    });
    expect(shas).toEqual(["c1", "c2"]);
  });

  it("lists push commits for a normal update range", () => {
    const shas = resolvePushShas({
      beforeSha: "before",
      afterSha: "after",
      created: false,
      listCommits: (range: string) => {
        expect(range).toBe("before..after");
        return ["m1", "m2"];
      },
    });
    expect(shas).toEqual(["m1", "m2"]);
  });

  it("handles branch creation with zero before SHA", () => {
    const shas = resolvePushShas({
      beforeSha: "0000000000000000000000000000000000000000",
      afterSha: "after",
      created: true,
      listCommits: (range: string) => {
        expect(range).toBe("after");
        return ["after"];
      },
    });
    expect(shas).toEqual(["after"]);
  });
});

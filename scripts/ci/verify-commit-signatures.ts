#!/usr/bin/env node
/**
 * Verifies GitHub commit signature status for a commit range or explicit SHAs.
 *
 * Fail-closed: missing verification payloads, API errors, and unverified
 * commits all fail the check. Author names and Signed-off-by trailers are
 * never treated as cryptographic verification.
 */
import { spawnSync } from "node:child_process";

export type CommitVerificationPayload = {
  sha: string;
  verified: boolean;
  reason: string;
};

export type FetchCommitVerification = (
  sha: string,
) => Promise<CommitVerificationPayload>;

export type VerifyCommitSignaturesInput = {
  shas: string[];
  fetchVerification: FetchCommitVerification;
};

export type VerifyCommitSignaturesResult =
  | { ok: true; checked: CommitVerificationPayload[] }
  | {
      ok: false;
      checked: CommitVerificationPayload[];
      failures: Array<{ sha: string; reason: string }>;
      error?: string;
    };

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const sha = value.trim().toLowerCase();
    if (!sha || seen.has(sha)) {
      continue;
    }
    seen.add(sha);
    result.push(sha);
  }
  return result;
}

export async function verifyCommitSignatures(
  input: VerifyCommitSignaturesInput,
): Promise<VerifyCommitSignaturesResult> {
  const shas = uniquePreserveOrder(input.shas);
  if (shas.length === 0) {
    return {
      ok: false,
      checked: [],
      failures: [],
      error: "empty commit range: no SHAs to verify",
    };
  }

  const checked: CommitVerificationPayload[] = [];
  const failures: Array<{ sha: string; reason: string }> = [];

  for (const sha of shas) {
    let payload: CommitVerificationPayload;
    try {
      payload = await input.fetchVerification(sha);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        checked,
        failures: [{ sha, reason: `api_failure: ${message}` }],
        error: `API failure while verifying ${sha}: ${message}`,
      };
    }

    if (!payload || typeof payload.verified !== "boolean") {
      return {
        ok: false,
        checked,
        failures: [{ sha, reason: "malformed_verification_payload" }],
        error: `Malformed verification payload for ${sha}`,
      };
    }

    const normalized: CommitVerificationPayload = {
      sha: payload.sha || sha,
      verified: payload.verified,
      reason: payload.reason || "unspecified",
    };
    checked.push(normalized);

    if (!normalized.verified) {
      failures.push({
        sha: normalized.sha,
        reason: normalized.reason,
      });
    }
  }

  if (failures.length > 0) {
    return { ok: false, checked, failures };
  }

  return { ok: true, checked };
}

export function resolvePullRequestShas(params: {
  baseSha: string;
  headSha: string;
  listCommits: (baseSha: string, headSha: string) => string[];
}): string[] {
  return uniquePreserveOrder(params.listCommits(params.baseSha, params.headSha));
}

export function resolvePushShas(params: {
  beforeSha: string | null | undefined;
  afterSha: string;
  created: boolean;
  listCommits: (range: string) => string[];
}): string[] {
  const after = params.afterSha.trim();
  if (!after || /^0+$/.test(after)) {
    return [];
  }

  const before = (params.beforeSha ?? "").trim();
  if (!before || /^0+$/.test(before) || params.created) {
    return uniquePreserveOrder(params.listCommits(after));
  }

  return uniquePreserveOrder(params.listCommits(`${before}..${after}`));
}

type GitHubCommitResponse = {
  sha?: string;
  commit?: {
    verification?: {
      verified?: boolean;
      reason?: string;
    };
  };
};

function gitStdout(args: string[]): string {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr || result.stdout || result.status}`,
    );
  }
  return result.stdout;
}

function parseArgs(argv: string[]): {
  mode: "pr" | "push" | "shas";
  owner: string;
  repo: string;
  base?: string;
  head?: string;
  before?: string;
  after?: string;
  created?: boolean;
  shas: string[];
} {
  const args = [...argv];
  const mode = (args.shift() ?? "shas") as "pr" | "push" | "shas";
  const out = {
    mode,
    owner: "",
    repo: "",
    shas: [] as string[],
  } as ReturnType<typeof parseArgs>;

  while (args.length > 0) {
    const flag = args.shift()!;
    const value = args.shift();
    if (!value) {
      throw new Error(`Missing value for ${flag}`);
    }
    switch (flag) {
      case "--owner":
        out.owner = value;
        break;
      case "--repo":
        out.repo = value;
        break;
      case "--base":
        out.base = value;
        break;
      case "--head":
        out.head = value;
        break;
      case "--before":
        out.before = value;
        break;
      case "--after":
        out.after = value;
        break;
      case "--created":
        out.created = value === "true";
        break;
      case "--sha":
        out.shas.push(value);
        break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
  }

  if (!out.owner || !out.repo) {
    throw new Error("--owner and --repo are required");
  }
  return out;
}

async function createGitHubFetcher(
  owner: string,
  repo: string,
): Promise<FetchCommitVerification> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN (or GH_TOKEN) is required for commit verification");
  }

  return async (sha: string): Promise<CommitVerificationPayload> => {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "uxds-commit-signature-verifier",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for commit ${sha}`);
    }

    const body = (await response.json()) as GitHubCommitResponse;
    const verification = body.commit?.verification;
    if (
      !body.sha ||
      !verification ||
      typeof verification.verified !== "boolean" ||
      typeof verification.reason !== "string"
    ) {
      throw new Error(`Malformed verification payload for ${sha}`);
    }

    return {
      sha: body.sha,
      verified: verification.verified,
      reason: verification.reason,
    };
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  let shas: string[] = [];

  if (parsed.mode === "pr") {
    if (!parsed.base || !parsed.head) {
      throw new Error("pr mode requires --base and --head");
    }
    shas = resolvePullRequestShas({
      baseSha: parsed.base,
      headSha: parsed.head,
      listCommits: (base, head) =>
        gitStdout(["rev-list", "--reverse", `${base}..${head}`])
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
    });
  } else if (parsed.mode === "push") {
    if (!parsed.after) {
      throw new Error("push mode requires --after");
    }
    shas = resolvePushShas({
      beforeSha: parsed.before,
      afterSha: parsed.after,
      created: Boolean(parsed.created),
      listCommits: (range) => {
        if (!range.includes("..")) {
          return [range];
        }
        return gitStdout(["rev-list", "--reverse", range])
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      },
    });
  } else {
    shas = parsed.shas;
  }

  const fetchVerification = await createGitHubFetcher(parsed.owner, parsed.repo);
  const result = await verifyCommitSignatures({ shas, fetchVerification });

  for (const item of result.checked) {
    console.log(
      `${item.verified ? "VERIFIED" : "UNVERIFIED"} ${item.sha} (${item.reason})`,
    );
  }

  if (!result.ok) {
    for (const failure of result.failures) {
      console.error(`FAIL ${failure.sha}: ${failure.reason}`);
    }
    if (result.error) {
      console.error(result.error);
    }
    process.exit(1);
  }

  console.log(`OK: verified ${result.checked.length} commit(s)`);
}

const entry = process.argv[1] ?? "";
const isDirectRun =
  /verify-commit-signatures\.ts$/.test(entry) &&
  !/verify-commit-signatures\.test\.ts$/.test(entry);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

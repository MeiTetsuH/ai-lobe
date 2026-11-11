/// <reference types="node" />

/**
 * File-size gate for hooks and CI: `size-gate.ts --staged` (pre-commit, base
 * `HEAD`) or `size-gate.ts --base <ref>` (CI, base = merge base with `<ref>`).
 *
 * Unlike `bun run check`, it only inspects the host repo's own files: a
 * mounted sub-repo commits through its own hook and runs its own CI. Rules
 * live in `fileSize.ts` and `.agents/skills/source-layout/SKILL.md` §3.
 */
import { git, run } from './exec';
import { checkFileSizes } from './fileSize';
import { rootDir, setConfig } from './paths';
import type { CheckConfig } from './types';

const USAGE = 'Usage: size-gate.ts --staged | --base <ref>';

/**
 * During an upstream merge commit (`MERGE_HEAD` present), keep only staged
 * paths that also differ from `MERGE_HEAD` so untouched upstream files are not
 * rejected against the pre-merge `HEAD`.
 */
export const filterMergeCommitFiles = (stagedFiles: string[], mergeDiffFiles?: string[]) => {
  if (!mergeDiffFiles) return stagedFiles;
  const modifiedFromMergeParent = new Set(mergeDiffFiles);
  return stagedFiles.filter((file) => modifiedFromMergeParent.has(file));
};

export const runSizeGate = async (config: CheckConfig) => {
  const args = process.argv.slice(2);
  const staged = args.includes('--staged');
  const baseArg = args.indexOf('--base');
  const baseRef = staged ? 'HEAD' : baseArg === -1 ? undefined : args[baseArg + 1];
  const host = config.repos.find((repo) => repo.dir === '');
  if (!baseRef || !host) {
    console.error(USAGE);
    process.exit(2);
  }

  setConfig({ ...config, repos: [{ ...host, baseRef }] });

  const isMerge =
    staged &&
    (await run('git', ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], rootDir())).code === 0;
  const candidateFiles = staged
    ? await git(['diff', '--cached', '--name-only', '--diff-filter=d'])
    : await git(['diff', '--name-only', '--diff-filter=d', `${baseRef}...HEAD`]);
  const files = isMerge
    ? filterMergeCommitFiles(
        candidateFiles,
        await git(['diff', '--cached', '--name-only', '--diff-filter=d', 'MERGE_HEAD']),
      )
    : candidateFiles;
  const { advisories, errors } = await checkFileSizes(files);

  // GitHub Actions turns these lines into annotations on the PR diff.
  const annotate = process.env.GITHUB_ACTIONS === 'true';
  for (const message of advisories)
    console.log(annotate ? `::warning::${message}` : `⚠ ${message}`);
  for (const message of errors) console.log(annotate ? `::error::${message}` : `✗ ${message}`);

  if (errors.length > 0) process.exit(1);
  console.log(`✓ file size: ${files.length} changed files within limits`);
};

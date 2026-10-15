# Fork maintenance

This fork follows stable upstream release tags. This document records maintenance policy and local patches; it does not certify that a release has been deployed or accepted.

## Keep configuration outside the fork

- Prefer supported Vercel environment variables over changes to upstream defaults, model catalogs, UI, or provider adapters.
- Configure file embeddings with `DEFAULT_FILES_CONFIG`, background agents with `SYSTEM_AGENT`, and memory extraction, embeddings, and persona generation with the applicable `MEMORY_USER_MEMORY_*` variables.
- Keep model IDs, provider IDs, endpoint URLs, dimensions, and credentials consistent across each configuration. Changing a chat default does not change every background agent.
- Store credentials only in the deployment's secret configuration. Never commit values, environment exports, private account details, or production conversation data.
- Preserve upstream applications and routing surfaces. Reduce installation and function-tracing scope instead of deleting applications merely to shorten builds.
- Keep necessary source patches small, independently testable, and separate from deployment configuration. Reevaluate every patch at each stable tag.

## Patch ledger

Paths below are repository-relative. Tests are targeted checks, not substitutes for production acceptance.

| Patch                                              | Reason and removal condition                                                                                                                                                                                                                                                                 | Targeted verification                                                                                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile SPA build ordering                          | Build mobile assets before copying SPA output. Remove when the selected upstream tag builds and copies the same mobile assets correctly.                                                                                                                                                     | `scripts/buildConfiguration.test.ts`; `scripts/copySpaBuild.test.ts`                                                                                                           |
| Frozen, filtered pnpm installation and UI override | Keep a tracked lockfile, a pinned package-manager version, the required workspace dependency closure, and the shared `@lobehub/ui` override. Drop individual overrides when upstream resolves the same dependency graph reproducibly; retain reproducible installation as deployment policy. | Frozen install with the filters in `vercel.json`; inspect lockfile and `pnpm-workspace.yaml` changes.                                                                          |
| Vercel function tracing                            | Exclude published SPA assets and build output from function bundles without excluding runtime templates or server source. Remove exclusions when upstream tracing provides equivalent bundles.                                                                                               | `scripts/vercelConfiguration.test.ts`; inspect deployment function output and real asset requests.                                                                             |
| Search indexing disabled                           | Set `X-Robots-Tag: noindex, nofollow` in deployment and application headers. Replace the patch when upstream exposes an equivalent supported configuration. This is indexing policy, not access control.                                                                                     | `scripts/vercelConfiguration.test.ts`; read actual production response headers.                                                                                                |
| OpenAI default provider and Terra RAG model        | Preserve the fork's provider/model defaults while preferring environment configuration for new settings. Remove hard-coded defaults when upstream configuration covers the same chat and RAG behavior.                                                                                       | `apps/server/src/globalConfig/getServerGlobalConfig.test.ts`; `apps/server/src/routers/lambda/config/index.test.ts`; `apps/server/src/routers/async/__tests__/ragEval.test.ts` |
| RAG Responses stream consumption                   | Consume the model runtime stream rather than parse a Responses-backed result as a Chat Completions JSON body; keep empty/error results as failures. Remove when upstream handles the same protocol and error cases.                                                                          | `apps/server/src/routers/async/__tests__/ragEval.test.ts`                                                                                                                      |
| Memory provider credential precedence              | Explicit system credentials stay on their configured provider; that provider's user credentials retain precedence, and ordinary fallback remains available without explicit system credentials. Remove when upstream passes these same cases.                                                | `apps/server/src/services/memory/userMemory/__tests__/extract.runtime.test.ts`                                                                                                 |
| CommonJS Docker launcher                           | Name the source `startServer.cjs` to match its module format; preserve the Docker destination `/app/startServer.js`. Use noncapturing IP regex groups. Remove the rename or regex delta when upstream supplies an equivalent lint-clean launcher.                                            | `scripts/serverLauncher/startServer.test.ts`; targeted ESLint and `node --check scripts/serverLauncher/startServer.cjs`                                                        |

## Stable-tag upgrade procedure

1. Record the current production commit, previous upstream tag, target stable tag, and deployment configuration revision. Preserve unrelated working-tree changes and create a recoverable Git reference before merging.
2. Compare all three change sets: the previous tag to current fork, the previous tag to target tag, and the target tag to the proposed fork. Review both upstream changes and retained patches; a clean merge is not proof of compatibility.
3. Check the ledger against upstream behavior. Delete absorbed or obsolete patches instead of carrying them forward automatically. Keep a regression test where it protects an intended fork behavior.
4. Resolve dependency changes using pnpm and the tracked lockfile. Review the complete workspace dependency closure before narrowing installation filters; retain all required web, mobile, auth, share, and workbench dependencies.
5. Run the repository quality command for affected files, owning-package tests, and required type/build checks. Run normal commit hooks; repair failures rather than bypassing hooks or suppressing rules.
6. Review migrations and configuration compatibility before deployment. Do not assume an old application can safely run against a changed schema.
7. Deploy only after the required checks pass. Verify the provider's build and migration result, the promoted commit, and the actual production domain separately.
8. Verify real login, text chat, upload/retrieval, search, memory, mobile assets, and sharing where affected. Confirm indexing headers and the intended model/provider route without exposing secrets or private messages. Record evidence and unresolved limitations.
9. Update this ledger with the final retained patches and their removal conditions. Report deployment and acceptance as complete only after their respective evidence exists.

## Embeddings and rollback

- Before changing an embedding model or dimensions, inventory existing vectors and preserve a recoverable backup of the original vectors and their model configuration, even when the knowledge base appears unused.
- Do not mix vectors from incompatible models. Reindex into a recoverable replacement and validate retrieval before retiring the original index or backup.
- Keep deployment code and environment rollback coordinated. A code rollback alone does not restore model IDs, credentials, endpoints, or dimensions.
- Preserve the prior environment revision securely; record names and intended relationships in release notes, never secret values.
- Restore a matching code/configuration/vector combination. Review database migrations independently and avoid destructive reverse migrations as a routine rollback step.
- After rollback, verify production routing, login, chat, retrieval, and memory again; a successful promotion alone is insufficient.

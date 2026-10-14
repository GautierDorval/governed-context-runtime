# Maintaining the reference package

Every published file is listed in `package-policy.json`, receives exactly one licence from its rules, and is recorded with its digest in `rights.json` and `package-manifest.json`. `npm test` checks that state as it is and never repairs it.

## After a reviewed content edit

1. Edit the source file, for example a guide under `docs/`.
2. Run `npm run regenerate`. It recomputes only `rights.json` and `package-manifest.json`.
3. Review the diff, then run `npm test`.

`npm run regenerate:check` performs the same computation in memory and reports stale registries without writing anything. Regeneration records digests; it does not certify the author or the relevance of a change, which remain subject to review.

## Policy changes

These changes are refused by the generator until `package-policy.json` is edited in the same pull request, with an explanation:

- adding, removing or renaming a file (`inventory`);
- changing a licence class or rule (`licences`);
- changing `NOTICE.md`, `CITATION.cff` or a licence text (`declarationDigests`).

The checker keeps the official licence texts and the licence split pinned independently of the policy.

## Development dependencies

`npm test` and `npm run demo` use Node.js only. `npm run test:dev` also needs the development dependencies locked in `package-lock.json`: install them with `npm ci --ignore-scripts`. They stay in `node_modules/`, outside the package, and nothing from them is needed at run time. `package.json` declares exact versions, and the checker refuses runtime dependencies, install lifecycle scripts and lockfile entries that are not development packages from the npm registry. Review the licences of the locked packages whenever the lockfile changes.

## Dependabot updates

Dependabot proposes weekly updates of the pinned Actions and of the development dependencies. Such a pull request changes `.github/workflows/verify.yml`, or `package.json` and `package-lock.json`, and therefore fails the `verify` check until its metadata is regenerated. This is intended: an update is never accepted without review.

1. Read the release notes of the proposed version. For an Action, check that the pin is a full commit SHA; for an npm package, check that the version stays exact and review the licences of new locked packages.
2. Check out the pull request branch, run `npm ci --ignore-scripts`, then `npm run regenerate`.
3. Commit the regenerated `rights.json` and `package-manifest.json` to the same branch and push.
4. Merge only after `verify` passes.

Dependabot cannot perform step 2 itself, and no workflow with write access does it automatically.

## Verifier path tests and mutations

`test/` exercises verifier paths that the synthetic example alone does not reach: the historical text profile `utf8-nfc-lf-trimmed-v0`, indexed selectors and graph construction. Expected bytes and graph nodes are written out by hand from the recipe; they are never computed by the function under test.

`scripts/test-mutations.mjs` applies controlled mutations to a temporary copy of `spec/reference/verification.mjs` and requires each one to make these tests fail. When a reviewed change to the verifier moves or rewrites a mutated line, the harness stops with "mutation target must occur exactly once": update the mutation list in the same pull request rather than deleting the case.

## Interrupted regeneration

`npm run regenerate` writes through a `.regenerate/` working directory and keeps a backup of the previous registries until both are replaced. If it is interrupted, `npm test` and the generator refuse the intermediate state. Run `npm run regenerate:recover` to restore the last consistent registries, then `npm run regenerate` again.

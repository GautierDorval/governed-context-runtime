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

## Dependabot updates of GitHub Actions

Dependabot proposes weekly updates of the pinned Actions. Such a pull request changes `.github/workflows/verify.yml` and therefore fails the `verify` check until its metadata is regenerated. This is intended: an Action update is never accepted without review.

1. Read the release notes of the proposed Action version and check that the pin is a full commit SHA.
2. Check out the pull request branch, run `npm ci` if development dependencies are present, then `npm run regenerate`.
3. Commit the regenerated `rights.json` and `package-manifest.json` to the same branch and push.
4. Merge only after `verify` passes.

Dependabot cannot perform step 2 itself, and no workflow with write access does it automatically.

## Interrupted regeneration

`npm run regenerate` writes through a `.regenerate/` working directory and keeps a backup of the previous registries until both are replaced. If it is interrupted, `npm test` and the generator refuse the intermediate state. Run `npm run regenerate:recover` to restore the last consistent registries, then `npm run regenerate` again.

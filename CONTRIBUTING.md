# Contributing

Use fictional inputs. Run `npm test` and `npm run demo` with Node.js 24.17.0 or newer. Preserve paired FR/EN meanings, explicit negations, historical byte recipes and closed profiles. Do not import private datasets, secrets or raw model conversations.

Public CI has read-only repository permissions and no private export or deployment step. Contributions cannot publish a production corpus or confer deployment authority. A changed generated file must match its source and rights record. Report security concerns through [SECURITY.md](SECURITY.md).

By submitting a contribution, you agree that it is licensed under the same terms as the material it changes: Apache-2.0 for code and configuration, CC BY 4.0 for documentation (see [NOTICE.md](NOTICE.md)). Participation follows the [code of conduct](CODE_OF_CONDUCT.md). Use the issue forms for reference defects and documentation; pull requests follow the template checklist.

After a reviewed edit, run `npm run regenerate`, review the diff and run `npm test`; adding a file, changing a licence rule or editing `NOTICE.md`, `CITATION.cff` or a licence text is a policy change made in `package-policy.json`. The full procedure, including Dependabot updates of GitHub Actions, is in [MAINTAINING.md](MAINTAINING.md).

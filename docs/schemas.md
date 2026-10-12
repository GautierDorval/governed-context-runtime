# Local schema resolution

The four JSON Schema files under `spec/` are included in this package. Their `$id` values identify schemas; they are not promises of a live download endpoint. Resolve them locally by exact mapping:

| Identifier suffix after `/spec/governed-context-runtime/` | Local file |
|---|---|
| `context-pack.schema.json` | [spec/context-pack.schema.json](../spec/context-pack.schema.json) |
| `context-pack-manifest.schema.json` | [spec/context-pack-manifest.schema.json](../spec/context-pack-manifest.schema.json) |
| `intent-registry.schema.json` | [spec/intent-registry.schema.json](../spec/intent-registry.schema.json) |
| `runtime-snapshot.schema.json` | [spec/runtime-snapshot.schema.json](../spec/runtime-snapshot.schema.json) |

The repository base is `https://github.com/GautierDorval/governed-context-runtime`. `docs/source.json.publicSpecRepositoryPath` is the full locator of the already-published compatible schema edition. The historical runtime declaration’s `spec/governed-context-runtime/` is a source-layout identifier; resolve the four listed identifiers with the explicit mapping above, not by appending that path to the public repository. Relative links resolve from each containing document in GitHub or a clone. Website links should use that absolute base and the intended published revision. No private checkout is needed. The fixture is fictional and follows the existing instance schema, including its closed intent tokens and historical `generatedBy` token. That token does not name this fixture’s generator; the bundle states its actual fictional provenance.

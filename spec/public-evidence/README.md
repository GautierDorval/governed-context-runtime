# Public evidence projection (proposed)

This is a narrow synthetic qualification profile, not permission to export private observations. The producer must verify the pinned Data directory with its own verifier before projecting any table. The public verifier independently checks the projected representation and its identity. It cannot authenticate a withheld private archive, its completeness, or a deployment.

The publication identity is SHA-256 of the portable canonical JSON of the content except `publicationId`. It excludes signature envelopes, verification time, destination Git commits, and private provenance. It is distinct from the runtime corpus root. A separate verification event computes age against a supplied UTC clock. Content bytes do not change merely because a reader checks them later.

The initial policy admits one synthetic runtime population, one count metric, daily UTC half-open windows, and no aggregation. Other tables have explicit withholding dispositions. A larger profile needs a versioned policy and privacy review; unknown fields never inherit permission. A suppressed family remains withheld rather than measured zero or unavailable.

See the private implementation dossier for upstream verification and the generated public package for executable examples. Local tests establish neither publication nor model use.

A withheld metric has status `withheld`; its source metric status is not exposed. Suppression is refused when the public report status is `measured_zero`, since that report already discloses zero. Report states remain public and may reveal measurement availability or bounds; no statistical privacy guarantee follows. Suppression history covers retained immutable editions only; deleting those editions is outside this local store's contract.

The corpus root is a declared document-context identifier, not an authenticated relationship to measured activity. The policy digest commits to a private export policy (including its private input pins); its preimage is not included and cannot be reconstructed by a public reader. Public verification checks the projection's own content identity, not that private policy. Publication events, rights approval and replacement metadata for real releases remain outside this synthetic profile.

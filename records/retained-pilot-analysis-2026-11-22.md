# Retained pilot: descriptive analysis, November 22, 2026

## Scope and evidence

This is a new **offline, read-only analysis** of campaign `gcr-pilot-20261107`, not a new campaign, judge pass or arbitration. The dated private archive inventory contains 3,582 objects. This analysis verifies 3,575 consumed immutable objects: 12 campaign/input records, 560 respondent attempts, 1,120 respondent journal records, 1,120 judge attempts and 763 accepted annotations. The two final mutable objects, three technical preflights and two run-level journal records are outside this new byte-read inventory. The preflight recovery amendment is referenced by the retained plan/result but is not independently reread here; scientific response and judge attempts show no retries. The final result payload is checked separately through a retained dated native receipt. No claim of current remote R2 availability or provider execution follows from these local reads.

The campaign manifest payload is `14f54dce16262df4be5f995d47b9edaaca1af21930389638902f22869d2f8ad3`. The archive inventory file is pinned at `f663766d53f76e3881b288f4d8a1935df3a357c6f70eaa3f4fbfa6b77c434102`; the historical final-result payload is `31b02b2db36a9dd15b320bb02134e160fa92dae36eaa1a4d4816e14c00065b3b`. The executed source was `9605a80440e2df4c528ac38b7a507ed2b8926148`; the original manifest's source pin remains distinct. The imported campaign, execution, provider, judging and fixture modules are unchanged from that executed source. Re-decoding and annotation-contract validation here are new checks of existing bytes, not new semantic judgments.

Every respondent request is compared with the pinned assembler. Raw provider bodies are decoded, request/body/envelope digests checked, archived annotations rebound to their exact input and response, and historical response and judgment summaries reconciled. Rejected-attempt identities are compared independently of concurrent archive-read order. The first completed response remains primary, including an empty, refused or output-limited response. Attempts never become additional experimental slots. All 56 case/language/condition cells contain their planned ten repetitions.

Raw prompts, responses, judge explanations and excerpts stay private. The [public aggregate tables](retained-pilot-analysis-2026-11-22.json) contain no such text. The full private JSON additionally retains per-trial identity, selected attempt, requested/returned model, configured and observed output tokens, finish reason, annotation labels, evidence references/digests, strata and the prespecified agreement tables. Neither aggregate publication nor matching hashes independently authenticates the original provider or makes its judgments true.

## Counts before conclusions

| Condition | Received / planned | Output-limited | No output-limit signal | Two accepted judges | One | None |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pack | 140/140 | 126/140 | 14/140 | 69/140 | 58/140 | 13/140 |
| exhaustive_text | 140/140 | 136/140 | 4/140 | 39/140 | 75/140 | 26/140 |
| canonical_prose | 140/140 | 116/140 | 24/140 | 81/140 | 47/140 | 12/140 |
| no_documentation | 140/140 | 55/140 | 85/140 | 77/140 | 51/140 | 12/140 |

All 560 responses were received, with no empty response or respondent technical failure. Of 1,120 expected judge annotations, 763 were admitted: 413 DeepInfra and 350 Mistral. There are 266 complete pairs, 231 single judgments and 63 unjudged responses; thus 294 responses lack a complete pair. The 357 rejected judge attempts consist of 202 Mistral output-limit rejections, 147 DeepInfra `judge_evidence` rejections and 8 Mistral `judge_evidence` rejections. Rejection history is conceptually distinct from missing pairs, even though this campaign has no recovered scientific judge retry.

A received respondent output, a visible semantic omission and a missing judgment are different variables. The historical rubric remains applicable: output limitation does not automatically imply PASS, FAIL or UNSCORABLE. For each judge and criterion, the tables retain PASS, FAIL, UNSCORABLE, NOT_APPLICABLE, expected applicability, missing applicability and the evaluable denominator PASS + FAIL. Condition retention and unjustified refusal stay separate from documentary utility (RESOLVED, PARTIAL, UNDETERMINED). Accepted unpaired annotations remain in descriptive results; agreement uses only admissible pairs.

`beforeArbitration: true` and `globalScore: null` are preserved. Prespecified agreement tables and kappa, including undefined values and their reasons, are recomputed without adding inferential tests, confidence intervals or a global condition ranking. Complete pairs do not establish truth, and missing pairs are not semantic failures.

## Agreement and judge discrimination

Agreement uses admissible pairs before arbitration. A criterion cell is a dimension/language/condition group; a utility cell is a case/language/condition group. The same responses recur across criteria, so cells and criterion comparisons are not additional independent responses. The table counts existing kappa values; it neither averages them nor computes a pooled kappa.

| Family / condition | Cells | Undefined κ | κ = 0 | κ > 0 |
| --- | ---: | ---: | ---: | ---: |
| criteria / pack | 20 | 20 | 0 | 0 |
| criteria / exhaustive_text | 20 | 19 | 1 | 0 |
| criteria / canonical_prose | 20 | 18 | 1 | 1 |
| criteria / no_documentation | 20 | 20 | 0 | 0 |
| utility / pack | 14 | 5 | 8 | 1 |
| utility / exhaustive_text | 14 | 5 | 9 | 0 |
| utility / canonical_prose | 14 | 5 | 8 | 1 |
| utility / no_documentation | 14 | 3 | 10 | 1 |

Of 136 cells, 95 have undefined kappa: 89 because expected agreement is one and six because no applicable paired data exist. Another 37 have kappa zero and four have positive kappa. Undefined kappa is not converted to zero or interpreted as a failure. The public JSON retains each cell’s value, reason, contingency table and denominator, as well as both output-limit strata. Its integer-only package profile encodes `rawAgreement`, `expectedAgreement` and `kappa` as decimal strings or null; counts remain integers and the private historical calculations retain numeric values.

Utility agreement concerns one label pair per response:

| Condition | Matching utility labels / paired responses |
| --- | ---: |
| pack | 46/69 |
| exhaustive_text | 21/39 |
| canonical_prose | 57/81 |
| no_documentation | 30/77 |

Across accepted criterion labels there are 3,131 PASS, six FAIL, zero UNSCORABLE and 4,493 NOT_APPLICABLE labels; these are criterion ratings, not 7,630 independent responses. Mistral labels 335/350 accepted utility annotations RESOLVED, compared with 184/413 for DeepInfra on partly different admitted responses. High raw agreement dominated by one category does not establish discriminative ability. That ability remains unestablished: neither agreement nor a complete pair makes a judgment true, and output limitation still is not automatically a semantic failure.

## Ceiling and selected subset

The configured respondent ceiling was 512 tokens. The 433 output-limited responses report `max_tokens`; the remaining 127 report no output-limit signal but were subject to the same ceiling. Three of those 127 nevertheless report exactly 512 output tokens; absence of the signal does not mean a count below the ceiling. The latter are a subset selected **after generation**, not a corrected estimate of the whole pilot. They are highly uneven: 14 pack, 4 exhaustive text, 24 prose and 85 without documentation. All responses remain in the main analysis.

Case/language/repetition/configuration matching gives 140 four-condition blocks. Only four retain four responses without an output-limit signal; one of those also retains all four complete judge pairs. Ten blocks retain four complete pairs regardless of finish reason. Each judge separately retains only two complete four-condition blocks in the non-limited subset. These small, selected cells cannot support a general superiority claim. The private companion reports both strata by case, language and condition, with separate criteria, utility and prespecified agreement.

## Fictional framing actually transmitted

Each archived respondent request contains one user message: common instruction, document, then case evidence and question. It contains no respondent system message, case identifier, rubric, teaching answer or top-level `fictional: true` scenario metadata. Reconstruction is checked against the archived body rather than inferred from filenames.

The published lexicon covers French `fictif`, `fictive`, plurals, `fiction`, `fictionnel` variants and `exercice(s)`, plus English `fictional` and `exercise(s)`. Text is normalized to NFC and lowercase and scanned as Unicode letter tokens. JSON keys and identifier-connected roots are counted separately from readable words; sentence punctuation does not create a technical identifier. Counts describe this explicit lexicon, not every possible implicit signal of fiction.

| Field | pack | exhaustive_text | canonical_prose | no_documentation |
| --- | ---: | ---: | ---: | ---: |
| Common instruction | 0/140 | 0/140 | 0/140 | 0/140 |
| Document | 140/140 | 140/140 | 140/140 | 0/140 |
| Evidence | 0/140 | 0/140 | 0/140 | 0/140 |
| Question | 40/140 | 40/140 | 40/140 | 40/140 |

Question signals occur in `preserve-conditions` and `explanation-versus-action`, both languages and all ten repetitions. Thus only two of seven cases in each language signal fiction lexically in the undocumented arm. The aggregate matrix supplies occurrences and response presence separately for every field/case/language/condition. This asymmetry supports a limitation and a hypothesis for a future controlled experiment, not a causal attribution to framing. No archived signal is removed and no counterfactual response is fabricated.

## Documentary comparability

The exhaustive text reproduces all **129 terminal values** of its corresponding pack, including types, JSON Pointer positions, references and metadata. This is verified byte-for-byte from the retained input. FR sizes are 10,328 bytes for the pack, 17,538 for exhaustive text and 3,837 for prose; EN sizes are 9,956, 16,392 and 3,426 bytes. Equal values do not imply equal presentation, token demand or model interpretation.

Editorial rereading of both retained prose documents confirms the jointly required Quebec location and favourable project-specific written assessment, the exclusions, missing/conflicting evidence, the separate action permission, local priority, and the named source/chain/rules. These are paraphrased and grouped. Prose omits the exhaustive technical encoding of versions, digest values, unit profiles, manifests and repeated projections; it does not preserve all 129 values. The historical [coverage map](../spec/examples/semantic-boundaries/prose-coverage.json) records these distinctions and is unchanged. Automated pointer coverage alone would not prove this semantic reading.

`no_documentation` still receives case evidence and the question. Retention criteria for documentary elements absent from that condition remain NOT_APPLICABLE as specified by the rubric. Differences observed between the executed conditions combine representation, content, length and framing. An explanatory hypothesis is not a causal result. Seven synthetic cases and repeated runs are not a random representative sample of real tasks. This tool-free campaign measures neither HTTP/MCP retrieval nor operational action admission.

## Documentary authority and trust boundary

A canonical source establishes what its author states. Accurate attribution preserves conditions, exclusions and unknowns; it does not establish general truth. An independent critical inquiry may compare the doctrine with relevant external evidence and arguments. A missing canonical declaration prevents inventing an attribution, not conducting that inquiry. Action authority comes from the user's mandate, consumer policy and effective execution controls. A relevant prescription in retrieved content is neither automatically malicious nor evidence that filtering is effective.

## Reproduction with authorized local archives

Run `node scripts/analyze-retained-pilot.mjs` with `--cache=PATH`, `--plan=PATH`, `--proof=PATH`, `--native=PATH`, and `--out=NEW_OUTPUT_PREFIX`. Each option is a separate PowerShell argument, for example `"--cache=$archiveCache"`. Paths are explicit operator inputs; none is discovered from another session and no credential is used. The output prefix must be new. The command writes `.json` (private detailed analysis), `.md` (readable report) and `.aggregates.json` (the reproducible public projection used by the linked record). Network fetch is disabled; the archive adapter exposes only reads and rejects mutations. Missing or changed evidence stops verification instead of silently using an aggregate.

The proof argument is the pinned November 12 archive inventory. The retained delivery plan is independently pinned at `06c4173e307dc30c332281a4e43cfa56bfe85158101042331a5a91e332334024`; altered bytes are rejected before its historical admission time is used, and native is the dated native receipt containing the final payload. No runner, recovery admission, provider dispatch, storage qualification or historical generator is invoked. `node --test test/retained-pilot-analysis.test.mjs` exercises modified-byte rejection, read-only behavior, fictional identifiers and retry counting. The manifest admission time is used only to verify the historical input contract; it authorizes nothing today.

The public `analyzedDate` is the UTC day of this verification run; private `analyzedAt` records its timestamp. Data reproduction is independent of those temporal metadata. Byte-identical public output requires the same UTC day; a later reproduction must preserve both outputs and report a date-only difference rather than overwrite an earlier receipt.

## Synthèse française

Cette réanalyse vérifie hors ligne les pièces réellement consommées et retrouve les résultats historiques : 560 réponses, 433 avec un motif de limite de sortie, 763 annotations admises et 266 paires complètes. Les 294 absences de paire ne sont pas des échecs sémantiques. Les critères, l’utilité, l’accord et leurs dénominateurs restent distincts, avant arbitrage et sans score global.

Les 127 réponses sans signal de limite forment un sous-groupe sélectionné après génération ; trois comptent néanmoins exactement 512 jetons. Sur 136 cellules d’accord, 95 kappa sont indéfinis, 37 sont nuls et quatre sont positifs. La forte concentration des étiquettes ne prouve pas la capacité discriminante des juges, qui reste non établie. Il ne reste que quatre blocs complets de quatre conditions dans ce sous-groupe, dont un seul avec toutes ses paires de jugements. La fiction est explicitée dans chaque document, mais seulement dans deux des sept questions sans documentation. Ces différences bornent les conclusions ; elles ne prouvent pas un effet causal du cadrage, une supériorité générale, une permission d’action ou une fidélité universelle.

Les statuts `NOT_RUN` du plan figé et des observations antérieures restent historiques. Cette analyse ne les réécrit pas. Elle ne remplace ni la qualification propre à un usage réel ni les contrôles d’autorisation du consommateur.

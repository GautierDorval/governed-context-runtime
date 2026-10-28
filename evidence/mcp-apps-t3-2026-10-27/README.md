# Retained T3 answer and bounded artifact comparison

[Français](#français) · [English](#english)

## Français

Ce dossier permet de **vérifier les artefacts conservés de T3**, sans Claude, clé API, réseau ni nouvel appel de modèle. Il distribue la réponse finale française conservée et les critères dérivés de la fixture épinglée. Ce contrôle documentaire ne rejoue pas la séance historique et n’en authentifie pas indépendamment l’origine.

T3, le 27 octobre 2026, est une reprise dans la même conversation privée après l’annulation T2 de cause inconnue. Le producteur a observé un seul appel texte effectif sur T2/T3 dans Claude Desktop Windows 3.6556.2.0, modèle **affiché** Opus 5.5 Max. Ce nom n’atteste pas l’identité interne du modèle. Le statut historique reste `PASS_BOUNDED_TEXT_BUTTON_FR`; le nouveau contrôle porte sur des fichiers conservés.

### Refaire le contrôle public

Depuis la racine du dépôt, avec la version de Node prise en charge par `package.json` :

```powershell
node .\scripts\verify-t3-evidence.mjs
node --test .\test\t3-evidence.test.mjs
```

Le vérificateur recalcule tailles et SHA-256 bruts, vérifie les entrées épinglées distribuées, dérive les attentes de l’archive du pack et compare les cinq listes de `answer.txt`. Il exige les cinq titres exacts, leurs limites, les cardinalités **2, 2, 2, 3, 2**, le contenu et l’ordre; une entrée manquante, ajoutée ou dupliquée invalide le résultat. Il ne suffit pas de trouver les onze phrases dans le texte. La seule normalisation de comparaison est la séparation des lignes LF/CRLF et l’ignorance des lignes séparatrices vides; aucune normalisation des caractères, espaces, ponctuation ou casse des entrées. Les empreintes portent toujours sur les octets bruts.

Le résultat « sans ajout ni omission » concerne **ces cinq listes**, pas automatiquement tout le contenu de la réponse. Les passages sur les preuves manquantes ou contradictoires, les sources et les permissions font l’objet d’une [lecture éditoriale distincte](editorial-review.json), avec extraits et limites. Le script ne prétend pas reproduire cette appréciation manuelle.

### Pièces, provenance et limites

- [Réponse finale](answer.txt) : copie intégrale, octet pour octet, de la capture textuelle conservée; aucun mot corrigé, aucune expurgation. Elle n’inclut ni aperçu du widget ni réponse d’annulation T2. Elle n’est pas un export interne certifié par le fournisseur.
- [Demande du bouton](request.txt) : chaîne `prompt` extraite du JSON privé du brouillon, encodée en UTF-8 sans fin de ligne ajoutée. La capture d’interface qui l’entourait reste privée.
- [Critères](expected-lists.json) : dérivés du pack archivé, jamais de la réponse à évaluer.
- [Résultats](validation.json) : comparaison publique et rapprochements privés du producteur séparés.
- [Manifeste](manifest.json) : dates déclarées, filiation, empreintes et transformations. Une empreinte privée ne donne ni accès à son fichier ni preuve de sauvegarde.

L’implémentation essayée est `d068b16241f1aeab09058e7b9b455baba85b40ab`, arbre `f4f4bcdd55ca9b972837265d0436503bea696efa`. La documentation T3 livrée ensuite est `98919d9af47b5f27aedf915c950fafbe2967c5c8`, fusionnée en `d1d087e7d779d97d7fc1d3e6d089a87f6c96874d`. Ces deux derniers arbres sont identiques entre eux; ils ne sont pas l’arbre complet de l’implémentation essayée. Les données de référence du compagnon sont épinglées séparément dans le manifeste et distribuées dans le dépôt.

La projection de **57 236 octets UTF-8** est le résultat de l’outil, pas la réponse de l’assistant. Le producteur a recalculé son empreinte et reconstruit sa totalité depuis l’archive historique vérifiée, sans filtrer les sources bilingues. Les traces stdio, rapports originaux, captures et ZIP restent privés. Le lecteur public peut contrôler les fichiers distribués et les listes; il ne peut pas reproduire les rapprochements privés à partir de leurs seuls engagements.

Les heures originales sont des déclarations conservées du producteur. Le recalcul est daté séparément en UTC. L’engagement public commence avec la première révision Git publiant ce dossier; son identité et sa date viennent de Git, sans auto-référence dans le manifeste. Il ne constitue pas une préinscription antérieure à T3. Le nom daté du dossier désigne l’événement historique.

Aucun nouvel essai client, natif ou anglais, aucun juge modèle, aucun pilote comparatif. La déclaration de non-navigation appartient à la réponse; la trace GCR n’inventorie pas l’ensemble de l’hôte. Les limites de réservation, paiement et travaux sont évaluées dans le texte, pas par un essai d’autorisation réel. Ni taux de fiabilité, ni fidélité générale, ni effet SEO, ni adoption ne sont établis.

[Historique T3](../../records/mcp-apps-2026-10-26.md#selector-to-answer-qualification-t3-2026-10-27) · [Consolidation et observations natives](../../records/mcp-apps-2026-10-26.md#retained-t3-artifact-consolidation-2026-10-27) · [Guide français](../../docs/fr/mcp-apps.md)

## English

This dossier lets readers **verify retained T3 artifacts** without Claude, API keys, network access or a new model call. `answer.txt` is the complete byte-identical retained French final-answer capture, with no correction or redaction. It excludes the widget preview and T2 cancellation answer; it is not a provider-certified internal export. `request.txt` extracts only the private draft’s prompt string as UTF-8, with no appended newline.

Run the two PowerShell commands above from the repository root using the supported Node version. The verifier checks raw sizes and SHA-256 digests, derives expectations from the pinned archived fixture and delimits all five named lists. It requires counts **2, 2, 2, 3, 2**, exact entry contents and order, with no missing, added or duplicated entry. Only LF/CRLF line splitting and empty separator lines are normalized; entry characters, spacing, punctuation and case are not. Raw-byte hashes are separate from that comparison. Targeted controls reject missing, added, duplicated, reordered or changed entries and changed raw bytes.

The no-addition/no-omission result applies to those lists, not automatically to the whole answer. `editorial-review.json` separately quotes and assesses missing or conflicting evidence, archived-source attribution and action-permission boundaries. This manual producer reading is not replayed or converted into a model-judge score by the script.

Historical T3 retried in the same private conversation after T2’s unexplained cancellation. One effective GCR text read was observed across T2/T3, in Windows Claude Desktop 3.6556.2.0 with displayed model Opus 5.5 Max; the display does not independently attest the internal model. The tested implementation is `d068b16241f1aeab09058e7b9b455baba85b40ab`, tree `f4f4bcdd55ca9b972837265d0436503bea696efa`. The later documentation candidate `98919d9af47b5f27aedf915c950fafbe2967c5c8` and merge `d1d087e7d779d97d7fc1d3e6d089a87f6c96874d` share an identical tree with each other, not with the complete tested tree.

The **57,236 UTF-8 bytes** describe the tool projection, not the assistant answer. Its complete offline reconstruction, the private stdio trace, exact call arguments and original archive checks are producer-side findings in `validation.json`; they cannot be independently reproduced from private hashes alone. The public comparison uses only distributed files and pinned inputs. Private originals remain retained; a digest does not establish a backup or provide access.

Original timestamps are retained declarations. Recalculation uses a separate UTC date. The first public Git revision establishes publication of this dossier, without a circular self-hash or retroactive preregistration. The folder date identifies the historical event. This is neither a new T4 trial nor independent reproduction of the historical client. No new native/English trial or comparative pilot ran. Non-navigation is the answer’s declaration; GCR stdio is not full host telemetry. Text respecting action limits does not test a real authorization system. No reliability rate, general fidelity, business validation, SEO effect or adoption claim follows.

[Historical T3 record](../../records/mcp-apps-2026-10-26.md#selector-to-answer-qualification-t3-2026-10-27) · [Consolidation and native observations](../../records/mcp-apps-2026-10-26.md#retained-t3-artifact-consolidation-2026-10-27) · [English guide](../../docs/en/mcp-apps.md)

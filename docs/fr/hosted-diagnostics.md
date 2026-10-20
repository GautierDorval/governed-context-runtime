# Dossier de diagnostic du service hébergé

Statut : **NOT_RUN** pour un nouveau diagnostic hébergé. La [qualification hors ligne du 20 octobre](qualification.md) distingue les comparaisons d’actifs conservés et le rejeu local de l’implémentation réelle de l’adaptateur, tous réussis. Le résolveur reste une table locale fermée. Aucun appel au service de Gautier n’a été effectué.

## Preuves disponibles et limites

Les [relevés des 12, 14 et 19 octobre](../../evidence/README.md) contiennent des déclarations datées du producteur, empreintes, comptes et périmètres. Ils ne publient ni les corps des réponses ni une transcription complète des échanges discovery et lifecycle. Le [tableau historique des clients](instance.md#clients-testés) conserve un appel local `initialize`, étiqueté `2025-06-18`, avec HTTP 404 et JSON-RPC `-32601`. Ses en-têtes et son corps complets ne sont pas publiés. Ce résultat reste historique ; il ne doit pas être remplacé par le résultat normatif d’une nouvelle requête.

Le paquet public ne contient pas l’implémentation privée de l’adaptateur. La qualification du 20 octobre lit les formes réelles des actifs health et lifecycle conservés par le producteur. Ce ne sont pas des captures temporelles du service courant. Sept contrôles distinguent cohérence locale, racine historique, inventaire contradictoire et transition indéterminée. Les [contrats d’observation](observations.md) valident séparément les anciens résumés.

## Cas MCP isolés

Profil supposé : adaptateur exclusivement moderne MCP `2026-07-28`, version acceptée connue et point d’accès MCP connu. Une autorisation ultérieure doit fournir le point d’accès. Aucun programme d’envoi n’est fourni. Chaque cas utilise `POST`, un état indépendant, aucun suivi de redirection, aucune reprise et un identifiant JSON-RPC distinct. Réponse réelle, en-têtes et horodatages : **NOT_RUN** pour chacun des quatre cas.

Le [modèle JSON exact](../hosted-diagnostics.md#isolated-mcp-request-cases) est commun aux deux langues. Il utilise `Content-Type: application/json`, `Accept: application/json, text/event-stream`, `MCP-Protocol-Version: 2026-07-28` et `Mcp-Method: server/discover`. Le corps JSON-RPC contient `method: server/discover`, un identifiant propre et les métadonnées par requête `_meta` : version, `clientInfo` et `clientCapabilities`. Chaque ligne repart de ce modèle, remplace `body.id` par son identifiant et applique uniquement la modification décrite.

| Identifiant | Modification isolée | Résultat attendu sous ce profil | Résultat réel |
|---|---|---|---|
| `missing-method-header` | Retirer `headers.Mcp-Method` en conservant le corps et la version. | HTTP 400, JSON-RPC `-32020`. | NOT_RUN |
| `mismatched-method-header` | Remplacer seulement `headers.Mcp-Method` par `tools/list` ; le corps reste `server/discover`. | HTTP 400, JSON-RPC `-32020`. | NOT_RUN |
| `unsupported-version` | Remplacer les deux indications de version par `1900-01-01`, après confirmation que l’implémentation ne l’accepte pas. Une seule condition logique change, sans désaccord entre en-tête et corps. | HTTP 400, JSON-RPC `-32022`, `error.data.requested` et `error.data.supported`. | NOT_RUN |
| `unknown-method` | Remplacer les deux indications de méthode par `initialize`, avec la version moderne acceptée et les métadonnées. Confirmer que ce profil n’implémente pas la méthode. | HTTP 404, JSON-RPC `-32601`. | NOT_RUN |

Un en-tête invalide, une version refusée et une méthode inconnue sont des cas distincts. Le mot `initialize` seul ne détermine pas le résultat. Voir le [transport Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) et le [schéma d’erreur de version](https://modelcontextprotocol.io/specification/2026-07-28/schema#unsupportedprotocolversionerror).

Pour tout refus de `initialize` par un serveur exclusivement moderne, relever aussi la présence des versions acceptées. Cette recommandation **SHOULD** reste distincte des obligations **MUST** propres au cas. L’absence de cette information ne suffit pas à conclure à une violation de MUST. Voir la [compatibilité des versions](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning#backward-compatibility-with-initialization-based-versions).

## Comparaisons lifecycle

Les cas hébergés restent **NOT_RUN**. Le comparateur pur a été exercé sur les actifs locaux conservés et sur des variantes contrôlées. Une même révision locale stable permet une comparaison locale ; elle ne prouve pas une fenêtre stable du service.

| Cas | Condition requise dans les captures | Diagnostic borné |
|---|---|---|
| Découverte courante cohérente | La racine découverte correspond à une seule entrée courante dans une fenêtre stable. | Cohérence avec cet inventaire capturé. |
| Racine courante absente | La racine découverte est absente de l’inventaire lifecycle. | Incohérence de ces captures, sous réserve d’une transition. |
| Plusieurs entrées courantes | Plusieurs entrées distinctes déclarent le statut courant. | Déclaration ambiguë ; conserver toutes les entrées. |
| Racine historique conservée | Un artefact immuable versionné possède une autre racine, conservée dans lifecycle. | Identité historique conservée ; la différence seule n’est pas une erreur. |
| Transition de déploiement | Les captures chevauchent une transition observée ou leur ordre ne prouve pas la stabilité. | INCONCLUSIVE ; aucune déduction de défaut stable ou de cause liée au cache. |

La découverte courante et l’en-tête de racine d’une ressource historique répondent à des questions différentes. Les en-têtes de cache ne suffisent pas à établir une cause ni une durée de propagation.

## Matériel requis pour un diagnostic reproductible

Une exécution ultérieure autorisée doit conserver :

1. Le point d’accès, la surface, le chemin, la méthode HTTP, les en-têtes pertinents, les octets du corps et le profil de protocole. Retirer les identifiants secrets avant publication sans supprimer les métadonnées nécessaires.
2. Le statut, les en-têtes et octets de réponse, le type de contenu, la taille et l’empreinte. Distinguer le brut du résumé et préciser ce qui peut être publié.
3. Les bornes UTC et horodatages par échange, l’ordre, le client et sa version, le périmètre poste/réseau et les limites de l’horloge.
4. La révision de l’adaptateur et sa configuration pour un rejeu local ; l’état et les transitions du déploiement couvrant la capture pour une interprétation hébergée.
5. La relation entre découverte courante, `/v0/lifecycle`, snapshot courant et ressources historiques immuables, avec leurs formes réelles. Une empreinte ne reconstruit pas un corps.
6. Le résultat attendu, le résultat réel, les versions acceptées lorsque pertinentes, le diagnostic et ses incertitudes. La déclaration de source reste distincte d’une provenance de déploiement vérifiée.

Le comparateur existant pourra alors être appliqué aux captures réelles datées. Contrôles synthétiques, rejeu local et observations hébergées restent séparés. Les données hébergées manquantes laissent le diagnostic distant ouvert ; elles ne prouvent ni ne réfutent la conformité, la disponibilité ou la valeur du service.

[English](../hosted-diagnostics.md) · [Observations](observations.md) · [Qualification locale](qualification.md)

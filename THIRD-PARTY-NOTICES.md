# Third-party notices

Speculo retains the licenses and attribution for material actually distributed in this version. The new lightweight workflow instructions are original syntheses; research references and the choices they informed are documented in [docs/research.md](docs/research.md).

## Skills Hub

The bundled hub was originally imported from `wta-skills-hub/skills`. Its exact source revision was not recorded in the existing inventory. This version edits the skill instructions and removes obsolete workflow templates; it does not claim byte-for-byte parity with an upstream release.

The retained packages include their existing licenses (Copyright © 2026 Ting'an Wang where stated). Additional attribution is kept with the relevant package:

- [ste-zh](skills-hub/writing/ste-zh/NOTICE.md): adapted writing guidance from `dualface/ste-zh` and the separately identified conceptual references. Its MIT license includes the original dualface attribution. No ASD-STE100 standard or approved dictionary is bundled.
- [eli5](skills-hub/writing/eli5/THIRD_PARTY_NOTICES.md): the carried Speculo MIT notice and teaching-reference boundary.
- [AI CLI configuration parsers](skills-hub/system/optimize-codex-config/scripts/vendor/THIRD-PARTY-NOTICES.txt): full licenses for `toml-eslint-parser`, `eslint-visitor-keys` and `jsonc-parser`. The bundled parser code, build inventory and notices remain together.

Installing a hub skill copies its package and does not run its helper scripts. API clients, configuration tools, rendering helpers and other retained utilities keep their original notices.

## Removed bundles

Earlier releases included adapted `mattpocock/skills` workflows, `humanlayer/show-me` presentation guidance, `VoltAgent/awesome-design-md` design analyses and standalone YAML/Ajv validation bundles. Those copies and their old workflow contracts are no longer shipped. Their historical provenance remains in Git history; links in the current research notes are references, not redistributed source.

Runtime npm dependencies retain their own licenses. Repository and package licenses do not grant rights to third-party photographs, fonts, trademarks or user-provided material.

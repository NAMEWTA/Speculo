# Third-party notices

Speculo preserves the source identity and license of material it distributes. Rewritten workflow guidance is a synthesis of the sources described in [docs/research.md](docs/research.md); retained source corpora and historical reference snapshots are not represented as newly authored guidance or current upstream facts.

## Adapted workflow methods

The original SpecDev methods were adapted from Matt Pocock's skills. v3 rewrites their presentation while retaining useful task methods; the existing MIT notice remains below. The recorded revision identifies the historical import, not a claim that current instructions match that revision verbatim.

# mattpocock/skills

https://github.com/mattpocock/skills
Revision: f3fc5632f401156837ee3872f14fe33ccf1024ea

MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Prior presentation attribution

The previous PR-writing guidance credited Dex Horthy's `show-me` in [humanlayer/humanlayer](https://github.com/humanlayer/humanlayer) for its menu of visual summaries. That historical attribution remains relevant to the earlier adaptation; current delivery guidance has been rewritten and does not claim an unchanged bundled copy.

## Design reference sources and examples

The original ten analyses from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) are retained at the fixed revision recorded in their [provenance inventory](template/workflows/specdev/specdev-p-prototype/design-library/upstream/awesome-design-md/provenance.json). Their [MIT license](template/workflows/specdev/specdev-p-prototype/design-library/upstream/awesome-design-md/LICENSE) stays beside the files.

The local UI research snapshot and runnable examples retain their original source material. Historical research is a dated reference, not a statement that linked products still have the same current implementation. The gallery's photographs and vendored icons retain their [attribution](template/workflows/specdev/specdev-p-prototype/design-library/research-snapshot/ui-gallery/assets/ATTRIBUTION.md): Unsplash photographs and Lucide's ISC-licensed distribution. Project or code licenses do not grant rights to third-party brand fonts, photographs or trademarks beyond their own terms.

## Person source corpus

The existing Mao Zedong text corpus under `template/workflows/person/person-m-mao-zedong-cognitive-os/books/src/` is retained as historical source material for targeted lookup. The rewritten [reading guide](template/workflows/person/person-m-mao-zedong-cognitive-os/books/README.md) distinguishes original text, paraphrase and modern application. Speculo's software license is not a claim to authorship or a new license grant over those historical texts. Their source identity and original wording are preserved.

## Skills Hub

The bundled hub was originally imported from `wta-skills-hub/skills`. Its exact source revision was not recorded in the existing inventory. This version edits the skill instructions and removes obsolete workflow templates; it does not claim byte-for-byte parity with an upstream release.

The retained packages include their existing licenses (Copyright © 2026 Ting'an Wang where stated). Additional attribution is kept with the relevant package:

- [ste-zh](skills-hub/writing/ste-zh/NOTICE.md): adapted writing guidance from `dualface/ste-zh` and the separately identified conceptual references. Its MIT license includes the original dualface attribution. No ASD-STE100 standard or approved dictionary is bundled.
- [eli5](skills-hub/writing/eli5/THIRD_PARTY_NOTICES.md): the carried Speculo MIT notice and teaching-reference boundary.
- [AI CLI configuration parsers](skills-hub/system/optimize-codex-config/scripts/vendor/THIRD-PARTY-NOTICES.txt): full licenses for `toml-eslint-parser`, `eslint-visitor-keys` and `jsonc-parser`. The bundled parser code, build inventory and notices remain together.

Installing a hub skill copies its package and does not run its helper scripts. API clients, configuration tools, rendering helpers and other retained utilities keep their original notices.

## Runtime dependencies and retired bundles

Runtime npm dependencies retain their own licenses. The former standalone YAML/Ajv business-validator bundles are not redistributed in v3; ordinary YAML parsing remains an npm dependency for standard skill frontmatter and installer configuration. Removed orchestration adapters and retired generated contracts remain available in Git history.

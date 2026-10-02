# Paper 2: Topics 7–10

## Scope and implementation

This addition replaces the four incorrect homepage placeholders and provides a
static study section for each correct topic. It keeps the existing site's purple
gradient, cards and direct HTML links. No build step or third-party JavaScript is
required; all links are relative so they work beneath the GitHub Pages project path.

Each topic has an overview, revision notes, searchable key terms, worked examples,
a four-question self-check with explanations, a longer task with solution guidance,
and PDF/Quizlet downloads. Topic 7 includes a trace stepper. Topic 10 includes six
SVG gate symbols and an interactive three-input truth table.

| Topic | Directory | Terms |
| --- | --- | ---: |
| 7 Algorithm Design and Problem Solving | `topic-7-algorithm-design` | 46 |
| 8 Programming | `topic-8-programming` | 26 |
| 9 Databases | `topic-9-databases` | 18 |
| 10 Boolean Logic | `topic-10-boolean-logic` | 12 |

Shared presentation and behaviour are in `assets/paper2.css` and
`assets/paper2.js`. The HTML files are directly editable. Keep Quizlet TSV files
and the corresponding keyword pages in sync when changing definitions.

## Material provenance

Materials were supplied in the local `0478hub` workspace:

- Revision HTML: `7 MasteringAlgorithmDesignandProblemSolving.html`,
  `8 IGCSEComputerScienceCoreProgrammingandDataStr.html`,
  `9 IGCSEComputerScienceTopic9DatabaseRevisionGui.html`, and
  `10 CambridgeIGCSEComputerScienceBooleanLogicRevi.html`.
- Chapter key terms: `output/pdf/Chapter_07_Key_terms.pdf` through
  `Chapter_10_Key_terms.pdf`.
- Original flashcard PDFs for 7, 8.1, 8.2, 8.3, 9 and 10, copied without modification.
- Topic 7 terms and original flashcard imports from `topic 7/output`.
- Scope and pseudocode checked against the supplied 2026–2028 syllabus,
  subject-content pages 25–31 and the assessment/pseudocode section.

The revision exports were adapted to responsive semantic HTML. Unresolved numeric
citation markers and the introductory export text were removed; headings and SQL
code blocks were repaired. Corrections clarify validation versus accuracy, database
duplication, zero as an integer, and limitations of check digits. Worked examples,
quizzes and Topic 8–10 concise definitions were written for this addition. They are
study exercises, not official examination questions or mark schemes.

The workspace now has `topic 8`, `topic 9`, and `topic 10` directories with
`sources`, `tmp/extracted`, and `output`. Topic 7's existing outputs remain intact.
Original review exports are retained under each workspace topic's `sources`.

## Validation (2026-10-01)

- Checked local links from the homepage and all 16 new pages, including resources.
- Read all ten copied PDFs and verified their hashes against the supplied originals.
- Checked JavaScript syntax with `node --check assets/paper2.js`.
- Browser checked desktop and 390px mobile layouts; no page-wide horizontal
  overflow on any of the 16 new pages. Wide code and tables scroll within their containers.
- Browser checked term search, empty results, reveal-all, unanswered quiz feedback,
  correct-answer scoring, reset, trace completion/restart, and logic input changes.
- Verified the original existing files by SHA-256: only `index.html` changed.
  Untracked `topic-1-data-representation/review.html` and `.DS_Store` files were retained.

## Local preview and publication

Serve this directory with `python3 -m http.server 8047 --bind 127.0.0.1` and open
`http://127.0.0.1:8047/`. No repository commits, remote pushes or GitHub Pages
publication were performed as part of this development pass.

The existing Topic 6 contains its own Coming Soon sections; those and all other
Topic 1–6 content were intentionally left as found. Further presentation decks and
larger examination question banks can be added separately; this pass supplies the
four working study sections described above.

# Paper 2 teaching resources — October 2026 rebuild

The static site now has chapter teaching hubs, classroom lessons, editable PPTX
decks, searchable Hodder glossaries, revision notes, worked examples and practice
for Topics 7–10. Open `resource-library.html` for the Chapter 1–10 resource index.
No JavaScript package installation or build server is needed to use the site.

## Delivered material

| Chapter | Classroom slides | Hodder source terms | Additional activity |
| --- | ---: | ---: | --- |
| 7 Algorithm design and problem solving | 26 | 30 | Bubble-sort comparison stepper |
| 8 Programming | 31 | 27 | Two-dimensional array trace |
| 9 Databases | 19 | 15 | SQL filter and sorting explorer |
| 10 Boolean logic | 22 | 4 | Existing gate symbols and truth-table explorer |

Every lesson includes a question and a revealable model answer. PPTX speaker notes
contain those answers, teaching prompts and references. Text and tables are editable;
15 credited textbook figures are embedded images; their source mappings are in
`resources/lesson-figures/sources.json`. Older extended glossaries
remain at `keywords-extended.html`; older revision/practice content is retained.

`resources/practical/` contains an original student brief, Python teacher model,
CSV/SQLite data, teacher answers and a ZIP package. The examples were written for
this site and are not official examination questions or mark schemes.

## Source editions and page boundaries

`resources/catalog.json` records 173 PDF resources with source filenames, one-based
source PDF page ranges, printed page ranges when available, page counts and SHA-256.
The resource index displays the same page mapping. This comprises 147 chapter/shared
PDFs and 26 past-paper QP/MS files (13 complete pairs). It is not a count of unique
questions; some full chapters and subsection slices intentionally overlap.

- CUP: *Cambridge IGCSE and O Level Computer Science Coursebook*, second edition,
  supplied complete 412-page PDF. Printed page + 11 = source PDF page.
- Hodder: David Watson and Helen Williams, *Cambridge IGCSE and O Level Computer
  Science* (2021), supplied complete 404-page PDF. Printed page + 12 = PDF page.
- Hodder Computer Systems Workbook (Topics 1–6) and Algorithms, Programming and
  Logic Workbook (Topics 7–10), plus supplied matching answer PDFs.
- Syllabus: **2026–2028 Version 6**, downloaded from
  https://www.cambridgeinternational.org/Images/697167-2026-2028-syllabus.pdf.
  Topic slices, full syllabus, Paper 2 conventions and command words are included.
  The 2029–2031 cycle is not combined with this course.
- PMT: supplied chapter/subtopic QP/MS collections (24 paired groups), summary
  notes and the separately labelled supplied definitions.
- ZNotes: supplied 2026–2028 **Theory** PDF, sliced for Topics 1–6 only. Topic 4
  starts on PDF page 15. Boundary pages shared by chapters are retained whole.
- Hodder chapter-end keywords: original PDF extracts for all ten chapters; source
  transcription and classroom TSV versions. There are 359 source terms in total.
  Selected corrections (including field, integer, declaration, check digit, HTML,
  truth table and COUNT) are labelled; original wording remains available.

Whole-page slicing preserves illustrations. Some syllabus/ZNotes pages contain
both adjacent chapters; some workbook-answer slices begin on a page that also has
the final answers from the preceding chapter. These shared pages are intentional.
Topic 6's four legacy textbook links incorrectly led to Topic 5 content; they now
point to the correct Hodder 6.1–6.3 slices and Chapter 6 keywords. Original PDFs and
all other Topic 1–6 teaching pages remain in place.

## Examination conventions

Most Paper 2 coding questions require pseudocode. The 15-mark scenario allows
pseudocode, Python, Visual Basic or Java. The classroom Python practical is clearly
separated from examination notation. ROUND accepts an identifier or expression in
Version 6. SQLite demonstrations use ASC/DESC while the classroom examination SQL
examples use the syllabus ASCENDING/DESCENDING forms.

## Missing and deferred material

Each chapter’s resources.html reserves non-clickable, labelled entries for:

- Save My Exams revision notes
- Save My Exams topic questions
- Save My Exams answers and explanations
- ZNotes Paper 2 notes

The user will supply these files later. Do not label PMT or generated explanations
as SME/ZNotes. Once supplied, verify edition and chapter boundaries before linking.

`past-papers.html` pairs the available 2023 and 2025 Paper 2 papers with mark schemes.
The local March 2024 Paper 22 QP lacks a matching MS, so it is recorded as incomplete
in `resources/past-papers.json` rather than advertised as a complete pair. 2026 papers,
missing 2024 papers and examiner reports still need sourcing. Individual question
classification by chapter and PMT overlap detection remain future work; the current
index explicitly makes no claim that its questions are unique or already deduplicated.

## Maintenance and validation

Shared styles and behaviour: `assets/paper2.*` and `assets/classroom.*`.
Editable classroom content: `resources/classroom-lessons.json`.
Original source files and local generation scripts are retained in the user's
`0478hub/rebuild-2026-10` workspace; generated PPTX validation receipts and slide
renders are retained there, outside this public website tree.

Validation in this rebuild:

- Read all 173 catalogued PDFs and render their first/last pages;
  135 sliced boundary renders exactly match corresponding source pages.
- Corrected the shared ZNotes 3/4 boundary after checking source headings.
- Verify hashes of all 173 catalogued PDFs and all local targets in 28 relevant
  HTML pages (893 links); no missing targets or resource files over 90 MiB.
- Validate four PPTX packages, fonts, geometry, native tables and re-import;
  render and inspect all 42 slides, then repair the affected code/table layouts.
- Execute Python algorithm edge cases and SQLite queries against the classroom
  data; check JavaScript syntax.
- Browser-check classroom navigation, answer reveal, completed bubble sort,
  2D array traversal, SQL filtering/sorting, glossary search, chapter filtering,
  and 390px mobile layouts for a chapter hub and the resource index.

For local preview, run `python3 -m http.server 8047 --bind 127.0.0.1` from the repository.
The illustrated Paper 2 rebuild was published in commit `83f1ae7`. The resource
icon and visitor-statistics changes below extend that revision.

## Simplified chapter navigation

Topics 7–10 follow the earlier chapters’ centred gradient header, section-card
grid and rounded presentation buttons. Each overview begins with three prominent
material cards: both chapter textbooks, workbook questions/answers, and online
slides/editable PPTX. Every material has a full-width direct button. Three lesson
cards follow, then keywords, practice and notes/resources. Longer download lists, source notes and
the deferred SME/ZNotes entries live on the chapter’s `resources.html`.
Chapter 8 retains full-width CUP/Hodder subsection buttons. Presentation buttons open
the appropriate lesson step directly in presentation mode.

Overview styles are isolated in `assets/topic-overview.css`. The local rebuild
script applies `simplify_overviews.py` last so regeneration preserves this layout.
Local link validation covers 32 pages and 947 links after this change.

## Detailed illustrated classroom decks

The four classroom decks now contain 98 slides (26 / 31 / 19 / 22). Added
structure diagrams, flowcharts, array diagrams, database structure and six gate
symbols, alongside editable algorithm traces, SQL results and truth tables.
Step-by-step examples lead into independent tasks and model answers. Online lesson
content and section-entry anchors use the same revised sequence. All 98 slides
were rendered and visually reviewed; the four final PPTX packages passed font,
geometry, native-table and re-import checks. Numeric traces and SQL result tables
were independently checked.

The illustrated revision passes 1,018 local-link checks across 32 HTML pages,
63 numeric/SQL assertions and all 173 source-PDF hash checks. Desktop and mobile
previews confirm the new figures and answer controls. Presentation navigation
updates its step link and scrolls to the new slide.

## Resource and action icons

Chapter entry pages, resource indexes and classroom controls use decorative local
SVGs in `assets/icons/`, styled by `assets/resource-icons.css`. Text labels and
resource destinations remain unchanged. Run `python3 scripts/add_resource_icons.py`
after regenerating the static HTML; rerunning it does not duplicate annotations.
Icons do not require a font service, CDN or JavaScript library. Visitor statistics
are configured separately as described below; payment and enquiry features remain
outside this update.

## Optional visitor statistics

The Cloudflare Worker/D1 backend is deployed and verified on Workers Free. The
tracker is configured for production collection when this revision is published
to GitHub Pages; localhost previews remain excluded.
See `ANALYTICS.md` for the administrator dashboard, deployment details and activation
steps. Once enabled, the homepage can show total page views; only the authenticated
backend administrator can see the current last ten distinct IPs.

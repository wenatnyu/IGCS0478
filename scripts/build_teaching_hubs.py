#!/usr/bin/env python3
"""Rebuild chapter hubs from the curated teaching/resource coverage manifest."""
from html import escape
from pathlib import Path
import json
from lxml import html as dom
import os
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def link(item, secondary=False, preview=False):
    href = escape(item['href'], quote=True)
    attrs = f' data-presentation="{href}"' if preview else ''
    classes = 'btn secondary' if secondary else 'btn'
    title = f' title="{escape(item["note"], quote=True)}"' if item.get('note') else ''
    return f'<a class="{classes}" data-icon="{item.get("icon", "resources")}" href="{href}"{attrs}{title}>{escape(item["label"])}</a>'


def card(item, lesson=False):
    title = escape(item['title'])
    attrs = f' data-lesson="{item["id"]}" id="lesson-{item["id"].replace(".", "-")}"' if lesson else ''
    links = item['links']
    primary = next((x for x in links if x['label'] == 'View Presentation'), None)
    buttons = []
    if primary:
        buttons.append(link(primary, preview=True))
    if lesson:
        buttons.extend(link(x, secondary=True) for x in item.get('textbooks', []))
    other = [x for x in links if x is not primary and not x.get('supplementary')]
    buttons.extend(link(x, secondary=bool(primary or lesson)) for x in other)
    supplementary = [x for x in links if x.get('supplementary')]
    more = ''
    if supplementary:
        more = '<details class="annotated-copy"><summary>Annotated classroom copy</summary>' + ''.join(link(x, True) for x in supplementary) + '</details>'
    if primary:
        more += f'<p class="presentation-fallback"><a href="{escape(primary["href"], quote=True)}">Open presentation in full page ↗</a></p>'
    page_note = ''
    if lesson and item.get('reading_note'):
        page_note = f'<p class="reading-note">{escape(item["reading_note"])}</p>'
    return f'''<section class="topic-card"{attrs}>
  <div class="card-header"><h3>{title}</h3></div>
  <div class="card-content"><p>{escape(item['description'])}</p>
    <div class="btn-container">{''.join(buttons)}</div>{page_note}{more}
  </div>
</section>'''


def group(label, id_, cards):
    return f'<section class="overview-group" aria-labelledby="{id_}"><h2 class="group-title" id="{id_}">{label}</h2><div class="topics-grid">\n' + '\n'.join(cards) + '\n</div></section>'


def material_cards(ch):
    n = ch['number']
    prefix = f'../resources/chapters/{n:02d}/'
    if ch['materials']:
        return [card(x) for x in ch['materials']]
    return [card(x) for x in [
        {'title':'Textbooks', 'description':'Both complete chapter extracts, ready to read or download.', 'links':[
            {'label':'Cambridge Textbook · PDF','href':prefix+'cup-textbook.pdf','icon':'textbook'},
            {'label':'Hodder Textbook · PDF','href':prefix+'hodder-textbook.pdf','icon':'textbook'}]},
        {'title':'Hodder Workbook', 'description':'Chapter exercises and their answers.', 'links':[
            {'label':'Workbook Questions · PDF','href':prefix+'hodder-workbook.pdf','icon':'workbook'},
            {'label':'Workbook Answers · PDF','href':prefix+'hodder-workbook-answers.pdf','icon':'answers'}]},
        {'title':'Syllabus & Resources', 'description':'Learning objectives, revision notes and exam practice.', 'links':[
            {'label':'Chapter Syllabus · PDF','href':prefix+'syllabus.pdf','icon':'syllabus'},
            {'label':'All Chapter Resources','href':f'../resource-library.html#chapter-{n}','icon':'resources'}]}
    ]]


def render(ch):
    n = ch['number']
    title = f'Topic {n}: {ch["title"]}'
    note = '<p class="overview-note">SME &amp; Paper 2 ZNotes · Coming soon</p>' if n >= 7 else ''
    numbering = '<p class="resource-intro">Lesson numbers follow this teaching sequence; the textbook buttons match each lesson’s content.</p>' if n in (1, 2) else ''
    preview = '''<section class="presentation-preview" id="presentation-preview" aria-labelledby="preview-title" hidden>
  <div class="preview-heading"><div><p class="preview-label">PPT &amp; Slides · In-page presentation</p><h2 id="preview-title" tabindex="-1">Presentation</h2></div>
    <button type="button" class="preview-close" data-preview-close aria-label="Close presentation preview">Close ×</button></div>
  <div class="preview-actions"><button type="button" data-preview-fullscreen data-icon="fullscreen">Full screen</button><a href="#lessons" data-preview-open>Open in full page ↗</a></div>
  <p class="preview-status" role="status"></p>
  <iframe title="Lesson presentation" allow="fullscreen" allowfullscreen></iframe>
</section>'''
    return f'''<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)} | IGCS0478</title>
<link rel="stylesheet" href="../assets/topic-overview.css">
<link rel="stylesheet" href="../assets/teaching-hubs.css">
<link rel="stylesheet" href="../assets/resource-icons.css">
<link rel="stylesheet" href="../assets/analytics.css">
<script src="../assets/teaching-hubs.js" defer></script>
<script src="../assets/analytics-config.js" defer></script>
<script src="../assets/analytics.js" defer></script>
</head><body data-topic="{n}">
<a class="skip" href="#main">Skip to content</a>
<header><h1>IGCS0478 Computer Science</h1><p class="subtitle">{escape(title)}</p></header>
<main id="main" class="container">
<a href="../index.html" class="back-link">← Back to Main Topics</a>
{group('Chapter Materials','materials',material_cards(ch))}
{preview}
{numbering}
{group('Lesson Sections · PPT &amp; Textbooks','lessons',[card(x, True) for x in ch['lessons']])}
{group('Revision &amp; Practice','revision',[card(x) for x in ch['extras']]) if ch['extras'] else ''}
{note}
</main><footer><nav aria-label="Resource navigation"><a data-icon="resources" href="../resource-library.html#chapter-{n}">All Chapter Resources</a><a data-icon="resources" href="../resource-library.html">Resource Library</a><a data-icon="exam" href="../past-papers.html">Past Papers</a></nav><p>IGCS0478 · Cambridge IGCSE Computer Science · 2026–2028</p></footer>
</body></html>
'''


def reading_index(ch, prefix):
    rows = []
    for lesson in ch['lessons']:
        cells = []
        for book in lesson['textbooks']:
            pages = ', '.join(str(a) if a == b else f'{a}–{b}' for a, b in book['printed_ranges'])
            name = 'Cambridge' if book['publisher'] == 'cup' else 'Hodder'
            href = prefix + book['href'].removeprefix('../')
            cells.append(f'<td><a data-icon="textbook" href="{escape(href)}">{name} · PDF</a><br><small>pp. {pages}</small></td>')
        href = prefix + ch['overview'] + '#lesson-' + lesson['id'].replace('.', '-')
        rows.append(f'<tr><th scope="row"><a href="{escape(href)}">{escape(lesson["title"])}</a></th>' + ''.join(cells) + '</tr>')
    return dom.fromstring('<details class="panel resource-section" data-coverage-index="true"><summary>Textbooks by lesson · 两套教材小节切片</summary><p>Printed book pages are shown below. Shared boundary pages are retained in full; selected ranges may be joined.</p><div class="table-wrap" style="overflow-x:auto"><table><thead><tr><th>Lesson / PPT</th><th>Cambridge University Press</th><th>Hodder</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table></div></details>')


def update_indexes(chapters):
    targets = [(ROOT/'resource-library.html', chapters, '')]
    targets += [(ROOT/Path(ch['overview']).parent/'resources.html', [ch], '../') for ch in chapters if ch['number'] >= 7]
    for path, included, prefix in targets:
        document = dom.fromstring(path.read_text())
        for old in document.xpath('//*[@data-coverage-index]'):
            old.getparent().remove(old)
        for ch in included:
            parent = document.get_element_by_id(f'chapter-{ch["number"]}' if not prefix else 'main')
            parent.insert(1, reading_index(ch, prefix))
        path.write_text('<!DOCTYPE html>\n' + dom.tostring(document, encoding='unicode', method='html') + '\n')


def retain_viewer_compatibility(chapters):
    for ch in chapters:
        for item in ch['lessons'] + ch['extras']:
            for target in item['links']:
                href = urlsplit(target['href']).path
                if not href.endswith('.html'):
                    continue
                path = ROOT/Path(ch['overview']).parent/href
                if not path.exists():
                    continue
                source = path.read_text()
                if 'class="presentation-slide"' in source and 'presentation-compat.css' not in source:
                    relative = os.path.relpath(ROOT/'assets/presentation-compat.css', path.parent)
                    source = source.replace('</head>', f'<link rel="stylesheet" href="{relative}">\n</head>')
                    path.write_text(source)


def main():
    data = json.loads((ROOT/'resources/teaching-coverage.json').read_text())
    for chapter in data['chapters']:
        (ROOT/chapter['overview']).write_text(render(chapter))
    update_indexes(data['chapters'])
    retain_viewer_compatibility(data['chapters'])
    print(f'Rebuilt {len(data["chapters"])} chapter hubs.')


if __name__ == '__main__':
    main()

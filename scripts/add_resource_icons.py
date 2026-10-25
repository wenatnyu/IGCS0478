"""Add decorative, local SVG icons without changing link text or destinations.

Run after regenerating the static chapter pages. Existing annotations are retained.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import os
import re

ROOT = Path(__file__).resolve().parents[1]


def icon_for(tag, attrs, label):
    if 'data-icon' in attrs or 'skip' in attrs.get('class', '').split():
        return None
    href = unquote(urlsplit(attrs.get('href', '')).path).lower()
    text = ' '.join(label.lower().split())
    ident = attrs.get('id', '')
    controls = {
        'presentation-toggle': 'slides', 'slide-fullscreen': 'fullscreen',
        'slide-answer': 'answers', 'slide-exit': 'list',
        'expand-terms': 'expand', 'collapse-terms': 'collapse',
        'bubble-reset': 'reset', 'array-reset': 'reset',
    }
    if ident in controls:
        return controls[ident]
    # Previous/next already have arrows. Keep a single clear navigation symbol.
    if ident in ('slide-prev', 'slide-next') or re.match(r'^[←→⟵⟶]', text):
        return None
    # The actual resource takes precedence over a general label such as "PDF"
    # or "Classroom glossary". A syllabus subsection can still link to a textbook.
    if href.endswith('past-papers.html'):
        return 'exam'
    if href.endswith(('resource-library.html', 'resources.html')):
        return 'practice' if '#pmt' in attrs.get('href', '') else 'resources'
    if re.search(r'(key.?terms|keyword|definitions|glossary)', href):
        return 'vocabulary'
    if re.search(r'(answers|mark.scheme|(?:^|[_/-])ms(?:[_./-]|$))', href):
        return 'answers'
    if re.search(r'(textbook|/cup-\d|/hodder-\d)', href):
        return 'textbook'
    if 'programming-scenarios' in href:
        return 'practice'
    if re.search(r'(syllabus|conventions|command.words|考纲)', href + ' ' + text):
        return 'syllabus'
    if re.search(r'(answers|mark.scheme|(?:^|[_/-])ms(?:[_./-]|$)|答案)', href + ' ' + text):
        return 'practice' if 'questions' in text or '题目' in text else 'answers'
    if re.search(r'(\.pptx?$|/ppt[^/]*|^ppt-|lesson\.html$)', href) or re.search(r'(presentation|ppt|slides|classroom|课堂)', text):
        return 'slides'
    if re.search(r'(key.?terms|keyword|definitions|glossary|词表|词汇)', href + ' ' + text):
        return 'vocabulary'
    if re.search(r'(workbook|习题册|练习册)', href + ' ' + text):
        return 'workbook'
    if re.search(r'(textbook|课本|教材|/cup-\d|/hodder-\d)', href + ' ' + text):
        return 'textbook'
    if re.search(r'(worksheet|作业)', href + ' ' + text):
        return 'worksheet'
    if re.search(r'(past.papers|/past-papers/|(?:^|[_/])qp[_./]|真题)', href + ' ' + text):
        return 'exam'
    if re.search(r'(question|practice|exercise|quiz|practical|习题|练习)', href + ' ' + text):
        return 'practice'
    if re.search(r'(notes|review|revision|znotes|笔记)', href + ' ' + text):
        return 'notes'
    if re.search(r'(resource|library|catalog|资源)', href + ' ' + text):
        return 'resources'
    if re.search(r'(download|下载|\.zip$|\.pdf$|\.tsv$)', href + ' ' + text):
        return 'download'
    if tag == 'button':
        if re.search(r'(reset|restart|重置)', text): return 'reset'
        if re.search(r'(check|submit|检查|提交)', text): return 'answers'
        if re.search(r'(show all|expand)', text): return 'expand'
        if re.search(r'(hide all|collapse)', text): return 'collapse'
        if re.search(r'(next|compare)', text): return 'next'
        if text == 'grid': return 'grid'
        if text == 'list': return 'list'
    if re.search(r'topic-\d+-overview\.html$', href) or text == 'overview':
        return 'chapter'
    return None


class IconParser(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.starts = [0]
        for match in re.finditer('\n', source):
            self.starts.append(match.end())
        self.edits = []
        self.current = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        if tag in ('a', 'button'):
            line, column = self.getpos()
            self.current = [tag, dict(attrs), '', self.starts[line - 1] + column + len(tag) + 1, False]
        elif self.current and tag in ('svg', 'img', 'i'):
            self.current[4] = True

    def handle_data(self, data):
        if self.current:
            self.current[2] += data

    def handle_endtag(self, tag):
        if self.current and self.current[0] == tag:
            kind = icon_for(*self.current[:3])
            if kind and not self.current[4]:
                self.edits.append((self.current[3], f' data-icon="{kind}"'))
            self.current = None


def main():
    changed = count = 0
    pages = sorted(set(ROOT.glob('*.html')) | set(ROOT.glob('topic-*/*.html')))
    for page in pages:
        source = page.read_text()
        parser = IconParser(source)
        result = source
        for position, addition in reversed(parser.edits):
            result = result[:position] + addition + result[position:]
        if ('data-icon=' in result and 'resource-icons.css' not in result):
            css = os.path.relpath(ROOT / 'assets/resource-icons.css', page.parent)
            result = result.replace('</head>', f'<link rel="stylesheet" href="{css}">\n</head>', 1)
        if result != source:
            page.write_text(result)
            changed += 1
            count += len(parser.edits)
    print(f'Updated {changed} pages with {count} resource and action icons.')


if __name__ == '__main__':
    main()

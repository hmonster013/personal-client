import re

with open('src/app/features/blog-detail/blog-detail.component.scss', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove !important from blog-article-content ::ng-deep .safe-html-content
# and just rely on specificity
content = re.sub(r'font-family: var\(--font-reading\) !important;', 'font-family: var(--font-reading);', content)
content = re.sub(r'font-size: 1\.0625rem !important;', 'font-size: 1.0625rem;', content)
content = re.sub(r'line-height: 1\.7 !important;', 'line-height: 1.7;', content)
content = re.sub(r'color: var\(--text-ink\) !important; // Ink text color', 'color: var(--text-ink); // Ink text color', content)

# Remove !important from pre blocks inside blog-detail (lines 280-285 roughly)
content = re.sub(r'font-family: \'Source Code Pro\', Consolas, Monaco, monospace !important;', 'font-family: \'Source Code Pro\', Consolas, Monaco, monospace;', content)
content = re.sub(r'background-color: var\(--bg-night\) !important;', 'background-color: var(--bg-night);', content)
content = re.sub(r'color: var\(--text-muted\) !important;', 'color: var(--text-muted);', content)
content = re.sub(r'border: 1px solid var\(--ui-border-dark\) !important;', 'border: 1px solid var(--ui-border-dark);', content)
content = re.sub(r'border-radius: 0 !important;', 'border-radius: 0;', content)
content = re.sub(r'font-size: 0\.9rem !important;', 'font-size: 0.9rem;', content)

# Remove !important from pre code inside blog-detail
content = re.sub(r'border: none !important;', 'border: none;', content)
content = re.sub(r'background: none !important;', 'background: none;', content)

# Remove !important from pre * inside blog-detail
content = re.sub(r'font-family: var\(--font-pixel\) !important;', 'font-family: var(--font-pixel);', content)
content = re.sub(r'color: var\(--ui-border-dark\) !important;', 'color: var(--ui-border-dark);', content)

with open('src/app/features/blog-detail/blog-detail.component.scss', 'w', encoding='utf-8') as f:
    f.write(content)

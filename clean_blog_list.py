import re

with open('src/app/features/blog/blog.component.scss', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('!important', '')

with open('src/app/features/blog/blog.component.scss', 'w', encoding='utf-8') as f:
    f.write(content)

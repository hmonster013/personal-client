import re

with open('src/app/shared/components/safe-html-display/safe-html-display.component.scss', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the entire "CRITICAL FIX" block at the end
content = re.sub(r'/\* CRITICAL FIX: Override ALL CSS conflicts for mobile code wrapping \*/.*$', '', content, flags=re.DOTALL)

# 2. Fix the `pre` block
pre_block_regex = r'/\* Force mobile wrapping on small screens - HIGHEST SPECIFICITY \*/\s*@media \(max-width: 768px\) \{.*?\}\s*\}'
content = re.sub(r'/\* Force mobile wrapping on small screens - HIGHEST SPECIFICITY \*/.*?\}\s*\}\s*\}', '', content, flags=re.DOTALL)
content = re.sub(r'@media \(max-width: 768px\) \{\s*white-space: pre-wrap !important;.*?\}\s*\}', '', content, flags=re.DOTALL)
# Just a simpler way: remove all !important related to white-space inside pre
content = re.sub(r'@media \(max-width: 768px\) \{\s*white-space: pre-wrap !important;.*?\}', '', content, flags=re.DOTALL)
# It's getting messy. Let's just remove all lines containing !important
lines = content.split('\n')
new_lines = []
skip = False
for line in lines:
    if 'white-space: pre-wrap !important' in line: continue
    if 'word-wrap: break-word !important' in line: continue
    if 'overflow-wrap: break-word !important' in line: continue
    if 'word-break: break-word !important' in line: continue
    if 'max-width: 100% !important' in line: continue
    
    # We also have those empty media queries now
    new_lines.append(line)

content = '\n'.join(new_lines)

# Remove empty blocks like `&.safe-html-content pre, &.safe-html-content pre * { }`
content = re.sub(r'&\.safe-html-content pre,\s*&\.safe-html-content pre \* \{\s*\}', '', content)
content = re.sub(r'@media \(max-width: 768px\) \{\s*\}', '', content)
content = re.sub(r'/\* Force mobile wrapping on small screens - HIGHEST SPECIFICITY \*/', '', content)
content = re.sub(r'/\* Force mobile wrapping on small screens \*/', '', content)
content = re.sub(r'/\* Override home.component.scss global \* selector \*/', '', content)


# Add max-width 100% to img, iframe, table, pre
table_responsive = """
  /* Images and iframe responsive */
  img, iframe {
    max-width: 100%;
    height: auto;
  }
  
  pre {
    max-width: 100%;
    overflow-x: auto;
  }

  /* Table responsive */
  table {
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    margin: 2em 0;
    border-radius: 8px;
    overflow-x: auto;
    display: block; /* Enable horizontal scrolling */
    white-space: nowrap; /* Prevent content from squishing too much */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
"""

content = content.replace("  /* Tables (if any) */\n  table {\n    width: 100%;\n    border-collapse: collapse;\n    margin: 2em 0;\n    word-wrap: break-word;\n    overflow-wrap: break-word;\n    border-radius: 8px;\n    overflow: hidden;\n    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n  }", table_responsive)

with open('src/app/shared/components/safe-html-display/safe-html-display.component.scss', 'w', encoding='utf-8') as f:
    f.write(content)

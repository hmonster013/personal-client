import re

with open('src/app/shared/components/safe-html-display/safe-html-display.component.scss', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if '!important' in line:
        continue
    new_lines.append(line)

content = "".join(new_lines)

# Now we need to append the missing rules at the end of `.safe-html-content { ... }` block
# But `content` ends with a `}` for `.safe-html-content` and some CRITICAL FIX blocks.
# Let's remove the CRITICAL FIX block completely and cleanly.
fix_idx = content.find('/* CRITICAL FIX')
if fix_idx != -1:
    content = content[:fix_idx]

# And add our responsive styles
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
}
"""

# Replace the original table styles and insert the new ones
content = re.sub(r'  /\* Tables \(if any\) \*/\s*table \{.*?\n  \}', '', content, flags=re.DOTALL)

# Find the last `}` which is for `.safe-html-content`
last_brace = content.rfind('}')
if last_brace != -1:
    content = content[:last_brace] + table_responsive

with open('src/app/shared/components/safe-html-display/safe-html-display.component.scss', 'w', encoding='utf-8') as f:
    f.write(content)

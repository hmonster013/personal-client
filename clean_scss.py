import re

with open('src/app/shared/components/safe-html-display/safe-html-display.component.scss', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the critical fix blocks
content = re.sub(r'/\* CRITICAL FIX: Override ALL CSS conflicts for mobile code wrapping \*/.*$', '', content, flags=re.DOTALL)

# Remove all @media blocks inside pre and pre code that force pre-wrap
content = re.sub(r'@media \(max-width: 768px\) \{\s*white-space: pre-wrap !important;.*?\}', '', content, flags=re.DOTALL)
content = re.sub(r'@media \(max-width: 768px\) \{\s*/\* Override home.component.scss.*?\s*\}\s*\}', '', content, flags=re.DOTALL)

# In fact, let's just find and remove any @media block that contains "white-space: pre-wrap !important;"
while True:
    new_content = re.sub(r'@media \(max-width: 768px\) \{[^{}]*white-space: pre-wrap !important;[^{}]*\}', '', content)
    if new_content == content:
        break
    content = new_content

# Clean up any nested ones
while True:
    new_content = re.sub(r'@media \(max-width: 768px\) \{\s*(?:&[^{]*\{[^{}]*white-space: pre-wrap !important;[^{}]*\})+[^{}]*\}', '', content)
    if new_content == content:
        break
    content = new_content

# Add table responsive styles
table_responsive = """
  /* Images and iframe responsive */
  img, iframe {
    max-width: 100%;
    height: auto;
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

import time
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

v = str(int(time.time()))
old_scripts = '<script src="drawing-primitives.js'
new_scripts = f'<script src="toolbar.js?v={v}"></script>\n    <script src="drawing-primitives.js'

if 'toolbar.js' not in content:
    content = content.replace(old_scripts, new_scripts)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Injected toolbar.js into index.html')

import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()
scripts = re.findall(r'<script[^>]+src="([^"]+)"', content)
for s in scripts:
    print(s)

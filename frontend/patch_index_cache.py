import re
import time

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

v = str(int(time.time()))
content = re.sub(r'src="([^"]+\.js)(?:\?v=[^"]*)?"', r'src="\1?v=' + v + r'"', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched index.html script tags with cache busters')

import re, time

v = str(int(time.time()))

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all ?v=XXXXXXXXXX on local js files with fresh timestamp
content = re.sub(r'((?:toolbar|drawing-primitives|script|lightweight-charts-fallback)\.js)\?v=\d+', 
                 lambda m: m.group(1) + '?v=' + v, content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Updated all cache busters to v={v}')

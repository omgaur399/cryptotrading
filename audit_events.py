import os
import re
import json

directory = 'frontend'

patterns = {
    'addEventListener': re.compile(r'(\w+(?:\.\w+)*)\.addEventListener\s*\(\s*[\'"]([^\'"]+)[\'"]'),
    'removeEventListener': re.compile(r'(\w+(?:\.\w+)*)\.removeEventListener\s*\(\s*[\'"]([^\'"]+)[\'"]'),
    'Observer': re.compile(r'new\s+(ResizeObserver|MutationObserver|IntersectionObserver)'),
    'Network': re.compile(r'new\s+(EventSource|WebSocket)'),
    'Chart_Subscribe': re.compile(r'\.subscribe(CrosshairMove|VisibleTimeRangeChange|Click)'),
    'Chart_Unsubscribe': re.compile(r'\.unsubscribe(CrosshairMove|VisibleTimeRangeChange|Click)'),
    'Interval': re.compile(r'(?:window\.)?setInterval\s*\('),
    'Timeout': re.compile(r'(?:window\.)?setTimeout\s*\('),
    'AnimationFrame': re.compile(r'(?:window\.)?requestAnimationFrame\s*\(')
}

results = []

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.js') and file not in ['script_replaced.js', 'lightweight-charts-fallback.js']:
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for i, line in enumerate(lines):
                        line_stripped = line.strip()
                        if len(line_stripped) > 200:
                            line_stripped = line_stripped[:200] + '...'
                        
                        for cat, regex in patterns.items():
                            matches = regex.findall(line)
                            for match in matches:
                                target = ""
                                event = ""
                                if cat == 'addEventListener' or cat == 'removeEventListener':
                                    target = match[0]
                                    event = match[1]
                                elif cat in ['Observer', 'Network']:
                                    target = "global"
                                    event = match
                                elif cat in ['Chart_Subscribe', 'Chart_Unsubscribe']:
                                    target = "chart"
                                    event = match
                                
                                results.append({
                                    'file': filepath.replace('\\', '/'),
                                    'line': i + 1,
                                    'category': cat,
                                    'target': target,
                                    'event': event,
                                    'code': line_stripped
                                })
            except Exception as e:
                pass

with open('audit_results.json', 'w') as f:
    json.dump(results, f, indent=2)

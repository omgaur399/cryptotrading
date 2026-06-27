import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject script
old_scripts = """    <script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
    <script src="lightweight-charts-fallback.js?v=20260611-2"></script>"""
new_scripts = """    <script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
    <script src="lightweight-charts-fallback.js?v=20260611-2"></script>
    <script src="drawing-primitives.js"></script>"""
content = content.replace(old_scripts, new_scripts)

# 2. Add buttons to toolbar
old_toolbar = """            <button class="toolbar-btn active" data-tool="cursor" title="Cursor / Pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 3 10 21 13 13 21 10 3 3"></polygon></svg>
            </button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-btn" data-tool="hline" title="Horizontal Line (Drawing)">"""

new_toolbar = """            <button class="toolbar-btn active" data-tool="cursor" title="Cursor / Pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 3 10 21 13 13 21 10 3 3"></polygon></svg>
            </button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-btn" data-tool="trendline" title="Trendline">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="4"></line><circle cx="4" cy="20" r="1.5" fill="currentColor"></circle><circle cx="20" cy="4" r="1.5" fill="currentColor"></circle></svg>
            </button>
            <button class="toolbar-btn" data-tool="rectangle" title="Rectangle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
            </button>
            <button class="toolbar-btn" data-tool="fibonacci" title="Fibonacci Retracement">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
            </button>
            <button class="toolbar-btn" data-tool="text" title="Text Annotation">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
            </button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-btn" data-tool="hline" title="Horizontal Line (Drawing)">"""

content = content.replace(old_toolbar, new_toolbar)

content = content.replace('script.js?v=20260620-7', 'script.js?v=20260620-8')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("index.html patched")

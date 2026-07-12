import json

with open('audit_results.json', 'r') as f:
    results = json.load(f)

# Group by Target
global_targets = ['window', 'document', 'document.body', 'global']
global_events = []
other_events = []

for r in results:
    if r['target'] in global_targets or r['category'] in ['Interval', 'Timeout', 'AnimationFrame', 'Observer', 'Network']:
        global_events.append(r)
    else:
        other_events.append(r)

with open('audit_summary.md', 'w') as f:
    f.write("# Global Events and Resources\\n")
    for r in global_events:
        f.write(f"- **{r['file']}:{r['line']}** | `{r['category']}` | Target: `{r['target']}` | Event: `{r['event']}`\\n")
        f.write(f"  - Code: `{r['code']}`\\n")
    
    f.write("\\n# Other DOM/Chart Events\\n")
    for r in other_events:
        f.write(f"- **{r['file']}:{r['line']}** | `{r['category']}` | Target: `{r['target']}` | Event: `{r['event']}`\\n")

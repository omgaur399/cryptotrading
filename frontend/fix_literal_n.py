"""Fix literal backslash-n injection in JS files."""

import re

def fix_file(path):
    with open(path, 'rb') as f:
        content = f.read()
    
    # Replace literal b'\\n' (0x5c 0x6e) that appears at start of line (after \r\n)
    # Pattern: \r\n\\n -> \r\n\r\n (replace with blank line)
    # Also: \\n at start of file -> nothing
    fixed = content.replace(b'\r\n\\n', b'\r\n')
    fixed = fixed.replace(b'\n\\n', b'\n')
    # Also handle if it's at the very start
    if fixed.startswith(b'\\n'):
        fixed = fixed[2:]
    
    if fixed != content:
        with open(path, 'wb') as f:
            f.write(fixed)
        count = content.count(b'\\n') - fixed.count(b'\\n')
        print(f"Fixed {count} literal \\n in {path}")
    else:
        print(f"No literal \\n found in {path}")

fix_file('drawing-primitives.js')
fix_file('script.js')
fix_file('toolbar.js')

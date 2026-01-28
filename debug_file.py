
import sys

if len(sys.argv) < 2:
    print("Usage: python3 debug_file.py <path_to_html>")
    sys.exit(1)

path = sys.argv[1]

with open(path, 'r') as f:
    lines = f.readlines()

depth = 0
for i, line in enumerate(lines):
    line_num = i + 1
    opens = line.count('<div')
    closes = line.count('</div>')
    old_depth = depth
    depth += opens - closes
    
    if opens != closes or '<h3>' in line or '<h4>' in line or '<h2>' in line:
        content = line.strip()[:60]
        print(f"{line_num:4} | {old_depth:2} -> {depth:2} | {content}")

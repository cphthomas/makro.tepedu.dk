
import sys

with open('/Users/thomaspetersen/GIT/makro.tepedu.dk/kapitel1.html', 'r') as f:
    lines = f.readlines()

depth = 0
for i, line in enumerate(lines):
    line_num = i + 1
    # Count <div but ignore <div class="table... or others if they close on same line
    # Actually just count all divs
    opens = line.count('<div')
    closes = line.count('</div>')
    
    if opens > 0 or closes > 0:
        old_depth = depth
        depth += opens - closes
        # Check if depth changed across a heading
        if '<h3>' in line or '<h4>' in line or '<h2>' in line:
            print(f"Line {line_num}: Heading found at depth {old_depth}. Content: {line.strip()}")
        
        # print(f"Line {line_num}: Depth {depth} (O:{opens}, C:{closes})")
    elif '<h3>' in line or '<h4>' in line or '<h2>' in line:
        print(f"Line {line_num}: Heading found at depth {depth}. Content: {line.strip()}")



import sys

with open('/Users/thomaspetersen/GIT/makro.tepedu.dk/kapitel1.html', 'r') as f:
    lines = f.readlines()

depth = 0
print("Line | Depth | Change | Content")
print("--------------------------------")
for i, line in enumerate(lines):
    line_num = i + 1
    opens = line.count('<div')
    closes = line.count('</div>')
    
    if opens > 0 or closes > 0:
        old_depth = depth
        depth += opens - closes
        if '<h3>' in line or '<h4>' in line or 'h2' in line:
             print(f"{line_num:4} | {old_depth:5} | {opens-closes:6} | {line.strip()}")
        elif opens != closes:
             # Only print div changes if they are significant or near headings
             if line_num > 140 and line_num < 350:
                 print(f"{line_num:4} | {old_depth:5} | {opens-closes:6} | {line.strip()[:50]}")
    elif '<h3>' in line or '<h4>' in line or 'h2' in line:
        print(f"{line_num:4} | {depth:5} | {0:6} | {line.strip()}")

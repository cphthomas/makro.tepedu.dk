
with open('/Users/thomaspetersen/GIT/makro.tepedu.dk/kapitel1.html', 'r') as f:
    lines = f.readlines()

depth = 0
for i, line in enumerate(lines):
    line_num = i + 1
    opens = line.count('<div')
    closes = line.count('</div>')
    old_depth = depth
    depth += opens - closes
    
    # Print every line where depth changes or a heading exists
    if opens != closes or '<h3>' in line or '<h4>' in line or '<h2>' in line:
        print(f"{line_num:4} | {old_depth:2} -> {depth:2} | {line.strip()[:60]}")

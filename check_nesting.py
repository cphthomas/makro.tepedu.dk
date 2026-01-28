
from bs4 import BeautifulSoup

path = '/Users/thomaspetersen/GIT/makro.tepedu.dk/kapitel1.html'
with open(path, 'r') as f:
    soup = BeautifulSoup(f, 'html.parser')

bad_headings = []
for h in soup.find_all(['h2', 'h3', 'h4']):
    # Check if any parent has class 'info-box'
    parent = h.parent
    while parent:
        if parent.name == 'div' and 'info-box' in parent.get('class', []):
            bad_headings.append(h)
            break
        parent = parent.parent

if not bad_headings:
    print("No headings found inside info-boxes.")
else:
    for h in bad_headings:
        print(f"Found {h.name} inside info-box: {h.text[:50]}")

# Also check for unclosed divs or extra closes
# BeautifulSoup automatically fixes them, so we can compare the counts.
import re
with open(path, 'r') as f:
    content = f.read()
    opens = len(re.findall(r'<div', content))
    closes = len(re.findall(r'</div>', content))
    print(f"Total opens: {opens}, Total closes: {closes}")

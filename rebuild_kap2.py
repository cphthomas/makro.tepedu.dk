
import re
import sys

path = '/Users/thomaspetersen/GIT/makro.tepedu.dk/kapitel2.html'
with open(path, 'r') as f:
    content = f.read()

# Find article content
match = re.search(r'(<article>.*?</article>)', content, re.DOTALL)
if not match:
    print("No article found")
    sys.exit(1)

article_content = match.group(1)

# Split by headings
# We support h1-h4
parts = re.split(r'(<(?:h1|h2|h3|h4).*?>)', article_content, flags=re.IGNORECASE)

new_article = parts[0] # Usually just <article> and some meta

for i in range(1, len(parts), 2):
    heading = parts[i]
    body = parts[i+1] if i+1 < len(parts) else ""
    
    # Clean the body: remove leading/trailing info-box divs and empty space
    # We want to keep internal divs like table-responsive
    
    # Remove any number of leading <div class="info-box..."> and trailing </div>
    # but only if they are the VERY first and VERY last tokens (ignoring whitespace)
    
    body = body.strip()
    
    # Repeatedly strip outer info-box divs
    while True:
        changed = False
        # Match <div class="info-box..."> ... </div>
        # Use a non-greedy match for the content but ensure the </div> is at the end
        m = re.match(r'^<div\s+class="info-box[^"]*">\s*(.*)\s*</div>$', body, re.DOTALL)
        if m:
            body = m.group(1).strip()
            changed = True
        else:
            break
            
    # Also remove any lone <div class="info-box"> at the start if it was left over
    body = re.sub(r'^<div\s+class="info-box[^"]*">', '', body).strip()
    # And trailing </div>
    # But be careful: a trailing </div> might belong to an internal div.
    # We'll rely on the depth count for the main fix.
    
    new_article += heading + '\n'
    # Only wrap in info-box if it's not a Quiz heading or something special
    if "Quiz" not in heading and "h1" not in heading:
        new_article += '<div class="info-box">\n' + body + '\n</div>\n'
    else:
        new_article += body + '\n'

# If the last </div> of the article was stripped, add it back
if not new_article.endswith('</article>'):
    # Ensure we don't double add it if it's already there
    if not re.search(r'</article>\s*$', new_article):
         new_article += '</article>'

# Replace the article in the original content
# Use a placeholder to avoid regex issues with large content
placeholder = "@@@ARTICLE_PLACEHOLDER@@@"
output = re.sub(r'<article>.*?</article>', placeholder, content, flags=re.DOTALL)
output = output.replace(placeholder, new_article)

with open(path, 'w') as f:
    f.write(output)

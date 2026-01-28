
import re

path = '/Users/thomaspetersen/GIT/makro.tepedu.dk/kapitel2.html'
with open(path, 'r') as f:
    content = f.read()

# Fix 1: Ensure article is closed correctly at the end
# Fix 2: Flatten info-boxes that contain headings
# Fix 3: Ensure each heading has an info-box following it if it's meant to have one.

# Let's find the article content
article_match = re.search(r'(<article>.*?</article>)', content, re.DOTALL)
if article_match:
    original_article = article_match.group(1)
    
    # Process the article content
    # Remove existing info-box wrappers that wrap headings
    # We want: <h3>...</h3> <div class="info-box">...content...</div>
    
    # 1. Temporarily remove info-box openings and closings to see the structure
    # Actually, let's just use the headings as markers.
    
    sections = re.split(r'(<(?:h2|h3|h4).*?>)', original_article)
    new_article_parts = [sections[0]] # Everything before the first heading
    
    for i in range(1, len(sections), 2):
        heading = sections[i]
        body = sections[i+1] if i+1 < len(sections) else ""
        
        # Clean the body: remove leading/trailing extra divs
        body = body.strip()
        # Remove any leading <div class="info-box"> or trailing </div>
        # But be careful not to remove internal divs
        
        # Simple approach: Wrap everything between headings in an info-box 
        # unless it's already structured well.
        # But many sections have multiple divs.
        
        # Let's just fix the known bad parts.
        new_article_parts.append(heading)
        new_article_parts.append('\n<div class="info-box">\n' + body + '\n</div>\n')
    
    # This might be too aggressive if there are already divs.
    # Let's stick to the current structure and just balance it.

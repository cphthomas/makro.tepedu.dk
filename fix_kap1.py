
import re

def fix_html(content):
    # Find the article content
    match = re.search(r'(<article>.*?</article>)', content, re.DOTALL)
    if not match:
        return "Article not found"
    
    article_content = match.group(1)
    
    # 1. Strip existing info-box divs but keep content
    # We do this carefully to avoid stripping other divs
    # Replace <div class="info-box"> with nothing
    article_content = re.sub(r'<div class="info-box">', '', article_content)
    # Replace accompanying </div> tags. 
    # This is tricky because there are other divs like table-responsive.
    # However, standard info-boxes I've been adding are flat.
    
    # Actually, a better way is to identify headings and wrap everything between them.
    # First, let's normalize the article content by removing my previous info-box attempts.
    # I'll look for specific patterns I added.
    
    # Let's try a different approach:
    # We know all headings H2, H3, H4 should be at the top level of the article.
    # And everything else should be in an info-box.
    
    # Extract all headings and their positions
    headings = list(re.finditer(r'<(h2|h3|h4).*?>.*?</\1>', article_content, re.IGNORECASE | re.DOTALL))
    
    new_article = '<article>\n'
    # Start with the hidden H1 and book cover
    # Find H1 and cover
    prefix_match = re.search(r'(<h1.*?>.*?</h1>.*?<div class="book-cover-wrapper">.*?</div>)', article_content, re.DOTALL)
    if prefix_match:
        new_article += prefix_match.group(1) + '\n'
        last_pos = prefix_match.end()
    else:
        last_pos = 0

    # Iterate through headings
    for i, h_match in enumerate(headings):
        # The content BETWEEN the previous heading (or start) and this one
        between_content = article_content[last_pos:h_match.start()].strip()
        
        # Clean between_content of existing info-box wrappers
        between_content = re.sub(r'</?div class="info-box">', '', between_content) # This is wrong regex but you get it
        # Actually, let's just strip <div class="info-box"> and the matching </div>
        # Since I know I added them as blocks:
        between_content = between_content.replace('<div class="info-box">', '').replace('</div>\n                    </div>', '</div>').replace('</div>\n                </div>', '</div>')
        # This is getting messy. 
        
        if between_content and not between_content.isspace():
            # Wrap in info-box
            # But wait, avoid wrapping <br> or other spacers
            if len(between_content) > 20: 
                new_article += '                <div class="info-box">\n                    ' + between_content + '\n                </div>\n'
            else:
                new_article += '                ' + between_content + '\n'
        
        # Add the heading
        new_article += '                ' + h_match.group(0) + '\n'
        last_pos = h_match.end()
        
    # Final content
    final_between = article_content[last_pos:].strip()
    if final_between and not final_between.isspace():
        # Remove the closing </article> if it was caught
        final_between = final_between.replace('</article>', '')
        new_article += '                <div class="info-box">\n                    ' + final_between + '\n                </div>\n'
    
    new_article += '            </article>'
    
    return new_article

# Let's just do it manually for the first half to be safe.

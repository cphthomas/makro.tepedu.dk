import re
import os

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find the podcast-section and quiz-container blocks
    # We want to find these blocks and then within them, remove the legal-term spans
    
    def remove_legal_terms(match):
        block_content = match.group(0)
        # Regex to match the span and capture its content
        cleaned_block = re.sub(r'<span class="legal-term"[^>]*>(.*?)</span>', r'\1', block_content)
        return cleaned_block

    # Replace within podcast-section
    new_content = re.sub(r'<div class="podcast-section">.*?</div>\s*</div>', remove_legal_terms, content, flags=re.DOTALL)
    
    # Replace within quiz-container
    # Note: quiz-container might be nested or standalone
    new_content = re.sub(r'<div class="quiz-container">.*?</div>', remove_legal_terms, new_content, flags=re.DOTALL)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

for i in range(1, 9):
    filename = f'kapitel{i}.html'
    if os.path.exists(filename):
        if clean_file(filename):
            print(f"Cleaned {filename}")
        else:
            print(f"No changes needed for {filename}")

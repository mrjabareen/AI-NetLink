# © 2026 NetLink. All Rights Reserved.
# Developer: Muhammad Rateb Jabarin
# Website: aljabareen.com
# Contact: admin@aljabareen.com | +970597409040

import os

root_dir = r'c:\Users\aljabareen\Desktop\AI NetLink'

# خريطة التبديل النهائية
replacements = {
    'NetLink Enterprise DB': 'NetLink Enterprise DB',
    'AI NetLink': 'AI NetLink'
}

def final_rename_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        for old, new in replacements.items():
            content = content.replace(old, new)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
    return False

files_updated = 0
for root, dirs, files in os.walk(root_dir):
    for name in files:
        if name.endswith(('.json', '.py', '.md', '.txt')):
            if final_rename_in_file(os.path.join(root, name)):
                files_updated += 1

print(f"FINAL SUCCESS: Re-branded {files_updated} files to final naming scheme.")

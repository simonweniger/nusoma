import os
import re

root_dir = '/Users/vonweniger/GitHub/nusoma/apps/dashboard'

# Extensions to process for text replacement
# Excluding binary files and build artifacts if possible, though sed/regex is usually fine.
EXTENSIONS = {'.ts', '.tsx', '.json', '.md', '.css', '.js', '.jsx'}

def replace_text(content):
    # Order matters: plural first
    content = content.replace('contacts', 'documents')
    content = content.replace('Contacts', 'Documents')
    content = content.replace('contact', 'document')
    content = content.replace('Contact', 'Document')
    return content

def rename_item(old_path):
    dirname, basename = os.path.split(old_path)
    
    new_basename = basename
    new_basename = new_basename.replace('contacts', 'documents')
    new_basename = new_basename.replace('Contacts', 'Documents')
    new_basename = new_basename.replace('contact', 'document')
    new_basename = new_basename.replace('Contact', 'Document')
    
    if new_basename != basename:
        new_path = os.path.join(dirname, new_basename)
        return new_path
    return None

# Step 1: Replace text in all files
print("Replacing text in files...")
for root, dirs, files in os.walk(root_dir):
    if '.next' in root or 'node_modules' in root:
        continue
    for file in files:
        if any(file.endswith(ext) for ext in EXTENSIONS):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                new_content = replace_text(content)
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated content in: {file_path}")
            except Exception as e:
                print(f"Error processing {file_path}: {e}")

# Step 2: Rename files and directories
# We must do this bottom-up to avoid issues with parent directories being renamed before children
print("\nRenaming files and directories...")
for root, dirs, files in os.walk(root_dir, topdown=False):
    if '.next' in root or 'node_modules' in root:
        continue
    
    # Rename files
    for file in files:
        old_path = os.path.join(root, file)
        new_path = rename_item(old_path)
        if new_path:
            os.rename(old_path, new_path)
            print(f"Renamed file: {old_path} -> {new_path}")
            
    # Rename directories
    for d in dirs:
        old_path = os.path.join(root, d)
        new_path = rename_item(old_path)
        if new_path:
            os.rename(old_path, new_path)
            print(f"Renamed directory: {old_path} -> {new_path}")

print("\nDone!")

import os
import re

def cleanup_files(directory):
    # Regex to find console.log(...) and debugger;
    # Handles multi-line console.log and various spacings.
    log_pattern = re.compile(r'console\.log\([^)]*\);?', re.DOTALL)
    debugger_pattern = re.compile(r'debugger;?', re.DOTALL)

    for root, dirs, files in os.walk(directory):
        # Exclude node_modules and scripts
        if 'node_modules' in root or 'scripts' in root:
            continue
            
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = log_pattern.sub('', content)
                new_content = debugger_pattern.sub('', new_content)
                
                if new_content != content:
                    print(f"Cleaning: {path}")
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

if __name__ == "__main__":
    src_dir = r"c:\Users\lynco\OneDrive\Documentos\-Projetos\Mikrogestor.com\src"
    cleanup_files(src_dir)

import os
import re

def update_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Color Replacements
    content = content.replace('bg-indigo-600', 'bg-black')
    content = content.replace('hover:bg-indigo-700', 'hover:bg-gray-900')
    content = content.replace('text-indigo-600', 'text-black')
    content = content.replace('text-indigo-700', 'text-black')
    content = content.replace('hover:text-indigo-600', 'hover:text-gray-600')
    content = content.replace('hover:text-indigo-500', 'hover:text-gray-600')
    content = content.replace('focus:ring-indigo-500', 'focus:ring-black')
    content = content.replace('border-indigo-600', 'border-black')
    content = content.replace('border-indigo-500', 'border-gray-900')
    content = content.replace('text-indigo-400', 'text-gray-900')
    content = content.replace('text-indigo-500', 'text-gray-900')
    content = content.replace('bg-indigo-100', 'bg-gray-100')
    content = content.replace('bg-indigo-50', 'bg-gray-50')
    content = content.replace('hover:bg-indigo-50', 'hover:bg-gray-100')
    content = content.replace('bg-indigo-900', 'bg-black')

    # Fresha Button shape (pill shape for primary buttons)
    # Most primary buttons had px-4 py-2 rounded-lg font-medium, let's just do a specific replace if needed,
    # but rounded-lg is fine. To make it more Fresha, let's swap rounded-xl and rounded-lg on primary buttons to rounded-full
    content = re.sub(r'bg-black text-white px-(\d+) py-(\d+) rounded-(xl|lg|md)', r'bg-black text-white px-\1 py-\2 rounded-full', content)
    content = re.sub(r'bg-black text-white font-medium py-(\d+) rounded-(xl|lg|md)', r'bg-black text-white font-medium py-\1 rounded-full', content)
    content = re.sub(r'bg-black text-white font-bold py-(\d+) rounded-(xl|lg|md)', r'bg-black text-white font-bold py-\1 rounded-full', content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    src_dir = '/home/syed-omar-maqsood/portfolio/fresha/frontend/src'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                update_file(os.path.join(root, file))

if __name__ == '__main__':
    main()

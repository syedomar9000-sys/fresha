import os

def update_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Apply dark mode to components
    replacements = {
        'bg-white': 'bg-[#1A1C1E]',
        'bg-gray-50': 'bg-[#101113]',
        'bg-gray-100': 'bg-[#2C2D30]',
        'bg-gray-200': 'bg-[#2C2D30]',
        'text-gray-900': 'text-white',
        'text-gray-800': 'text-gray-200',
        'text-gray-700': 'text-gray-300',
        'text-gray-600': 'text-gray-400',
        'text-gray-500': 'text-gray-400',
        'text-black': 'text-white',
        'border-gray-100': 'border-[#2C2D30]',
        'border-gray-200': 'border-[#2C2D30]',
        'border-gray-300': 'border-[#2C2D30]',
        'bg-black': 'bg-white text-black', # Invert primary buttons
        'text-white': 'text-[#101113]', # Be careful with this, maybe skip it
    }

    content = content.replace('bg-white', 'bg-[#1A1C1E]')
    content = content.replace('bg-gray-50', 'bg-[#101113]')
    content = content.replace('bg-gray-100', 'bg-[#2C2D30]')
    content = content.replace('bg-gray-200', 'bg-[#2C2D30]')
    content = content.replace('text-gray-900', 'text-white')
    content = content.replace('text-gray-800', 'text-gray-200')
    content = content.replace('text-gray-700', 'text-gray-300')
    content = content.replace('text-gray-600', 'text-gray-400')
    content = content.replace('text-gray-500', 'text-gray-400')
    content = content.replace('text-black', 'text-white')
    content = content.replace('border-gray-100', 'border-[#2C2D30]')
    content = content.replace('border-gray-200', 'border-[#2C2D30]')
    content = content.replace('border-gray-300', 'border-[#2C2D30]')

    # Handle primary black buttons and turn them into primary white buttons for dark mode
    content = content.replace('bg-black text-white', 'bg-[#635BFF] text-white')
    content = content.replace('text-[#101113]', 'text-white') # Revert if text-white was messed up

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    src_dir = '/home/syed-omar-maqsood/portfolio/fresha/frontend/src/components'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('Tab.tsx'):
                update_file(os.path.join(root, file))

if __name__ == '__main__':
    main()

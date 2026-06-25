from pathlib import Path
root = Path(r'D:\project\roadhelp')
path = root / 'src' / 'components' / 'ui' / 'button.tsx'
text = path.read_text(encoding='utf-8')
text = text.replace('import { cva, type VariantProps } from "class-variance-authority"\n\nimport { cn } from "@/lib/utils"\n\nconst buttonVariants = cva(', 'import { type VariantProps } from "class-variance-authority"\n\nimport { cn } from "@/lib/utils"\nimport { buttonVariants } from "@/components/ui/button-variants"\n\n')
start = text.find('const buttonVariants = cva(')
marker = text.find('export interface ButtonProps')
if start != -1 and marker != -1 and marker > start:
    text = text[:start] + text[marker:]
text = text.replace('import { buttonVariants } from "@/components/ui/button-variants"\n\n\nexport interface ButtonProps', 'import { buttonVariants } from "@/components/ui/button-variants"\n\nexport interface ButtonProps')
text = text.replace('export { Button, buttonVariants }', 'export { Button }')
path.write_text(text, encoding='utf-8')

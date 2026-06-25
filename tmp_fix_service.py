from pathlib import Path
import re

root = Path(r'D:\project\roadhelp')

path = root / 'src' / 'types' / 'index.ts'
text = path.read_text(encoding='utf-8')
text = text.replace("  | 'electricalIssue'\r\n  | 'other';", "  | 'electricalIssue'\r\n  | 'otherService'\r\n  | 'other';")
text = text.replace("  | 'electricalIssue'\n  | 'other';", "  | 'electricalIssue'\n  | 'otherService'\n  | 'other';")
path.write_text(text, encoding='utf-8')

path = root / 'src' / 'lib' / 'constants.ts'
text = path.read_text(encoding='utf-8')
text = re.sub(r"\n  \{\n    id: 'other',\n    name: 'Other Services',\n    icon: 'Wrench',\n    basePrice: 20,\n    maxPrice: 100,\n    description: 'Share the issue and we will match the right help\.',\n    isActive: true,\n  \},", "\n  {\n    id: 'otherService',\n    name: 'Other Service',\n    icon: 'Wrench',\n    basePrice: 20,\n    maxPrice: 100,\n    description: 'Share the issue and we will match the right help.',\n    isActive: true,\n  },\n  {\n    id: 'other',\n    name: 'Other',\n    icon: 'Wrench',\n    basePrice: 20,\n    maxPrice: 100,\n    description: 'Legacy alias for other service requests.',\n    isActive: false,\n  },", text, count=1)
text = text.replace("  { value: 'electricalIssue', label: 'Electrical Issue' },\n  { value: 'other', label: 'Other Services' },", "  { value: 'electricalIssue', label: 'Electrical Issue' },\n  { value: 'otherService', label: 'Other Service' },")
text = text.replace("  { value: 'electricalIssue', label: 'Electrical Issue' },\r\n  { value: 'other', label: 'Other Services' },", "  { value: 'electricalIssue', label: 'Electrical Issue' },\r\n  { value: 'otherService', label: 'Other Service' },")
path.write_text(text, encoding='utf-8')

path = root / 'src' / 'lib' / 'utils.ts'
text = path.read_text(encoding='utf-8')
text = text.replace("    electricalIssue: 'Electrical Issue',\n    otherService: 'Other Service',\n    other: 'Other Services',", "    electricalIssue: 'Electrical Issue',\n    otherService: 'Other Service',\n    other: 'Other Service',")
path.write_text(text, encoding='utf-8')

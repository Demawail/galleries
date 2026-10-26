from pathlib import Path
import json
root=Path(__file__).resolve().parent
c=json.loads((root/'brand.json').read_text())
pairs={'Your Studio':c['studioName'],'Your Photographer':c['photographerName'],'https://studio.example.invalid':c['publicOrigin'].rstrip('/'),'https://galleries.example.invalid':c['galleryOrigin'].rstrip('/'),'owner@example.invalid':c['email'],'newsletter@example.invalid':c['newsletterFrom']}
if any('.invalid' in v for v in c.values()):raise SystemExit('Fill in every brand.json value before configuring.')
for folder in ['website','galleries','lightroom']:
 for p in (root/folder).rglob('*'):
  if p.is_file() and not any(x in p.parts for x in ['node_modules','dist','.git','.wrangler']):
   try:s=p.read_text()
   except UnicodeError:continue
   for a,b in pairs.items():s=s.replace(a,b)
   p.write_text(s)
print('Brand configuration applied. Review remaining Photographer labels with your assistant.')

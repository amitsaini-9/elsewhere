import json,urllib.request,pathlib
root=pathlib.Path('/root/elsewhere')
payload={'mode':'video','prompt':'A calm cinematic locked-off shot of a sunlit beech woodland, a narrow clear stream flowing over mossy stones in foreground, soft leafy branches moving slowly in a light breeze, shifting shafts of golden light through the tall trunks. Immersive peaceful nature film, muted sage greens, rich moss, warm ivory sunshine, natural realism with filmic grain, premium outdoor editorial style. Wide landscape 16:9. Almost static camera, only water and leaves move. No people, no cuts, no text, no logos, no music, no speech. Loop gracefully.'}
(root/'creative'/'forest-film-prompt.json').write_text(json.dumps(payload,indent=2))
req=urllib.request.Request('https://agent-platform-api-amit-wqegdna3ra-uc.a.run.app',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
with urllib.request.urlopen(req,timeout=570) as response:r=json.load(response)
(root/'creative'/'forest-film-response.json').write_text(json.dumps(r,indent=2))
if not r.get('video_url'):raise RuntimeError('Video not returned')
urllib.request.urlretrieve(r['video_url'],root/'public'/'media'/'forest-film.mp4')
print('Forest film saved')

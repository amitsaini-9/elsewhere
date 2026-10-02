import concurrent.futures,json,urllib.request,pathlib
root=pathlib.Path('/root/elsewhere')
endpoint='https://agent-platform-api-amit-wqegdna3ra-uc.a.run.app'
style='Premium outdoor editorial campaign, natural film photography, very fine grain, beautifully controlled highlights, muted sage greens and warm cream light, authentic natural textures. No text, no logo, no watermark, no UI, no buildings.'
jobs=[
('hero','image','16:9','A vast cinematic landscape composition of lush emerald rolling coastal hills, a slender serpentine walking path winding from the lower center into the distance, a calm blue sea visible on the far right, soft golden early morning sun and low gauzy mist in the valley. Tiny lone walker with an ochre backpack near the lower middle. Strong visual depth with foreground grasses, rounded middle-distance hills and distant hazy ridge. Upper third softly luminous pale sky. Shot with a 35mm lens from a low aerial perspective. Rich but softly natural color, an invitation to leave the screen. '+style),
('forest','image','4:5','An intimate editorial photograph looking down a beautiful narrow woodland path into deep lush ferns and tall elegant beech trees. Golden beams of late-afternoon light falling across the empty soft dirt path. Gentle mist and fresh moss. Eye-level 50mm lens, photographic authenticity, no people. A calm nearby woodland rather than enormous wild wilderness. '+style),
('coast','image','4:5','An editorial landscape photograph of a sunlit chalky coastal cove seen from a grassy footpath above it. Soft azure sea, waves creating delicate white lace, honey-colored beach below, windswept grasses in foreground. A tiny person sitting on the ridge near the path far away. Warm breezy late afternoon. Natural sophisticated color palette, sense of wide open breathing room, 50mm lens. '+style),
('hills','image','4:5','An editorial photograph of soft green countryside hills in golden evening light. A narrow walking trail runs up through pale wild grasses and tiny white wildflowers toward a rounded hilltop. One small walker in a burnt orange jacket seen from behind at a distance. Peaceful accessible rolling meadow landscape, long soft shadows, pale sky. Shot on 50mm film lens. '+style),
('hero-film','video','16:9','A slow cinematic aerial drift forward over lush green rounded coastal hills, following a narrow serpentine footpath toward distant misty ridges. Calm blue sea glimpsed on the far right, foreground meadow grasses moving gently in breeze, warm early morning sunlight. Premium outdoor travel editorial film, muted sage and forest greens, realistic cinematic photography, calm contemplative pacing. No cuts, no sudden camera motion, no text, no logos, no music, no talking, no buildings. Wide landscape 16:9. The clip should loop gracefully with nearly static camera and gentle organic motion.')]
(root/'creative'/'prompts.json').write_text(json.dumps([dict(name=n,mode=m,aspect_ratio=a,prompt=p) for n,m,a,p in jobs],indent=2))
def run(job):
 name,mode,aspect,prompt=job
 payload={'mode':mode,'model':'pro','aspect_ratio':aspect,'prompt':prompt}
 req=urllib.request.Request(endpoint,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=570) as r:result=json.load(r)
  (root/'creative'/f'{name}-response.json').write_text(json.dumps(result,indent=2))
  urls=result.get('image_urls',[]) if mode=='image' else [result.get('video_url')]
  if not urls or not urls[0]:raise RuntimeError('No media returned: '+str(result)[:250])
  ext='mp4' if mode=='video' else 'png'
  urllib.request.urlretrieve(urls[0],root/'public'/'media'/f'{name}.{ext}')
  print(name+' saved',flush=True)
 except Exception as e:print(name+' ERROR '+str(e),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(run,jobs))

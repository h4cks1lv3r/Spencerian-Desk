"""Reviewed local corrections to source-derived capital centerlines.
All coordinates are native crop pixels. See README for source comparisons.
"""
from pathlib import Path
import re,json,subprocess,xml.etree.ElementTree as ET
import numpy as np
from PIL import Image,ImageDraw
O=Path(__file__).resolve().parents[1]/'build/capital-proofs'
NS='{http://www.w3.org/2000/svg}'
ET.register_namespace('',NS[1:-1])
GUIDES={'c01':[15,40,64,85],'c02':[13,38,63,87],'c03':[12,37,61,86],'c04':[11,36,60,85],'c05':[10,34,59,83],'c06':[11,36,61,86],'c07':[9,34,59,83],'c08':[17,42,67,91],'c10':[12,35,60,84]}
for i in range(1,11):
 name=f'c{i:02}';root=ET.parse(O/f'{name}-centerline.svg').getroot();g=list(root)[1]
 def find(start):
  return next(p for p in g if p.attrib.get('d','').startswith(start))
 if name=='c03':
  p=find('M 394.661');p.set('d',p.attrib['d']+' C 358.0,86.5 354.0,90.2 350.352,93.669')
 if name=='c04':
  p=find('M 189.677');p.set('d',p.attrib['d'].replace('M 189.677,71.005','M 212.667,61.002 C 205.9,61.4 197.8,67.6 189.677,71.005'))
  g.remove(find('M 212.667'))
 if name=='c05':
  g.remove(find('M 125.334'))
  find('M 147.025').set('d','M 147.025,13.674 C 130.0,35.5 111.5,61.0 93.332,83.336')
  find('M 114.785').set('d','M 116.0,54.437 C 107.1,54.008 103.386,60.751 106.023,70.911 C 110.0,76.0 127.0,68.0 137.653,58.006')
 if name=='c06':g.remove(find('M 54.666'))
 if name=='c09':
  ET.SubElement(root,NS+'ellipse',{'cx':'109.5','cy':'24.5','rx':'1.15','ry':'.62','fill':'#20362d','transform':'rotate(-25 109.5 24.5)'})
 if name=='c10':
  p=find('M 132.701');p.set('d',p.attrib['d'].replace('M 132.701,37.680','M 142.344,26.661 C 139.1,30.15 135.65,34.1 132.701,37.680'))
  p=find('M 249.663');p.set('d',p.attrib['d']+' C 199.5,81.5 202.2,82.8 205.717,83.364')
 # Fresh geometric rules replace engraving dots; measured source row positions
 # are fit to a regular four-rule lattice, without lettering or page texture.
 if name in GUIDES:
  _,_,vw,vh=map(float,root.attrib['viewBox'].split());w=vw-16
  slope,intercept=np.polyfit(np.arange(4),GUIDES[name],1)
  rules=ET.Element(NS+'g',{'stroke':'#d2caba','stroke-width':'.32','stroke-dasharray':'1.1 2.8','fill':'none'})
  for j in range(4):ET.SubElement(rules,NS+'path',{'d':f'M 0,{intercept+j*slope:.2f} H {w}'})
  root.insert(1,rules)
 final=O/f'capital-{name}.svg';ET.ElementTree(root).write(final,encoding='utf-8',xml_declaration=True)
 subprocess.run(['rsvg-convert','-w','1500',str(final),'-o',str(final.with_suffix('.png'))],check=True)
canvas=Image.new('RGB',(1200,1700),'white');draw=ImageDraw.Draw(canvas)
for i in range(1,11):
 name=f'c{i:02}';im=Image.open(O/f'capital-{name}.png');im.thumbnail((1140,140));draw.text((15,(i-1)*170+3),name,fill='black');canvas.paste(im,(20,(i-1)*170+25))
canvas.save(O/'contact.png')
print('Created final 10 capital proofs')

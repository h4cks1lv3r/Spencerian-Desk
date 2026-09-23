"""Make a clean review sheet from the app's actual specimen and signature SVGs.
Requires rsvg-convert and Node.js on PATH. No page photos are embedded.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import subprocess,json,argparse
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'app/src/main/assets'
NS='http://www.w3.org/2000/svg';ET.register_namespace('',NS)
INK='#20362d';MUTED='#6b6d63';BORDER='#ded8c9'

def el(parent,tag,attrs,content=None):
 node=ET.SubElement(parent,'{'+NS+'}'+tag,{k:str(v) for k,v in attrs.items()});node.text=content;return node

def text(root,x,y,value,size=20,font='sans-serif',color=INK):
 return el(root,'text',{'x':x,'y':y,'font-family':font,'font-size':size,'fill':color},value)

def specimen(root,file,x,y,w,h):
 sub=ET.parse(file).getroot();sub.set('x',str(x));sub.set('y',str(y));sub.set('width',str(w));sub.set('height',str(h));sub.set('preserveAspectRatio','xMidYMid meet');root.append(sub)

def card(root,x,y,w,h,number,title,note):
 el(root,'rect',{'x':x,'y':y,'width':w,'height':h,'rx':3,'fill':'white','stroke':BORDER,'stroke-width':1.2})
 text(root,x+26,y+37,f'{number}  ·  {title}',20)
 text(root,x+26,y+h-21,note,16,color=MUTED)

def signature_svg(name):
 code='''const fs=require('fs'),vm=require('vm');
const context={};context.window=context;
for(const file of ['zaner-glyphs.js','signature.js']) vm.runInNewContext(fs.readFileSync(process.argv[1]+'/'+file,'utf8'),context);
process.stdout.write(context.SignatureLab.render(process.argv[2],{slant:50,spacing:0.88,capitalScale:1.1,flourish:1,seed:24,background:'#ffffff',ink:'#20362d'}));'''
 return subprocess.run(['node','-e',code,str(ASSETS),name],check=True,text=True,capture_output=True).stdout

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--rsvg',default='rsvg-convert');parser.add_argument('--name',default='Reuben Royal');args=parser.parse_args()
 out=ROOT/'output';out.mkdir(exist_ok=True)
 atlas=json.loads((ASSETS/'atlas.json').read_text());models={e['id']:e for e in atlas['examples']}
 root=ET.Element('{'+NS+'}svg',{'width':'1600','height':'1820','viewBox':'0 0 1600 1820'})
 el(root,'rect',{'width':1600,'height':1820,'fill':'#fff'})
 el(root,'rect',{'x':24,'y':24,'width':1552,'height':1772,'fill':'none','stroke':'#cbbf9f','stroke-width':1.5})
 # A restrained folded corner, matching the app's clean paper treatment.
 el(root,'path',{'d':'M1515 24 L1576 85 L1515 85 Z','fill':'#f4f1e9','stroke':'#ded8c9','stroke-width':1})
 text(root,64,92,'A consistent hand, from first letter to flourish',45,'serif')
 text(root,67,132,'SPENCERIAN LAB  ·  1.1.5  ·  Fine connections, open capitals, selective shades',19,color=MUTED)
 card(root,60,166,1480,328,'01','FLOWING WORDS','Source phrase · Zaner’s ornamental manual · original letter construction retained')
 specimen(root,ASSETS/models['a08-1']['file'],87,231,1426,198)
 text(root,90,452,models['a08-1']['transcription'],18,'serif',MUTED)
 card(root,60,518,726,510,'02','LOWERCASE FORMS','Six source letter studies · a, e, g, h, l, y')
 for i,id in enumerate(['l09-1','l10-1','e07-1','e04-2','e04-1','e06-2']):
  specimen(root,ASSETS/models[id]['file'],82+(i%3)*226,579+(i//3)*188,220,166)
 card(root,810,518,730,510,'03','ORNAMENTAL CAPITALS','Open ovals and selective shades · P, B, R, H, K')
 specimen(root,ASSETS/models['c09-1']['file'],836,574,678,189)
 specimen(root,ASSETS/models['c10-1']['file'],836,777,678,184)
 card(root,60,1052,1480,236,'04','LIGHT NUMERAL STUDIES','Fine-line adaptations of historical numeral shapes · the photograph supplies no numeral models')
 digits=['w04-2','w04-1','w05-1','w05-2','w06-1','w06-2','w07-1','w07-2','w08-1','w08-2']
 for i,id in enumerate(digits):specimen(root,ASSETS/models[id]['file'],83+i*144,1104,138,131)
 card(root,60,1312,1480,375,'05','YOUR NAME, IN THE SAME LETTERING','Source-based composition · joins and spacing are design choices · practice for repeatability')
 signature=ET.fromstring(signature_svg(args.name));signature.set('x','84');signature.set('y','1360');signature.set('width','1432');signature.set('height','270');signature.set('preserveAspectRatio','xMidYMid meet');root.append(signature)
 text(root,66,1730,'The chosen photograph sets the direction. Attributed source models supply the complete alphabet.',19,color=MUTED)
 text(root,66,1761,'50° ornamental source studies  ·  52° classical guides remain available  ·  71 rebuilt models',18,color=MUTED)
 target=out/'Spencerian-Reference-Studies.svg';ET.ElementTree(root).write(target,encoding='utf-8',xml_declaration=True)
 subprocess.run([args.rsvg,'-w','2000',str(target),'-o',str(target.with_suffix('.png'))],check=True)
 print(target.with_suffix('.png'))
if __name__=='__main__':main()

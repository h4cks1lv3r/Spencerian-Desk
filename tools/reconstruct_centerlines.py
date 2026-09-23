"""Prototype: source-pixel skeleton -> smooth centerline SVG with source shade.
No letters are inferred or substituted. Every path starts from a source ridge;
short skeleton spurs are discarded. Not a general calligraphy font generator.
"""
from pathlib import Path
import json, math, subprocess, tempfile, argparse, hashlib, xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, interpolate, spatial
from skimage.morphology import skeletonize

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'build/centerline-proofs'
ROWS=[]


def source(row):
    gray=np.asarray(Image.open(ROOT/f"tools/source-pages/compendium-{row['page']:03d}.jpg").convert('L')).astype(float)
    h,w=gray.shape;x0,y0,x1,y1=[round(v*n) for v,n in zip(row['crop'],(w,h,w,h))]
    a=gray[y0:y1,x0:x1].copy()
    for ex in row.get('excludeRects',[]):
        a0,b0,a1,b1=[round(v*n) for v,n in zip(ex,(w,h,w,h))]
        a[max(0,b0-y0):max(0,min(y1,b1)-y0),max(0,a0-x0):max(0,min(x1,a1)-x0)]=255
    bg=ndimage.gaussian_filter(ndimage.maximum_filter(a,size=9),sigma=3)
    return np.clip(1-a/bg,0,1)


def graph_paths(skel,scale):
    pts=set(zip(*np.where(skel)))
    def around(p):
        y,x=p
        return [q for q in [(y+dy,x+dx) for dy in [-1,0,1] for dx in [-1,0,1] if dy or dx] if q in pts]
    nbr={p:around(p) for p in pts}
    # Remove diagonal triangle shortcuts to avoid phantom junctions.
    for p in pts:
        y,x=p
        for q in list(nbr[p]):
            if abs(q[0]-y)==1 and abs(q[1]-x)==1 and ((y,q[1]) in pts or (q[0],x) in pts):nbr[p].remove(q)
    # Repeatedly prune only short endpoint branches.
    for _ in range(4):
      discard=set()
      for p in pts:
        if len(nbr[p])!=1:continue
        path=[p];prev=p;cur=nbr[p][0]
        while len(nbr[cur])==2 and len(path)<6*scale:
          path.append(cur);nxt=next(v for v in nbr[cur] if v!=prev);prev,cur=cur,nxt
        if len(nbr[cur])>2 and len(path)<3*scale:discard.update(path)
      if not discard:break
      pts-=discard;nbr={p:[q for q in nbr[p] if q in pts] for p in pts}
    specials={p for p in pts if len(nbr[p])!=2}
    # Cluster adjacent junction pixels, but retain separate terminal vertices.
    groups=[];seen=set()
    for p in sorted(specials):
      if p in seen:continue
      todo=[p];group=[];seen.add(p)
      while todo:
        q=todo.pop();group.append(q)
        if len(nbr[q])<=1:continue
        for n in nbr[q]:
          if n in specials and n not in seen and len(nbr[n])>2:seen.add(n);todo.append(n)
      groups.append(group)
    nodeof={p:i for i,g in enumerate(groups) for p in g}
    centers=[np.mean(np.array(g)[:,::-1],axis=0)/scale for g in groups]
    used=set();edges=[]
    key=lambda a,b:tuple(sorted((a,b)))
    for ni,g in enumerate(groups):
      for p in g:
        for q in nbr[p]:
          if q in g or key(p,q) in used:continue
          path=[p];prev=p;cur=q;used.add(key(p,q))
          while cur not in specials:
            path.append(cur)
            targets=[v for v in nbr[cur] if v!=prev]
            if not targets:break
            nxt=targets[0];used.add(key(cur,nxt));prev,cur=cur,nxt
          path.append(cur)
          nj=nodeof.get(cur)
          if nj is None:continue
          coords=np.array(path)[:,::-1]/scale
          coords[0]=centers[ni];coords[-1]=centers[nj]
          if len(coords)>2:edges.append([ni,nj,coords])
    # Closed components without junctions.
    for p in pts:
      if not nbr[p] or all(key(p,q) in used for q in nbr[p]):continue
      path=[p];prev=p;cur=next(q for q in nbr[p] if key(p,q) not in used);used.add(key(p,cur))
      while cur!=p and len(path)<len(pts)+1:
        path.append(cur);targets=[v for v in nbr[cur] if v!=prev and key(cur,v) not in used]
        if not targets:break
        nxt=targets[0];used.add(key(cur,nxt));prev,cur=cur,nxt
      path.append(cur)
      if len(path)>5:edges.append([None,None,np.array(path)[:,::-1]/scale])
    # Pair opposite directions through a junction for a continuous crossing.
    incident={i:[] for i in range(len(groups))}
    for ei,(a,b,coords) in enumerate(edges):
      if a is not None:incident[a].append((ei,0))
      if b is not None:incident[b].append((ei,1))
    pairs={}
    for node,ends in incident.items():
      candidates=[]
      for i,e in enumerate(ends):
        arr=edges[e[0]][2][::1 if e[1]==0 else -1];d=arr[min(len(arr)-1,max(2,round(3*scale)))]-arr[0];d/=max(np.linalg.norm(d),1e-9)
        for f in ends[i+1:]:
          if e[0]==f[0]:continue
          arr2=edges[f[0]][2][::1 if f[1]==0 else -1];v=arr2[min(len(arr2)-1,max(2,round(3*scale)))]-arr2[0];v/=max(np.linalg.norm(v),1e-9)
          candidates.append((float(d@v),e,f))
      assigned=set()
      for score,e,f in sorted(candidates):
        if score>-.35 or e in assigned or f in assigned:continue
        pairs[e]=f;pairs[f]=e;assigned.update((e,f))
    visited=set();chains=[]
    starts=[(i,s) for i in range(len(edges)) for s in [0,1] if (i,s) not in pairs]
    starts += [(i,0) for i in range(len(edges))]
    for start in starts:
      ei,side=start
      if ei in visited:continue
      chain=[]
      while ei not in visited:
        visited.add(ei);coords=edges[ei][2][::1 if side==0 else -1]
        chain.extend(coords if not chain else coords[1:])
        end=(ei,1-side)
        if end not in pairs:break
        ei,side=pairs[end]
      c=np.array(chain)
      if len(c)>=5 and np.linalg.norm(np.diff(c,axis=0),axis=1).sum()>5:chains.append(c)
    return chains


def smooth_svg(points,smooth=.22):
    # Remove repeated positions and smooth in arc length; cubic Bézier segments.
    points=points[np.r_[True,np.linalg.norm(np.diff(points,axis=0),axis=1)>1e-5]]
    if len(points)<4:return 'M '+' L '.join(f'{x:.3f},{y:.3f}' for x,y in points)
    distance=np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))]
    weights=np.ones(len(points));weights[[0,-1]]=20
    tck,u=interpolate.splprep(points.T,u=distance/distance[-1],w=weights,s=len(points)*smooth,k=3)
    knots=np.unique(np.r_[0,tck[0],1]);knots=knots[(knots>=0)&(knots<=1)]
    start=np.array(interpolate.splev(0,tck));parts=[f'M {start[0]:.3f},{start[1]:.3f}']
    for a,b in zip(knots[:-1],knots[1:]):
      p=np.array(interpolate.splev(a,tck));q=np.array(interpolate.splev(b,tck));d=np.array(interpolate.splev(a,tck,der=1));e=np.array(interpolate.splev(b,tck,der=1))
      c=p+d*(b-a)/3;v=q-e*(b-a)/3
      parts.append(f'C {c[0]:.3f},{c[1]:.3f} {v[0]:.3f},{v[1]:.3f} {q[0]:.3f},{q[1]:.3f}')
    return ' '.join(parts)


def join_gaps(paths, ink):
    paths=[p.copy() for p in paths]
    for _ in range(80):
        endpoints=[];descriptions=[]
        for i,path in enumerate(paths):
            for side in [0,1]:endpoints.append(path[0 if side==0 else -1]);descriptions.append((i,side))
        candidates=[]
        if len(endpoints)<2:break
        for ei,ej in spatial.cKDTree(endpoints).query_pairs(7):
            i,sa=descriptions[ei];j,sb=descriptions[ej]
            if i==j:continue
            a,b=paths[i],paths[j];pa=a if sa==1 else a[::-1];pb=b if sb==0 else b[::-1]
            d=pa[-1]-pa[max(0,len(pa)-8)];d/=max(np.linalg.norm(d),1e-9)
            e=pb[min(len(pb)-1,7)]-pb[0];e/=max(np.linalg.norm(e),1e-9)
            delta=pb[0]-pa[-1];distance=np.linalg.norm(delta)
            if distance<.05:continue
            unit=delta/distance
            if distance>3.5 and (d@unit<.45 or e@unit<.45 or d@e<.15):continue
            if distance<=3.5 and (d@unit<-.25 or e@unit<-.25):continue
            samples=np.linspace(pa[-1],pb[0],max(5,int(distance*3)))
            values=ndimage.map_coordinates(ink,[samples[:,1],samples[:,0]],order=1,mode='nearest')
            if distance>3.5 and (values.mean()<.047 or values.min()<.018):continue
            if distance<=3.5 and values.mean()<.02:continue
            candidates.append((distance/(.1+values.mean()),i,j,sa,sb))
        if not candidates:break
        _,i,j,sa,sb=min(candidates)
        a=paths[i] if sa==1 else paths[i][::-1]
        b=paths[j] if sb==0 else paths[j][::-1]
        paths[i]=np.vstack([a,b]);paths.pop(j)
    return paths


def create(row):
    ink=source(row);h,w=ink.shape;scale=3
    up=np.asarray(Image.fromarray((ink*255).astype('uint8')).resize((w*scale,h*scale),Image.Resampling.BICUBIC),dtype=float)/255
    soft=ndimage.gaussian_filter(up,sigma=.45*scale)
    cutoff=.125 if row['transcription']=='W. H. Patrick' or row['lessonId']=='a03' else .11 if row['lessonId'] in ['a07','s03','s06'] else .085 if row['lessonId'] in ['r03','r05','r06','r07','s05','a08'] else .065
    mask=soft>cutoff
    lab,num=ndimage.label(mask);counts=np.bincount(lab.ravel());keep=counts>25;keep[0]=False;mask=keep[lab]
    if row.get('removeBoundaryComponents'):
      edge=np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]);keep[edge]=False;mask=keep[lab]
    holes=ndimage.binary_fill_holes(mask)&~mask
    hole_labels,hole_num=ndimage.label(holes)
    hole_sizes=np.bincount(hole_labels.ravel())
    small=(hole_sizes<(.3 if row['lessonId'] in ['r03','r05','r06','r07','s05','a08','a07','s03','s06'] else 9)*scale*scale);small[0]=False
    mask |= small[hole_labels]
    skel=skeletonize(mask)
    paths=join_gaps(graph_paths(skel,scale),ink)
    ns='{http://www.w3.org/2000/svg}';root=ET.Element(ns+'svg',{'viewBox':f'-8 -8 {w+16} {h+16}','width':str(w+16),'height':str(h+16)})
    ET.SubElement(root,ns+'title').text=row['title']
    ET.SubElement(root,ns+'desc').text=f"Clean centerline reconstruction from original Compendium scan, physical page {row['page']}, {row['printedPage']}. Source-shaped curves are spline-smoothed; hairlines standardized; source swells and punctuation retained."
    ET.SubElement(root,ns+'rect',{'x':'-8','y':'-8','width':str(w+16),'height':str(h+16),'fill':'white'})
    group=ET.SubElement(root,ns+'g',{'stroke':'#20362d','fill':'none','stroke-width':'.7','stroke-linecap':'round','stroke-linejoin':'round'})
    for points in paths:
      d=smooth_svg(points,smooth=.04 if row['lessonId'] in ['r03','r05','r06','r07','s05','a08','a07','s03','s06'] else .22)
      if d:ET.SubElement(group,ns+'path',{'d':d})
    # Dark original swells only: smooth contours independent of faint hairlines.
    small_text=row['lessonId'] in ['r03','r05','r06','r07','s05','a08','a07','s03','s06']
    shade=ndimage.gaussian_filter(up,sigma=(.35 if small_text else .55)*scale)>(.28 if small_text else .35)
    lab,num=ndimage.label(shade);counts=np.bincount(lab.ravel());keep=counts>(8 if small_text else 30);keep[0]=False;shade=keep[lab]
    with tempfile.TemporaryDirectory() as tmp:
      p=Path(tmp);Image.fromarray(np.where(shade,0,255).astype('uint8')).convert('1').save(p/'shade.pbm')
      subprocess.run(['potrace',str(p/'shade.pbm'),'--svg','--output',str(p/'shade.svg'),'--opttolerance','.8'],check=True)
      traced=ET.parse(p/'shade.svg').getroot();wrapper=ET.SubElement(root,ns+'g',{'transform':f'scale({1/scale})'})
      for el in traced:
       if el.tag==ns+'g':
        el.set('fill','#20362d');wrapper.append(el)
    ET.register_namespace('',ns[1:-1]);target=OUT/f"{row['lessonId']}-centerline.svg";ET.ElementTree(root).write(target,encoding='utf-8',xml_declaration=True)
    subprocess.run(['rsvg-convert','-w','1500',str(target),'-o',str(target.with_suffix('.png'))],check=True)
    print(row['lessonId'],len(paths),'paths',target.stat().st_size)

if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--project-dir',type=Path,default=ROOT)
 parser.add_argument('--output-dir',type=Path,default=OUT)
 parser.add_argument('--ids',nargs='*',default=['r03','r04','r05','r06','r07','a01','a03','a04','a05','a07','s01','s02','s03','s04','s05','s06','x05','x01'])
 args=parser.parse_args();ROOT=args.project_dir;OUT=args.output_dir;OUT.mkdir(parents=True,exist_ok=True)
 ROWS=json.loads((ROOT/'tools/lesson-examples.json').read_text())
 for row in ROWS:
  if row['lessonId'] in args.ids:create(row)

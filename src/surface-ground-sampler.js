import {Ray,Vector3} from 'three';
const DEG=Math.PI/180,wrap=x=>((x+180)%360+360)%360-180;
// Query only the two triangles under a coordinate, not millions of DEM faces
// per wheel/frame. Contact uses the rendered Float32 vertices, including the
// feathered patch edges and the actual triangular globe, not a DEM proxy.
export function gridSurfaceRadius(geometry,direction,x,y,width,height){
 if(x<0||y<0||x>width||y>height)return null;
 const ix=Math.min(width-1,Math.floor(x)),iy=Math.min(height-1,Math.floor(y));
 const indices=geometry.index,positions=geometry.attributes.position,ray=new Ray(new Vector3(),direction),a=new Vector3(),b=new Vector3(),c=new Vector3(),hit=new Vector3();
 let radius=null;
 const sphere=geometry.type==='SphereGeometry';
 const first=sphere?(iy===0?ix*3:width*3+(iy-1)*width*6-(iy===height-1?ix*3:0)+ix*6):(iy*width+ix)*6;
 const count=sphere&&(iy===0||iy===height-1)?3:6;
 for(let i=0;i<count;i+=3){
  a.fromBufferAttribute(positions,indices.getX(first+i));b.fromBufferAttribute(positions,indices.getX(first+i+1));c.fromBufferAttribute(positions,indices.getX(first+i+2));
  if(ray.intersectTriangle(a,b,c,false,hit))radius=Math.max(radius??0,hit.length());
 }
 return radius;
}
export function createSurfaceGroundSampler({mesh,radiusKm,axes=[1,1,1],getTopography=()=>null,getTiles=()=>null}){
 const direction=new Vector3(),unscaled=new Vector3(),a=new Vector3(),b=new Vector3(),c=new Vector3(),hit=new Vector3(),ray=new Ray();
 let previousGeometry=null,bins=null;
 function indexIrregular(geometry){
  const positions=geometry.attributes.position,index=geometry.index,count=index?.count??positions.count;bins=Array.from({length:64*32},()=>[]);
  for(let i=0;i<count;i+=3){
   const corners=[a,b,c];for(let k=0;k<3;k++)corners[k].fromBufferAttribute(positions,index?index.getX(i+k):i+k).normalize();
   const lat=corners.map(v=>Math.asin(v.y)/DEG),lon=corners.map(v=>Math.atan2(-v.z,v.x)/DEG);
   const minY=Math.max(0,Math.floor((Math.min(...lat)+90)/180*32)-1),maxY=Math.min(31,Math.floor((Math.max(...lat)+90)/180*32)+1);
   let minX=Math.max(0,Math.floor((Math.min(...lon)+180)/360*64)-1),maxX=Math.min(63,Math.floor((Math.max(...lon)+180)/360*64)+1);
   if(Math.max(...lon)-Math.min(...lon)>180||maxY===31||minY===0){minX=0;maxX=63;}
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)bins[y*64+x].push(i);
  }
 }
 return (latitude,longitude)=>{
  const lat=latitude*DEG,lon=longitude*DEG;
  direction.set(Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon));
  unscaled.set(direction.x/axes[0],direction.y/axes[1],direction.z/axes[2]).normalize();
  const baseLat=Math.asin(unscaled.y)/DEG,baseLon=wrap(Math.atan2(-unscaled.z,unscaled.x)/DEG);
  const geometry=mesh.geometry,p=geometry.parameters;let radial=getTopography()?.sampleRadius?.(baseLat,baseLon,unscaled)??null;
  if(radial===null&&p?.widthSegments){radial=gridSurfaceRadius(geometry,unscaled,(baseLon+180)/360*p.widthSegments,(90-baseLat)/180*p.heightSegments,p.widthSegments,p.heightSegments);}
  if(radial===null){
   if(previousGeometry!==geometry){indexIrregular(geometry);previousGeometry=geometry;}
   const x=Math.min(63,Math.floor((baseLon+180)/360*64)),y=Math.min(31,Math.floor((baseLat+90)/180*32));ray.set(new Vector3(),unscaled);
   for(const i of bins[y*64+x]){
    const index=geometry.index,positions=geometry.attributes.position;
    a.fromBufferAttribute(positions,index?index.getX(i):i);b.fromBufferAttribute(positions,index?index.getX(i+1):i+1);c.fromBufferAttribute(positions,index?index.getX(i+2):i+2);
    if(ray.intersectTriangle(a,b,c,false,hit))radial=Math.max(radial??0,hit.length());
   }
  }
  if(radial===null)radial=1;
  const tile=getTiles()?.sampleRadius?.(baseLat,baseLon,unscaled);if(tile!==null&&tile!==undefined)radial=Math.max(radial,tile);
  return radiusKm*radial*Math.hypot(unscaled.x*axes[0],unscaled.y*axes[1],unscaled.z*axes[2]);
 };
}

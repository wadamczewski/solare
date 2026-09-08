import {FrontSide,NormalBlending} from 'three';

// Surface maps can carry an alpha channel, but a celestial solid never uses it
// as scene transparency. Rings, dust and atmospheric shells are separate meshes.
export function makeOpaqueSurface(material){
 material.transparent=false;
 material.opacity=1;
 material.alphaTest=0;
 material.depthWrite=true;
 material.depthTest=true;
 material.blending=NormalBlending;
 material.side=FrontSide;
 material.needsUpdate=true;
 return material;
}

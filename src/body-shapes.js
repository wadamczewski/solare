import * as THREE from 'three';

// Semiaxis ratios are normalised to a volume-equivalent sphere.  The source
// radius in physics.js remains the measured mean radius, so this module only
// changes the visible surface, never a mass, orbit or collision energy.
//
// Sources: JPL Solar System Dynamics physical-parameter tables and the IAU
// cartographic-constants report used by Horizons.  For Phobos and Deimos the
// values below follow the measured dimensions published by NASA's planetary
// protection review.  USGS maintains stereophotoclinometric shape products
// for both Martian moons.  Nereid is unresolved beyond a disc-scale diameter,
// therefore it deliberately remains spherical instead of being given an
// invented irregular silhouette.
export const shapeSources=Object.freeze([
 'https://ssd.jpl.nasa.gov/planets/phys_par.html',
 'https://ssd.jpl.nasa.gov/sats/phys_par/sep.html',
 'https://ssd.jpl.nasa.gov/horizons/manual.html',
 'https://fdp.astrogeology.usgs.gov/fdp/mars/',
 'https://science.nasa.gov/wp-content/uploads/2023/05/7a.20190117_PlanetaryProtectionClassificationofSample_RetMissionsfromtheMartianMoons.pdf'
]);

const rawAxes={
 // Planetary equatorial/polar radii (km), with a repeated equatorial axis.
 mercury:[2440.53,2440.53,2438.26], venus:[6051.8,6051.8,6051.8],
 earth:[6378.137,6378.137,6356.752], mars:[3396.19,3396.19,3376.20],
 jupiter:[71492,71492,66854], saturn:[60268,60268,54364],
 uranus:[25559,25559,24973], neptune:[24764,24764,24341],
 // A triaxial surface is visible for these bodies even from a system view.
 'Księżyc':[1738.1,1736.0,1735.97],
 'Fobos':[13.03,11.40,9.14], 'Deimos':[7.50,6.05,5.20],
 'Io':[1829.4,1819.4,1815.7], 'Europa':[1562.6,1560.3,1559.5],
 'Ganimedes':[2634.1,2631.2,2631.2], 'Kallisto':[2410.3,2410.3,2409.3],
 'Mimas':[207.8,196.7,190.6], 'Enceladus':[256.6,251.4,248.3],
 'Tetyda':[538.0,529.0,528.0], 'Dione':[563.0,561.0,559.0],
 'Rea':[765.0,764.0,762.0], 'Tytan':[2575.15,2575.15,2574.47],
 'Japet':[746.7,746.7,712.6], 'Hyperion':[180.1,133.0,102.7],
 'Miranda':[240.4,234.2,232.5], 'Ariel':[581.1,577.9,577.7],
 'Umbriel':[584.7,584.7,584.7], 'Tytania':[789.0,789.0,788.0],
 'Oberon':[761.4,761.4,760.4], 'Tryton':[1354.0,1354.0,1352.0],
 'Proteusz':[218.6,208.6,201.8], 'Nereida':[170,170,170]
};

const irregularProfiles=Object.freeze({
 // Low-frequency relief only.  It preserves each moon's measured envelope
 // while avoiding the old identical, sharp icosahedron used for every body.
 'Fobos':{amplitude:.085,seed:17},
 'Deimos':{amplitude:.018,seed:31},
 'Hyperion':{amplitude:.105,seed:53},
 'Proteusz':{amplitude:.032,seed:71}
});

function normalisedAxes(axes){
 const mean=Math.cbrt(axes[0]*axes[1]*axes[2]);
 return axes.map(value=>value/mean);
}

export function bodyAxes(body){
 const axes=rawAxes[body?.name]||rawAxes[body?.key];
 return axes?normalisedAxes(axes):[1,1,1];
}

export function largestAxis(body){return Math.max(...bodyAxes(body));}
export function hasMeasuredIrregularShape(body){return !!irregularProfiles[body?.name];}
export function irregularShapeProfile(body){return irregularProfiles[body?.name]||null;}

// The displacement is analytic and deterministic.  It is smooth in the
// tangent direction, so Deimos reads as a rounded, crater-softened body, not
// as a random faceted rock.  Axis scaling is applied later with all other
// bodies, keeping physical volume tied to the mean-radius data.
export function measuredIrregularGeometry(body,detail=4){
 const profile=irregularShapeProfile(body);
 if(!profile)return null;
 const geometry=new THREE.IcosahedronGeometry(1,detail),positions=geometry.attributes.position;
 for(let index=0;index<positions.count;index++){
  const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index);
  const length=Math.hypot(x,y,z)||1,nx=x/length,ny=y/length,nz=z/length,s=profile.seed;
  const broad=Math.sin(nx*2.73+ny*3.91+nz*2.17+s)*.56+
   Math.sin(nx*5.12-ny*2.41+nz*4.63+s*.37)*.29+
   Math.sin(nx*8.21+ny*6.11-nz*3.37+s*.19)*.15;
  const scale=1+profile.amplitude*broad;
  positions.setXYZ(index,x*scale,y*scale,z*scale);
 }
 positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

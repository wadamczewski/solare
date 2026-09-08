// The Sun is an extended source in nature. WebGL's shadow map is an efficient
// approximation: a small penumbra softens the fully occluded umbra while
// keeping moving eclipses and ring shadows visible at interactive frame rates.
export function configureSolarShadow(light, renderer) {
 renderer.shadowMap.enabled=true;
 light.castShadow=true;
 light.shadow.mapSize.set(1024,1024);
 light.shadow.camera.near=.001;
 light.shadow.camera.far=300;
 light.shadow.bias=-.00008;
 light.shadow.normalBias=.012;
}

export const participatesInSolarShadow=body=>body.key!=='sun'&&body.key!=='blackhole';

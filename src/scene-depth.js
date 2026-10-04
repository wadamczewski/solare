import {ShaderChunk} from 'three';

// One scene unit is 1/6 AU. At surface-view distances, Three's log2(1+w)
// rounds 1+w to exactly 1 in a float shader: every nearby panel/terrain face
// then writes depth zero. Scale BEFORE adding 1, consistently for all scene
// materials (including glass and sprites), so occlusion survives close-ups.
export const SCENE_DEPTH_SCALE=1e12;
export function installSceneDepth(){
 ShaderChunk.logdepthbuf_vertex=/* glsl */`
#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
 vFragDepth = 1.0 + gl_Position.w * ${SCENE_DEPTH_SCALE.toExponential()};
 vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif
`;
 ShaderChunk.logdepthbuf_fragment=/* glsl */`
#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
 // Renderer supplies 2/log2(far+1) for each camera, also in transmission
 // passes. Recover that far plane; orthographic/shadow depth stays linear.
 float sceneDepthFar = exp2( 2.0 / logDepthBufFC ) - 1.0;
 gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z
  : log2( vFragDepth ) / log2( 1.0 + sceneDepthFar * ${SCENE_DEPTH_SCALE.toExponential()} );
#endif
`;
}

import * as THREE from 'three';

export function grassMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uWind: { value: new THREE.Vector3(1, .8, .4) },
      uBase: { value: new THREE.Color(0x9a6224) }, uTip: { value: new THREE.Color(0xf2c35c) },
      uSun: { value: new THREE.Color(0xffb055) }, uAmb: { value: new THREE.Color(0x807060) },
      uPush: { value: new THREE.Vector4() }, uSnow: { value: 0 }, uFade: { value: 72 },
      uDensity:{value:1},
      uWheels:{value:Array.from({length:6},()=>new THREE.Vector4())},
      uHead:{value:new THREE.Vector4()},uForward:{value:new THREE.Vector2(1,0)},
    }]),
    vertexShader: `uniform float uTime,uFade,uDensity;attribute vec3 aTip;attribute float aSnow;uniform vec3 uWind;uniform vec4 uPush,uWheels[6];varying float vH,vFade,vSnow;varying vec3 vTint,vTip,vWorld;
      #include <common>
      #include <fog_pars_vertex>
      void main(){vH=uv.y;vec4 wp=modelMatrix*instanceMatrix*vec4(position,1.);float ph=wp.x*.32+wp.z*.21;
      float wind=sin(uTime*1.6+ph)*.55+sin(uTime*3.7+ph*2.3)*.18+.35,bend=vH*vH;
      wp.xz+=uWind.xz*wind*bend*uWind.y*.38;vec2 d=wp.xz-uPush.xy;float l=length(d);
      float push=(1.-smoothstep(uPush.z*.45,uPush.z,l))*step(.01,uPush.z);
      wp.xz+=d/(l+.001)*push*bend*.8;wp.y-=push*vH*.4;vTint=vec3(1.);
      for(int i=0;i<6;i++){vec2 delta=wp.xz-uWheels[i].xy;float dist=length(delta);float press=(1.-smoothstep(.3,1.25,dist))*uWheels[i].z;wp.xz+=delta/(dist+.01)*press*bend*.9;wp.y-=press*vH*.35;}
      vWorld=wp.xyz;
      #ifdef USE_INSTANCING_COLOR
      vTint=instanceColor;
      #endif
      vTip=aTip;vSnow=aSnow;vFade=(1.-smoothstep(60.,80.,distance(wp.xyz,cameraPosition)))*step(fract(sin(wp.x*17.+wp.z*23.)*43758.54),uDensity);
      vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uBase,uTip,uSun,uAmb;uniform float uSnow;uniform vec4 uHead;uniform vec2 uForward;varying float vH,vFade,vSnow;varying vec3 vTint,vTip,vWorld;
      #include <common>
      #include <fog_pars_fragment>
      void main(){float dither=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);if(dither>vFade)discard;
      vec3 c=mix(vTint,vTip,smoothstep(0.,1.,vH));c=mix(c,vec3(.95,.96,1.),max(uSnow,vSnow)*smoothstep(.35,1.,vH));
      vec2 beam=vWorld.xz-uHead.xy;float distance=length(beam);float cone=smoothstep(.87,.97,dot(normalize(beam+.001),uForward));float pool=cone*(1.-smoothstep(3.,36.,distance))*uHead.z;
      c*=uAmb+uSun*(.25+.75*vH)+vec3(1.,.87,.61)*pool*1.8;gl_FragColor=vec4(c,1.);
      #include <fog_fragment>
      }`,
  });
}

export function waterMaterial() {
  return new THREE.ShaderMaterial({ fog: true, transparent: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uDeep: { value: new THREE.Color(0x1d6f86) }, uShallow: { value: new THREE.Color(0x3fc1c9) },
      uSky: { value: new THREE.Color(0xffdcaa) }, uSunDir: { value: new THREE.Vector3(1, 1, 0) },
      uSunCol: { value: new THREE.Color(0xffb055) }, uMin: { value: 0 },
    }]),
    vertexShader: `uniform float uTime;attribute float aDepth;varying vec3 vW;varying float vDepth;
      #include <common>
      #include <fog_pars_vertex>
      void main(){vec4 wp=modelMatrix*vec4(position,1.);wp.y+=sin(wp.x*.35+uTime*1.2)*.05+sin(wp.z*.5+uTime*.9)*.04;
      vW=wp.xyz;vDepth=aDepth;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime,uMin;uniform vec3 uDeep,uShallow,uSky,uSunDir,uSunCol;varying vec3 vW;varying float vDepth;
      #include <common>
      #include <fog_pars_fragment>
      float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){float t=uTime;vec3 n=normalize(vec3(-cos(vW.x*.35+t*1.2)*.0175-cos(vW.x*1.7+vW.z*.6+t*2.)*.03,1.,-cos(vW.z*.5+t*.9)*.02-cos(vW.z*2.1-vW.x*.4+t*1.6)*.03));
      vec3 v=normalize(cameraPosition-vW);float fr=pow(1.-clamp(dot(n,v),0.,1.),3.),dep=max(vDepth,uMin);
      if(dep<-.04)discard;vec3 col=mix(uShallow,uDeep,smoothstep(.2,2.5,dep));col=mix(col,uSky,fr*.65);
      vec3 r=reflect(-normalize(uSunDir),n);float sp=pow(max(dot(r,v),0.),140.);
      float sk=step(.94,hs(floor(vW.xz*5.)+floor(t*3.)))*pow(max(dot(r,v),0.),6.);col+=uSunCol*(sp*2.2+sk*1.3);
      float foam=(1.-smoothstep(.05,.35,dep+sin(t*1.5+vW.x*2.)*.04))*(1.-step(.5,uMin));col=mix(col,vec3(.95,.98,1.),foam*.85);
      gl_FragColor=vec4(col,mix(.86,.95,smoothstep(.2,2.,dep)));
      #include <fog_fragment>
      }`,
  });
}

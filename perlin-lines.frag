/*
{
	"audio": true,
	"pixelRatio":2,
	"glslify": true
}
*/

precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform sampler2D samples;
uniform sampler2D spectrum;
uniform float volume;
uniform vec2 mouse;
uniform sampler2D backbuffer;

#pragma glslify: noise    = require('glsl-noise/simplex/4d')
#pragma glslify: perlin    = require('glsl-noise/classic/4d')

float C,S;
#define rot(a) mat2(C=cos(a), S=sin(a), -S, C)
#define hash(x) fract(sin(x)*1e4)

void main() {
  vec3 c = vec3(.1,0,0);
  c.bg *= rot(time/2.);
  c.br *= rot(time/2. + 6.28 * 1./3.);

  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  uv += vec2(-.5, -.5/screen_ratio);
  vec2 nuv = uv;
  vec2 nuvf = vec2(uv.y,uv.x);
  vec2 nuvr = uv * rot(time/2.);

  uv.x = mod(uv.x, 2.);

  vec3 wave = texture2D(spectrum, nuv/30.+.15).xyz;
  vec3 wavef = texture2D(spectrum, nuvr/30.+.15).xyz;
  nuv.x += wave.x - wave.y/20.;
  float pn = perlin(vec4(vec2(nuv.y,wave.x)*2.+wave.x,wave.x+sin(time), wave.z));
  float pn2 = perlin(vec4(nuvr*6.,hash(uv.x), time));


  nuv.x += pn;


  c += float(mod(nuv.x,.2/wave.z)>.1);
  c -= float(mod(wave.x*pn2,.4)>.1)/4.;

  gl_FragColor = vec4(c, 1);
}

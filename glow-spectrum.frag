/*
{
  "audio": true,
  "pixelRatio":1,
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

const float PI = 3.14159265358979323846264338328;



void main() {
  vec3 c = vec3(0);
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  vec2 uv2 = 2. * uv -1.;
  uv += vec2(-.5, -.5/screen_ratio);
  uv2 = uv2.yx;
  uv = uv.yx;

  uv.x += .2;
  //uv *= rot(-mod(time/20.-PI*2./floor(mod(time*5.,24.)/4.+1.), PI*2.));
  uv.y +=.5;
  uv.x = abs(uv.x);

  float theta = atan(uv.x, uv.y);
  //uv /= theta +uv.x;

  vec3 wave = texture2D(spectrum, (uv.yx+.9)/40.).xyz*.8;
  //uv.x += mod(sin(time+sin(uv.y))/40.-wave.x-.05,.5)-.5;
  uv.x += sin(time+sin(uv.y))/40.-wave.x-1./40.;

  c += abs(5./uv.x/2000.);

  c += vec3(1,.6,1)*float((mod(uv.x,.6)-.5)!=(uv.x-.5))*abs(5./(mod(uv.x,1.)-.5)/2000.);

  gl_FragColor=vec4(c, 1);
}

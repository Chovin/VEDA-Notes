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

const float PI = 3.14159265358979323846264338328;
const float PI2 = PI*2.;

#define PHI (sqrt(5.)*0.5 + 0.5)

float C,S;
#define rot(a) mat2(C=cos(a), S=sin(a), -S, C)
#define hash(x) fract(sin(x)*1e4)



void pR(inout vec2 p, float a) {
	p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
}

float pModPolar(inout vec2 p, float repetitions) {
	float angle = 2.*PI/repetitions;
	float a = atan(p.y, p.x) + angle/2.;
	float r = length(p);
	float c = floor(a/angle);
	a = mod(a,angle) - angle/2.;
	p = vec2(cos(a), sin(a))*r;
	// For an odd number of repetitions, fix cell index of the cell in -x direction
	// (cell index would be e.g. -5 and 5 in the two halves of the cell):
	if (abs(c) >= (repetitions/2.)) c = abs(c);
	return c;
}

void main() {
  vec3 c = vec3(.1,.1,.13)*1.4;
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  uv += vec2(-.5, -.5/screen_ratio);
  vec2 nuv=uv;
  vec2 edge = uv;

  float sz = .15;

  vec2 recm = vec2(sin(time/3.+volume/200.), cos(time/3.)/2.)/240.;
  uv += recm;

  pR(uv.xy, time/3.);
  vec3 wave = texture2D(spectrum, floor(abs(vec2(length(uv.xy))*10./sz))/10.*sz).xyz;
  pR(uv.xy, -time - volume/(40.+sin(time/4.)*20.));
  wave.xy = floor((wave.xy*uv.x)*10./sz)/10.*sz;
  pModPolar(uv, 15.);

  //uv.y += wave.x;
  float a = volume/20.;
  vec2 move = vec2(sin(time+a), cos(time/2.+a))/200.;
  pR(nuv, .2-a/200.);
  nuv += move+uv/20.;
  vec2 snuv = nuv -wave.xy/5.;
  float shadow = float(abs(snuv.x-.32)<.02 && snuv.y>-.12);
  c -= shadow*.02;
  vec2 nnuv = nuv;
  nnuv += vec2(-.340,.095);
  pR(nnuv,2.7);
  nnuv = abs(nnuv);
  pR(nnuv,.2);
  bool need = abs(nnuv.x-.001)<.002;
  c = float(need)*vec3(.5) + float(!need)*c;
  bool head = abs(nuv.x-.346)<.02 && nuv.y>-.101;
  c = vec3(float(head)*.2) + float(!head)*c;
  c = clamp(vec3(0),vec3(1),c);
  head = abs(nuv.x-.35)<.02 && nuv.y>-.1;
  c -= float(head);

  c += float(length(uv)<.4)*wave.y*3.;

  pR(edge,sin(time)/80.);
  c -= float(abs(edge.y)>.3);
  c -= float(length(uv)<.01);
  c += float(length(uv)<.045)*.1;
  float rw = .4;
  bool record = length(uv)<rw;
  c -= float(record)*.05;
  c -= float(length(edge+vec2(.03,.025)-recm*2.)<rw && !record)*(.125+sin(time)*.025);

  gl_FragColor=vec4(c, 1);
}

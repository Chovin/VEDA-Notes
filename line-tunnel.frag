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

const float PI = 3.14159265358979323846264338328;
const float PI2 = PI*2.;

#define PHI (sqrt(5.)*0.5 + 0.5)

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
  vec3 c = vec3(.1,.1,.13);
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  uv += vec2(-.5, -.5/screen_ratio);

  float sz = .2;


    pR(uv, time);

    // change volume*1. depending on avg volume
    pModPolar(uv, max(50. -floor(volume*1.2),3.+floor(sin(time/3.)*3.+3.)));
    // TODO: what does mod(sin(uv.x)) do?

    uv.x += -time/5.+volume/2000.;

    uv = mod(uv+sz/2., sz) - sz/2.;

    pR(c.rg, time);
    c += abs(.004/(uv.y+sin(time*uv.x/(20.+volume*3.))/(20.+volume*3.))); // TODO: add sin
    pR(c.gb, time);
    c -= abs(.02/uv.x)/2.;

    //TODO: wekinator osc?



  sz += volume/2000.;

  pR(uv, time);

  pModPolar(uv, 50.);

  uv.x += -time/5.;

  uv = mod(uv+sz/2., sz) - sz/2.;

  c += abs(.002/uv.x);



  gl_FragColor=vec4(c, 1);
}

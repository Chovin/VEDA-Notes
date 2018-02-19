/*
{
  "audio": true,
  "pixelRatio":2,
  "glslify": true,
  "vertexMode": "TRIANGLES",
  "PASSES": [{
    "vs": "./testvert.vert",
  }]
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

  const float amt = 12.;
  for(float i = 0.; i < amt; i++)
  {
    pR(uv, PI2*(i/amt));
    float uvx = uv.x + (sin(time + uv.y*2.+PI2*(i/amt))-cos(time-uv.y+PI2*(i/amt)))/4.;
    //uvx = length(vec2(uvx,sin(uv.y)));
    c += abs(.002/uvx);
    c = min(c, 1.);
  }

  c *= .2;


  gl_FragColor=vec4(c, 1);
}

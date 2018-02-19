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
  vec3 c = vec3(.1,.1,.13);
  // map ratio to screen coords, res > (1/ratio, 1)
  vec2 uv = gl_FragCoord.xy/resolution.y;
  float screen_ratio = resolution.y/resolution.x;
  // center uv and account for screen ratio distortion
  float hw = .5/screen_ratio;
  uv += vec2(-hw, -.5);

  float sz = .025;

  // mod by twice the size, map to screen (1./modsize), then step by half that
  c += step((mod(uv.x, sz*2.))/(sz*2.),.5)*.05;

  vec2 cuv = uv; // save uv before altering it
  uv.x *= float(uv.y<0.)*2.-1.; // reverse
  uv.y = -abs(uv.y); // negative mirror


  vec3 wave = texture2D(spectrum,
    // + .5 to move uv.x0 back to the left
    // floor(hw/sz)*sz to get it all the way to the left instead oh just left of the square
    // map to sz and quantize w/ floor
    // stretch to screen (1./sz) and stretch to liking *2.
    vec2(floor((uv.x+floor(hw/sz)*sz)*(1./sz))/(2./sz),uv.y)
  ).xyz;

  vec3 freq = texture2D(spectrum,
    // mirror w/ abs
    vec2(floor((abs(uv.x))*(1./sz))/(4./sz),uv.y)
  ).xyz;

  // quantize/mod screen into circles.
  float circ = float(length(mod(uv, sz) - sz/2.) - sz/2. < 0.);

  // filter height to sz chunks
  float chunky = floor(uv.y/sz)*sz+.5;
  // map height to (40% wave + 60% freq) * stretch/amplitude (.5)
  float amp = (wave.x*.6+freq.x*.4)*.6;
  bool thresh = chunky<amp;
  bool topcirc = chunky+sz>amp && thresh;

  // add color if threshold met to the intensity of wave. constrain to circle
  c.rg -= float(topcirc)*wave.x*circ;
  c.b += float(topcirc)*wave.x*circ;
  // constrain only half to squares
  bool halfish = mod(((chunky-.5))/sz, 2.)<.8;
  c += float(thresh)*wave.x*(
    float(halfish && !topcirc)*circ +
    float(!halfish && !topcirc)*vec3(volume/40.,.5,.1+sin(time/3.)*.1));

  // rotate by steps of 1 quadrant
  cuv = cuv*rot(floor(time)*PI/2.);

  wave = texture2D(spectrum,
    // x: angle
    // y: radius
    // /16. to grab the tail end with more even spikes
    // idk why but adding .2 removes 1 quadrant of negitive x mapped spectrum
    vec2(atan(cuv.x,cuv.y)/16. +.4,
         length(cuv))
  ).xyz;

  vec3 wc = vec3(0,0,1);
  vec3 wcnw = wc;
  // rotate base color by gb twice as fast as rg for gradient
  // rotate more depending on distance from center
  pR(wc.gb, wave.x*length(uv)*8.+time/4.);
  pR(wc.rg, wave.x*length(uv)*4.+time/4.);
  // color without spike altering
  pR(wcnw.gb, time/4.);
  pR(wcnw.rg, time/4.);

  // .2 + volume for base circle
  float cw = .2 + volume/600.;
  float iw = (.2 - volume/600.)*.6;
  bool inner = length(cuv) < iw;
  // sqrt of wave to reduce large spikes
  bool spike = length(cuv) < .4*sqrt(wave.x) + cw;
  // only show if enough volume
  c += float(spike)*wc*float(volume>5.)*volume/10.*float(!inner);
  c += float(length(cuv) < iw-.02)*float(volume>4.)*wcnw*volume/10.;
  c = min(c, 1.);

  //c *=.5;

  gl_FragColor=vec4(c, 1);
}

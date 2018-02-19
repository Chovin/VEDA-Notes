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



void main() {
  vec3 c = vec3(.1,.1,.13);
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  uv += vec2(-.5, -.5/screen_ratio);

const float amt = 8.;

for(float j = 0.; j < 2.; j++)
{
  for(float i = 0.; i < amt; i++)
  {
    float spin = time*2. + 2.*i*PI/amt + uv.y*6.;
    float w = clamp(volume/100.,1.,-1.);
    //w = .35;
    float uvx = uv.x+ w*(sin(spin)-cos(spin-uv.y*6.+time*2.)/2.)/2.;
    uvx += sin(time + uv.y)/2.;
    //uvx = mod(abs(uvx), .1);

    float mult = j*2.-1.;
    //mult *= -1.;
    float intensity = (j-1.)/1.2+1.;
    c += mult*abs((.001/intensity*intensity)/(uvx+.05*mult))*intensity;
  }
}

  gl_FragColor=vec4(c, 1);
}

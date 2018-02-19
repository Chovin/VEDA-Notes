/*
{
  "audio": true,
  "pixelRatio":1,
  "glslify": true,
  "server": 1234
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
const float PI2 = 6.283185307179586;

void main() {
  vec3 c = vec3(0);
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  vec2 uv2 = 2. * uv -1.;
  vec2 uv3 = uv;
  vec2 uvl = uv;
  vec2 cenp = vec2(-.5, -.5/screen_ratio);
  uv += cenp;
  float mvol = volume;

  vec3 wave = texture2D(spectrum, abs((uv)/20.)).xyz;


  // uv2 = -abs((uv-.2+sin(time)/20.)*sin(-uv.x+time*1.5+(uv.y-1.)*sin(uv.x/+sin(time)))*40.+sin(time)/20.)+uv.y/2.; //wat
  // uv2.y += sin(time);
  // uv2 = uv2.yx;
  // uv2.y /= mvol;
  // uv2.x += sin(time * mvol/300. * (uv2.y)*uv.x);
  //uv2/=.2;

  //uv2.x += .2+.1*sin(time+mvol/20.);

  //uv2.x += sin((time+mvol/20.)*(uv2.y-time)/2000.+mvol/300.+cos(uv2.x*8.+mvol/8.)/(4.-1./mvol))/(5.+1./mvol/(4./wave.y));

  // uv *= rot(time/20.);

  // uv2.y += sin(mouse.x + uv2.x);
  //
  // for(int i = 0; i < 30 ; i++)
  // {
  //   float uy = uv2.y + sin(time + mvol/20. + uv2.x*2.+float(i+1)*uv2.x/mvol/20. + time/(float(i-1)+.5)+float(i+2)*mvol/30.)/2.;
  //   c += abs(.5/uy * (mvol/1000.)/4.)*mvol/20.;
  // }
  vec2 mp = vec2(mouse.x,(mouse.y+.175)/screen_ratio)-.5;
  vec2 omp = mp;
  mp*=0.;
  //mp = vec2(.5,0)*rot(time + wave.x + volume/1000.);
  mp = vec2(.01)*rot(time+volume/20.);


  float sz = .2;

  uv2.y += sin(time +uv2.x);
  uv += vec2(floor(length(wave.xy)*2.)/20.,0.); // woah
  uv += mp;

  float theta = atan(uv.x,uv.y);
  //uv-=theta;


  float circ=0.;
  const float imax = 1.;
  for(float i = 0.; i < imax; i ++)
  {
    float even_off = (i/imax);
    float pioff = even_off*PI2;
    float c1r = .25 ;
    float c2r = .31 -.02/(volume/20.);
    circ = length( //clamp(vec2(sz-.01),vec2(-(sz-.01)),
      uv -
      vec2(sin(time*10.+mvol/200.+pioff),
           cos(time*10.+mvol/200.+pioff))
           *(c1r+mvol/3000.)
      + mp/3. ) -
      .005-sqrt(mvol/20000.); //)
    float circ2 = length( //clamp(vec2(sz-.01),vec2(-(sz-.01)),
      uv -
      + mp/4.) -
      c2r -sqrt(mvol/2000000.); // )
    circ = min(circ,circ2);  // max
    circ = circ2;
    c += abs(.001/circ)/imax*2.;
  }
  // c.r = 0.;
   c.rg *= rot(time*2.);
   c.rg *= rot(PI2*length(omp));
   uv *= rot(time);
   uv.x += sin(time+(uv.y+uv.x+sin(time/5.))*20.+volume/22.)/20.;
   uv *= (float(length(uv)>.2)-float(length(uv)<.1));
   uv *= 2000.;
   c += min(abs(.001/uv.x),1.);
   //c.rg *= rot(time);

  uv3 += cenp - mp;
  uv3/=.9 ;//+.009/volume;
  uv3 -= cenp - mp;
  vec3 bb = texture2D(backbuffer, vec2(uv3.x,uv3.y*screen_ratio)).xyz;




  gl_FragColor=vec4(c*.5 + bb*.98, 1);
}

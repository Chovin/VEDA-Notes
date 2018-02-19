/*
{
  "audio": true,
  "pixelRatio": 1,
  "frameskip": 1
}
*/

precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform float volume;
uniform sampler2D backbuffer;
uniform sampler2D spectrum;


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
  vec3 c = vec3(0,0.5,1);
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  vec2 off = vec2(-.5, -.5/screen_ratio);
  uv += off;
  vec2 ouv = uv;


  // float sz = .05 * volume/20.;
  //
  // const float count = 40.;
  //
  // for(float j = 0.; j < count; j++)
  // {
  //   vec2 juv = uv;
  //   juv *= rot((j/count*PI + time));
  //   juv += vec2(sin(time*2.+j/count*PI2), cos(time*2.+j/count*PI2))/5.;
  //   juv += sin(time+juv.y*4.*volume/20.)/4.;
  //   vec3 jc = vec3(0,0,1); // blue
  //   jc.gb *= rot(j/count*PI2 + time);
  //   jc.rg *= rot(j/count*PI2 - time);
  //   c += abs((.001 + .002*volume/20.+length(juv)*.03)/juv.x) * jc;
  // }
  // c = min(vec3(1.),c);

  vec2 kuv = uv;
  float sp = texture2D(spectrum, abs(kuv)/8.).x;
  sp *= .5;
  c += (float(abs(kuv.y)<sp/2. )*(sp*3.*(1.-length(kuv*5.))*vec3(1,0,0)*3.))*float(length(kuv)<.2);
  pR(kuv, -time);
  //pModPolar(kuv, 2.+floor(volume/10.));
  float sp1 = texture2D(spectrum, abs(kuv)/8.).x;
  sp1 *= .5;
  c += (float(abs(kuv.y)<sp1/2. )*(sp1*3.*(1.-length(kuv*5.))*vec3(1,0,0)*3.))*float(length(kuv)>.2);

  vec2 puv = uv;

  puv*=rot(floor(time)*PI/4.);


  float sp2 = texture2D(spectrum, vec2(atan(puv.x, puv.y)/16. + .4, length(puv))).x;

  //c += sp2;

  // c += float(length(uv)<.1);
  //uv.x += sin(sp*uv.y*8.)/4.;

  c += abs(.006/(length(puv)-.2-.3*sp2)) + float(length(puv)>.2 && length(puv)>.2+.3*sp2)*(4.-length(uv)*8.)*.5;
  c += abs(.006/(length(puv)-.2-.3*sp2)) + float(length(puv)>.2 && length(puv)>.2+.4*sp2)*(4.-length(uv)*8.)*.5;


  vec3 bb = texture2D(backbuffer, ouv*vec2(1,screen_ratio)+vec2(.5,.5)).xyz;

  c = c*.1 + bb*.7;
  gl_FragColor = vec4(c, 1);
}

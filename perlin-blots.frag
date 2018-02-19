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

const float EPSILON = .0000005;
const int MAX_ITER = 9999;

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


vec2 sdf(vec3 p) {
  float cs = .8;
  float ms = cs*8.;
  // pR(p.xz, time/4.);
  // pR(p.xy, time/5.);
  p.z -= time*3.;
  vec3 wave = texture2D(spectrum, floor(mod(p.zx/5.,5.))*2.).xyz;
  p.y += volume/40.;
  float pn = perlin(vec4(p*.8, time/2.));
  p += pn;
  //p.y += wave.y*5.;
  //pR(p.xz, time);
  p.xzy = mod(p.xzy+ms/2., ms)-ms/2.;
  pR(p.xy, time/2.- volume/20.);
  pR(p.yz, (time/6.- volume/3.)*(1.-float(mod(p.z+ms, ms*2.)-ms>ms)*2.));
  //pModPolar(p.xy, 4.+floor(volume/5.));
  //p -= .2;

  float circ = length(p) -cs-.2*volume/20.;
  //float circ2 =
  return vec2(circ, -1);
}

// returns vec3( (sdf(): iter dist, obj id), distance from origin to obj )
vec3 raycast(vec3 p, vec3 dir, int max_iter, float max_dist) {
  float dist = 0.;
  vec3 op=p;
  dir = normalize(dir);
  for(int i = 0; i < MAX_ITER; i++)
  {
    vec2 ndist = sdf(p);
    if (ndist.x < EPSILON) {
      return vec3(ndist, length(p-op)+ndist.x);
    }
    if (i >= max_iter) {
      break;
    }
    p = p + dir * ndist.x;
  }
  return vec3(9999.,.0,9999.);
}

vec3 raycast(vec3 p, vec3 dir) {
  return raycast(p, dir, 50, 5.);
}

vec3 calcNormal(vec3 pos) {
	const float eps = 0.002;

	const vec3 v1 = vec3( 1.0,-1.0,-1.0);
	const vec3 v2 = vec3(-1.0,-1.0, 1.0);
	const vec3 v3 = vec3(-1.0, 1.0,-1.0);
	const vec3 v4 = vec3( 1.0, 1.0, 1.0);

	return normalize( v1*sdf( pos + v1*eps ).x +
										v2*sdf( pos + v2*eps ).x +
										v3*sdf( pos + v3*eps ).x +
										v4*sdf( pos + v4*eps ).x );
}

// return a mat3 to turn toward dir
mat3 look_mat(vec3 dir, vec3 updir) {
	vec3 forward = normalize(dir);
	vec3 right = cross(normalize(updir), forward);
	vec3 up = cross(forward, right);
	return mat3(right.x, up.x, forward.x,
							right.y, up.y, forward.y,
							right.z, up.z, forward.z);
}

mat3 look_mat(vec3 dir) {
	return look_mat(dir, vec3(0,1,0));
}

// returns mat3 of view screen, ray, and vec3(0)
mat3 look(vec2 cam_space, vec3 screen_origin, vec3 cam_dir, vec3 cam_up, float fov, float size) {
	float cam_dist = (size/2.)/tan(radians(fov/2.));
	vec3 cam_origin = screen_origin - cam_dir * cam_dist;
	vec3 nuv = vec3(cam_space*size,0);  //scale

	mat3 r = look_mat(cam_dir, cam_up);
	nuv *= r;  //rotate
	nuv += screen_origin;  //translate
	vec3 ray = normalize(nuv - cam_origin);
	return mat3(nuv,ray,vec3(0));
}


void main() {
  vec3 c = vec3(.1,.1,.13);
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  uv += vec2(-.5, -.5/screen_ratio);
	vec2 bbuv = uv;
  vec2 nuv = uv;
  uv /= 2.;

  float theta = atan(uv.x, uv.y);

  vec3 wave = texture2D(spectrum, (uv-.5)/20.).xyz;
  vec3 wave2 = texture2D(spectrum, nuv*rot(PI*.5)+.35).xyz;

  float pn = perlin(vec4(uv*3.*theta*atan(uv.x,uv.y-.5), time/20., wave.x*5.));

  c += wave2;
  float cs = .1;
  float ns = cs;
  //uv *= rot(time/6.);
  uv.y = mod(uv.y+ns/2.,ns)-ns/2.;


  vec3 screen = vec3(0,0,-1); // screen position
  float sdist = 5. + 10./volume/20.;           // screen distance
  screen.xz *= rot(time/9. - volume/50.);
  screen.yz *= rot(time/12. - volume/60.);
  screen = normalize(screen)*sdist; // fix any rotation error
  vec3 lookv = normalize(-screen);
  vec3 up = vec3(0,1,0);
  up.xy *= rot(time/5.);
  float fov = 100.;
  float ssize = 4.+ 10./volume/20.;          // screen size (opposite of zoom)


  mat3 looked = look(nuv, screen, lookv, up, fov, ssize);
  vec3 cuv = looked[0];
  vec3 ray = looked[1];

  //vec3 collision = raycast(cuv, ray);  // vec3(iter_dist, id, dist)

  vec3 cc = vec3(0);

  vec3 light = vec3(7,2,-5);
  light.xy *= rot(time/2.);

  // if (collision.x<EPSILON) {
  //   vec3 surface = cuv+ray*collision.z;
  //   vec3 snorm = calcNormal(surface);
  //   vec3 lightRay = normalize(light-surface);
  //   vec3 lightEye = normalize(ray + lightRay);
  //   float bp = pow(max(0., dot(snorm, lightEye)), .2);
  //
  //   c = vec3(bp);
  //   c.r += mod(collision.z, 1.);
  //   c.rg *= rot(time/4.);
  //   c.gb *= rot(time/5.);
  //   c += .1;
  //   cc = c;
  // }



  float circ = float(length(uv * pn*2.5)-cs+.1*volume/60.<0.);
	float circ2 = float(length(uv)-cs*.5+.1*volume/80.<0.);
  float circ3 = float(length(uv+pn*.01)-cs*.35+.1*volume/80.<0.);



  c.r += step(.8,fract(nuv.x*10.+pn))*theta*.0;
  c.b += fract(nuv.x*10.-pn)/3.*0.;

  c.rg *= rot(time/2.);
  c.bg *= rot(time/3.);


  c /= 5.;


  c = vec3(0);
  c += (1. - (circ-circ2+circ3))/1.;

  c = vec3(length(c));

	c *= look_mat(vec3(sin(time/6.), cos(time/7.), sin(time/5.)-cos(time/8.)));
  // c.rg *= rot(time/6.);
  // c.bg *= rot(time/7.);
	// c = normalize(c);

  //c += fract(p.x)

  c += cc;

	vec3 bb = texture2D(backbuffer, gl_FragCoord.xy/resolution).xyz;



  gl_FragColor=vec4(c + bb*.95, 1);
}

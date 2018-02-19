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

const float PI = 3.14159265358979323846264338328;
const float PI2 = PI*2.;

#define PHI (sqrt(5.)*0.5 + 0.5)
// Sign function that doesn't return 0
float sgn(float x) {
	return (x<0.)?-1.:1.;
}

vec2 sgn(vec2 v) {
	return vec2((v.x<0.)?-1.:1., (v.y<0.)?-1.:1.);
}

float square (float x) {
	return x*x;
}

vec2 square (vec2 x) {
	return x*x;
}

vec3 square (vec3 x) {
	return x*x;
}

float lengthSqr(vec3 x) {
	return dot(x, x);
}


// Maximum/minumum elements of a vector
float vmax(vec2 v) {
	return max(v.x, v.y);
}

float vmax(vec3 v) {
	return max(max(v.x, v.y), v.z);
}

float vmax(vec4 v) {
	return max(max(v.x, v.y), max(v.z, v.w));
}

float vmin(vec2 v) {
	return min(v.x, v.y);
}

float vmin(vec3 v) {
	return min(min(v.x, v.y), v.z);
}

float vmin(vec4 v) {
	return min(min(v.x, v.y), min(v.z, v.w));
}

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


vec3 light = vec3(0,1.,5);

vec2 sdf(vec3 p) {
  float scene = 0.;
  float id = 0.;
  float lcirc = length(p-light) - .2-volume/70.;
  float sz = 4.+sin(time);
  float csz = .75+sin(time)*.3;
  float a = floor((p.x+sz/2.)/sz);
  vec3 wave = texture2D(spectrum, abs(vec2(a*sz, p.y))).xyz;
  pR(p.yz, a*time/20.*volume/40000.);
  pR(p.xz, time);


  //p.y += sin(time+floor((p.x+sz/2.)/sz))*2.;
  pR(p.yz, -PI*.3);
  p.x+= wave.y*5.;
  p = mod(p+sz/2.,sz)-sz/2.;
  float circle = length(p) - csz;
  pR(p.xz, time+a);
  pR(p.xy, time-a*3.);
  circle = max(vmax(abs(p) - csz*.8), -circle);


  scene = circle;
  scene = min(scene, lcirc);

  id += float(scene==lcirc);
  id += float(scene!=lcirc)*wave.y;

  return vec2(scene, id);
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

void main() {
  vec3 c = vec3(.1,.1,.13);
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  uv += vec2(-.5, -.5/screen_ratio);

  vec3 screen = vec3(0,0,-1); // screen position
  float sdist = 10.;           // screen distance
  // screen.xz *= rot(time/9.);
  // screen.yz *= rot(time/12.);
  screen = normalize(screen)*sdist; // fix any rotation error
  vec3 lookv = normalize(-screen);
  vec3 up = vec3(0,1,0);
  //up.xy *= rot(time/5.);
  float fov = 90.;
  float ssize = 1.;          // screen size (opposite of zoom)


  mat3 looked = look(uv, screen, lookv, up, fov, ssize);
  vec3 cuv = looked[0];
  vec3 ray = looked[1];

  //pR(light.xy, time);
  pR(light.xz, time);

  vec3 collision = raycast(cuv, ray);  // vec3(iter_dist, id, dist)

  if (collision.x<EPSILON) {
    vec3 surface = cuv+ray*collision.z;
    float ldist = distance(light, surface);
    vec3 snorm = calcNormal(surface);
    vec3 lightRay = normalize(light-surface);
    vec3 lightEye = normalize(ray + lightRay);
    float bp = pow(max(0., dot(snorm, lightEye)), .9);
    //c += collision.x*2000000.;
    c += .1;
    float id=collision.y;
    float lc = volume/20.;
    c += float(id==1.)*lc;
    c.r += float(id!=1.)*id;
    c.g += float(id!=1.)*id/2.;
    c.b += float(id!=1.)*id/4.;
    c += bp*lc/ldist*10.;
    c = min(c, vec3(1));
    c -= collision.z/200. * vec3(1,1,.5);
  }
  //c *= .2;

  gl_FragColor=vec4(c, 1);
}

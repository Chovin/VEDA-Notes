/*
{
  "audio": true,
  "pixelRatio":1,
	"frameskip": 1,
	"PASSES" : [{
		"TARGET": "backTexture",
	},
	{
		"TARGET": "theBB",
	}],
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
uniform sampler2D backTexture;
uniform int PASSINDEX;

#pragma glslify: noise    = require('glsl-noise/simplex/4d')
#pragma glslify: perlin    = require('glsl-noise/classic/4d')

float C,S;
#define rot(a) mat2(C=cos(a), S=sin(a), -S, C)
#define hash(x) fract(sin(x)*1e4)

const float PI = 3.14159265358979323846264338328;
const float PI2 = PI*2.;

const float EPSILON = .0000005;
const int MAX_ITER = 9999;

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


// vec2 sdf(vec3 p) {
//   float scene = 0.;
//   vec3 light = p-vec3(sin(time)*3., cos(time/2.)*3., sin(time/3.)*5.);
//   float lightc = length(light) -.1;
//   vec3 bp = p;
//   bp = mod(p-vec3(0,0,time), 8.) -4.;
//   bp.xy *= rot(time);
//   bp.xz *= rot(time);
//   bp.yz *= rot(-time/2.);
//   float box = vmax(abs(bp) - 1.);
//   float bcirc = length(bp) - .25-volume/10.;
//   //box = max(box, -bcirc);
//
// 	pModPolar(bp.yz, 4.);
// 	pModPolar(bp.yx, 4.);
// 	float cyl = max(length(bp.xz) - .25, abs(bp.y) - 4.);
// 	cyl = max(cyl, bcirc);
// 	box = max(box, -cyl+.3);
// 	box = min(box, cyl);
//
//   p.z += time;
//   vec3 repc = mod(p-.5,6.)-3.;
//   float circ = length(repc) - .5;
//
//   scene = min(circ,lightc);
//   scene = min(scene, box);
//
//   float id = 0.;
//   id += float(scene==lightc);
//   id += float(scene==box)*2.;
//
//   return vec2(scene, id);
// }
vec2 sdf(vec3 p){
	float scene = 0.;
	float id = 0.;
	// light
	vec3 light = p-vec3(sin(time)*3., cos(time/2.)*3., sin(time/3.)*5.);
	float lightc = length(light) -.1;
	scene = lightc;

	vec3 cp = p;
	pR(cp.xz, -time);
	//pR(cp.yz, PI*.3);
	//cp.y += time*3.;
	float sz = 10.;
	//cp = mod(cp-sz/2., sz) - sz/2.;
	pR(cp.xy, -time+volume/100.);
	pModPolar(cp.yx, 3.);
	cp.y-=.5+volume/20.;
	float cyls = length(vec3(cp.x,cp.y-2.98,cp.z)) - 3.;
	float cylb = max(length(cp.xz) - .1, abs(cp.y+10.) - 10.);
	pR(cp.xy, time*3.);
	pModPolar(cp.yx,15.);
	float cyl = max(length(cp.xz) - .2, abs(cp.y) - 3.);
	float cylt = max(length(vec2(cp.z, cp.y-3.)) - .1, abs(cp.x) - .5);
	cyl = min(cyl, cylt);
	cyl = max(cyl, cyls);
	cyl = min(cyl, cylb);

	// vec3 np = p - vec3(0,0,40.);
	// np.y += time*3.;
	// sz = 50.;
	// np.yx= mod(np.xz-sz/2., sz) - sz/2.;
	// float circ = length(np) - 10.-volume/2.;

	vec3 bp = p;
	pR(bp.xy, time);
	pR(bp.xz, -time);
	pR(bp.yz, time*.75);
	pModPolar(bp.zx,4.);
	pR(bp.xy, time*.6);
	pModPolar(bp.xy,6.);
	pR(bp.yz, -time*.6);
	float cube = vmax(abs(bp) - 4.5);
	cube = max(cube, -(length(bp+sin(time)/6.) - 6.9));

	vec3 skyp = p;
	vec3 skyn = vec3(-1,0,0);
	// pR(skyp.xz, time/3.);
	// pR(skyp.xy, time/4.);
	// pR(skyp.yz, -time/5.);
	pModPolar(skyp.xz, 4.);
	pModPolar(skyp.xy, 4.);
 	float sky = dot(skyp, normalize(skyn)) + 20.;


	scene = min(scene, cyl);
	scene = min(scene, cube);
	scene = min(scene, sky);
	//scene = max(scene, circ);
	id += float(scene==lightc);
	id += float(scene==cylt)*2.;
	id += float(scene==cylb)*2.;
	id += float(scene==cube)*3.;
	id += float(scene==sky)*4.;

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


void maintex() {
	vec3 c = vec3(.1,.1,.13);
	vec2 uv = gl_FragCoord.xy/resolution.x;
	float screen_ratio = resolution.x/resolution.y;
	uv += vec2(-.5, -.5/screen_ratio);

	float sz = .03;
	pModPolar(uv, 6.);
	uv.x -= time/18.;
	c += step(mod(length(uv), sz),sz/2.);
	c -= vec3(.4,.9,.2);

	gl_FragColor=vec4(c, 1);
}

void mainsdf() {
  vec3 c = vec3(.1,.1,.13);
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
	vec2 stretch = vec2(-.5, -.5/screen_ratio);
  uv += stretch;

  vec3 screen = vec3(0,0,-1); // screen position
  float sdist = 15.;           // screen distance
	pR(screen.xz, time/3.);
	pR(screen.yz, sin(time/4.)*.6);
  screen = normalize(screen)*sdist; // fix any rotation error
  vec3 lookv = normalize(-screen);
  vec3 up = vec3(0,1,0);
  //up.xy *= rot(time/4.);
  float fov = 90.;
  float ssize = 1.;          // screen size (opposite of zoom)


  mat3 looked = look(uv, screen, lookv, up, fov, ssize);
  vec3 cuv = looked[0];
  vec3 ray = looked[1];

  vec3 collision = raycast(cuv, ray);  // vec3(iter_dist, id, dist)

  vec3 light = vec3(sin(time)*3., cos(time/2.)*3., sin(time/3.)*5.);

  if (collision.x<EPSILON) {
    vec3 surface = cuv+ray*collision.z;
    vec3 snorm = calcNormal(surface);
    vec3 lightRay = normalize(light-surface);
    vec3 lightEye = normalize(ray + lightRay);
    float bp = pow(max(0., dot(snorm, lightEye)), .9);

    c += .03;
    c += float(collision.y==0.)* vec3(.0,.4,.2);
    c += float(collision.y==1.);
    c += float(collision.y==2.) * vec3(.2,.1,.4)*2.;
		c += float(collision.y==3.) * vec3(.5+sin(time)*.3,.1,cos(time)*.3)*2.;
		mat3 lookm = look(looked[0].xy, vec3(0)-snorm*20., snorm, vec3(0,1,0), 90., 1.);
		vec3 camn = looked[1];
		pModPolar(camn.xz, 4.);
		pModPolar(camn.yz, 4.);
		// failed mapping.. probably cause not projected
		vec3 tex = texture2D(backTexture, (camn.xy/2.-stretch)*vec2(1,screen_ratio)).xyz;
		c += float(collision.y==4.)*(tex-.9);
    c += bp;
  }

	//c = texture2D(backTexture, uv+.5).xyz;

	vec3 snorm = vec3(0,0,1);
	pR(snorm.xy, time);
	pR(snorm.yz, time);
	snorm = normalize(snorm);

	vec3 cam = vec3(uv*20.,-10.);

	// returns mat3 of view screen, ray, and vec3(0)
	//mat3 look(vec2 cam_space, vec3 screen_origin, vec3 cam_dir, vec3 cam_up, float fov, float size) {


	//vec3 tex = texture2D(backTexture, face.xy).xyz;

	//c += tex;

  gl_FragColor=vec4(c, 1);
}

void main() {
	if (PASSINDEX == 0) {
		maintex();
	}else{
		mainsdf();
	}
}

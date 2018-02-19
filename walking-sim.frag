/*
{
  "audio": true,
  "pixelRatio":1,
	"frameskip":2,
	"keyboard": true,
	"server": 1234,
	"PASSES": [
	{
		"TARGET": "memory",
		"FLOAT": true
	}, {}]
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
uniform int	PASSINDEX;
uniform int FRAMEINDEX;
uniform sampler2D memory;
// keyboard
uniform sampler2D key;
uniform sampler2D font;

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

const float EPSILON = .005;
const int MAX_ITER = 909;

const float viewDist = 10.;
#define light vec3(sin(time/10.)*(viewDist), cos(time/10.)*(viewDist),0)

vec2 sdf(vec3 p) {
	vec3 gp = p;
	float bsz = 1.25;
	//pR(bgp.xz, time);
	gp.y += sin(gp.x)/8.;
	gp.y += sin(gp.z)/8.;
	vec3 bgp = gp;
	pModPolar(bgp.xz, 6.);
	bgp.xz = mod(bgp.xz+bsz/2., bsz)-bsz/2.;
	float bumps = length(bgp*vec3(1,2.,1)) - bsz/2.;
	float ground = vmax(abs(gp + vec3(0,viewDist,0)) - vec3(1)*viewDist);
	gp.y += min(bumps, ground);
	ground = vmax(abs(gp + vec3(0,viewDist,0)) - vec3(1)*viewDist);
  //float ground = dot(gp, normalize(vec3(0,1,0))) + 0.1;
  float horizon = length(p) - viewDist*.8;
	vec3 gwhs = vec3(.002, 1., .05);
	gwhs.y += sin(gp.z*40.)/3.+sin(gp.x*40.)/3.;
	gp.xz = mod(gp.xz+gwhs.z/2.,gwhs.z)-gwhs.z/2.;
	gp.x += sin(time+sin(time)/2.+gp.y*5.)*gwhs.z/3.;
	gp.z += sin(time+sin(time)/2.+gp.y*5.)*gwhs.z/3.;
	float grass = max(length(gp.xz*(gp.y*2.+.5)) - gwhs.x, abs(gp.y) - gwhs.y/2.);
  //ground = max(ground, horizon);
	ground = min(ground, grass);

  vec3 cp = p;
  float sz = 1.;


  pModPolar(cp.xz, 4. + floor(volume));
	pR(cp.xy, floor(volume/2.)/3.);
  cp.z= mod(cp.z+sz/2., sz)-sz/2.;

  float h = 1.4;
	float wh = 2.25;
  float w = .4;
  float fw = w*1.2;
  cp -= vec3(fw*3.1,0,0);
  float sp = vmax(abs(cp) - vec3(.1,h,w));
  float spc = length(abs(cp)-vec3(0,h,-0.19)) - .6;
  float sp2 = vmax(abs(cp - vec3(0,h*.75,0)) - vec3(.1,h,w));

  float wall = vmax(abs(cp) - vec3(.075,wh,5.));

  spc = max(spc, sp2);
  sp = min(sp, spc);
  sp = max(-sp, wall);

	vec3 ccp = p;
	ccp.y -= 1.;
	pR(ccp.xy, time);
	pR(ccp.xz, time);
	pModPolar(ccp.yz, 4. + volume);
	pModPolar(ccp.xy, 4. + volume);
	float cube = vmax(abs(ccp) - .3);

	vec3 cyp = p;
	cyp.y -= 1.3;
	pR(cyp.xz, floor(time)*(PI2/(3.)));
	pR(cyp.yz, time/2.);
	pR(cyp.xy, time);
	pModPolar(cyp.xz, 3. + floor(volume/6.));
	cyp.x -= 3.;
	pR(cyp.yz, time/2.);
	pR(cyp.xy, time);
	float cbcyl = max(length(cyp.xz) - .15, abs(cyp.y) - .6);
	cube = min(cube, cbcyl);

	sp = min(sp, cube);

  float scene = sp;
  float id = 0.;

  float lsp = length(p-light) - .2;

  scene = min(scene, ground);
  scene = max(scene, horizon);
  scene = min(scene, lsp);

  id = float(scene==lsp)*1.;
  id += float(scene==ground)*2.;

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

void mainFrag() {
	vec3 c = vec3(.1,.1,.13);
	vec2 uv = gl_FragCoord.xy/resolution.x;
	float screen_ratio = resolution.x/resolution.y;
	uv += vec2(-.5, -.5/screen_ratio);

	vec2 ma = gl_FragCoord.xy/resolution/resolution;
	vec3 pos = texture2D(memory, ma).rgb;
	// ma.x += 1./resolution.x;
	// vec3 memu = texture2D(memory, ma).rgb;  // mouse
	ma.x += 2./resolution.x;
	vec3 langle = texture2D(memory, ma).rgb;  // angle

	vec3 screen = vec3(0,1,1); // screen position
	//screen.xz = pos;
	//screen = vec3(pos.r,.5,-1. + pos.g);
	float sdist = 1.;           // screen distance
	//pR(screen.xz, uv.y*8.+time);
	//pR(screen.xz, time/6.);
	// screen.xz *= rot(time/9.);
	// screen.yz *= rot(time/12.);
	screen = normalize(screen)*sdist; // fix any rotation error
	//vec3 lookv = normalize(-screen);
	vec3 lv = vec3(0,0,-1);
	// pR(lv.xz, langle.r);
	// pR(lv.yz, langle.g);
	vec3 lookv = normalize(lv);
	vec3 up = vec3(0,1,0);
	//up.xy *= rot(time/5.);
	float fov = 90.;
	float ssize = 1.;          // screen size (opposite of zoom)

	langle.g *= .8;
	ssize *= abs(langle.g);
	lookv.yz*=rot(-langle.g);
	lookv.xz*=rot(langle.r);
	screen += pos;
	mat3 looked = look(uv, screen, lookv, up, fov, ssize);
	vec3 cuv = looked[0];
	vec3 ray = looked[1];

	vec3 collision = raycast(cuv, ray);  // vec3(iter_dist, id, dist)

	c = (light.y/viewDist)*vec3(.4,.4,.7);

	if (collision.x<EPSILON) {
		vec3 surface = cuv+ray*collision.z;
		vec3 snorm = calcNormal(surface);
		vec3 lightRay = normalize(light-surface);
		vec3 lightEye = normalize(ray + lightRay);
		float id = collision.y;
		float bbp = max(0., dot(snorm, lightEye));
		float bp = pow(bbp, .6);
		float gbp = pow(bbp, 2.);
		bp = bp*float(id!=2.) + gbp*float(id==2.);
		bp /= length(light-surface);
		vec3 lc = vec3(1,.7*(light.y/viewDist)+.2,.6*(light.y/viewDist));
		vec3 bc = lc;
		bc.rb*=rot(surface.y);
		c = vec3(0);
		c += float(id==0.)*bc;
		c += float(id==1.)*lc;
		float slen = length(surface) + texture2D(spectrum, vec2(length(surface/50.))).x;
		float tgc = time*3. + sin(time)*volume/20.;
		vec3 gc2 = vec3(cos(time),0,.5+sin(time))*float(slen>mod(tgc, viewDist/3.) && slen<mod(tgc+.3, viewDist/3.));
		c += float(id==2.)*(vec3(0,.2,.1)/2. + gc2);
		c += .1*(bp)+lc*.1*light.y/max(viewDist, 0.);
		c += bp*lc*3.;
	}
	//c.rg = pos;
	gl_FragColor=vec4(c, 1);
}

void mainComp() {
	if (FRAMEINDEX == 0) {
		gl_FragColor = vec4(0);
	} else {
		vec3 c = vec3(0);
		vec2 uv = gl_FragCoord.xy / resolution;
		vec3 d = vec3(texture2D(key, vec2(65. / 256.)).r*-1. + // a
									texture2D(key, vec2(68. / 256.)).r,			 // d
									texture2D(key, vec2(83. / 256.)).r*-1. + // s
									texture2D(key, vec2(87. / 256.)).r,  		 // w
									texture2D(key, vec2(32. / 256.)).r);		 // space
		vec2 nuv = gl_FragCoord.xy/resolution.x;
		float screen_ratio = resolution.x/resolution.y;
		nuv += vec2(-.5, -.5/screen_ratio);

		// get screen to write to as memort
		vec3 mem = texture2D(memory, uv).rgb;
		// to read fragments in sequential order
		// fill whole screen with bottom left fragment
		vec2 ma = gl_FragCoord.xy/resolution/resolution;
		vec3 memr = texture2D(memory, ma).rgb;  // position
		// move whole screen to next fragment right
		ma.x += 1./resolution.x;
		vec3 memu = texture2D(memory, ma).rgb;  // mouse
		ma.x += 1./resolution.x;
		vec3 mema = texture2D(memory, ma).rgb;  // angle
		ma.x += 1./resolution.x;
		vec3 memj = texture2D(memory, ma).rgb;  // jump

		//vec2 dm = mouse - memu.rg;  // change in mouse // that didn't work
		vec2 a = memu.rg;
		vec2 cmouse = mouse-.5;
		a.r = mod(mema.r + float(abs(cmouse.x)>.1)*(abs(cmouse.x)-.1)*sgn(cmouse.x)*.3, PI2);
		vec2 auv = nuv;
		pR(auv, -a.r - PI/2.);
		c += float(auv.y>-.002 && auv.y<.002 &&
							 auv.x>.03 && auv.x<.05);

		// up/down angle
		a.g = clamp(mema.g + float(abs(cmouse.y)>.1)*(abs(cmouse.y)-.1)*sgn(cmouse.y)*.15, PI/2., -PI/2.);
		vec3 look = vec3(0,0,1);
		pR(look.yz, a.g);
		vec2 upv = vec2(nuv.x,nuv.y)*PI;
		//upv.y -= look.y;
		c += float(upv.x < .05 && upv.x > -.05 &&
							 upv.y > look.y - .01 && upv.y < look.y + .01);
		//c += float(length(upv)<.01);

		float speed = .05;
    d *= speed; // pack
		pR(d.xy, a.r + PI); // rotate to view

		// jump
		bool onGround = memr.g <= .001;
		bool canJump = memr.g <= .05;

		memj.b -= speed*.2;  // gravity
		memj.b += float(onGround)*(d.z*4.);  // += dy

		memr.g += memj.b;
		memr.g = max(0., memr.g);

		memr.rb += d.xy;  // move

		// just for visualization
		c += vec3(float(length(uv-(d.xy+.5))<.01+d.z/2.));
		c += vec3(float(length((nuv-memr.rb/8.)*32.))<.1+memr.g);
		// // write bottom left fragment to .5 + d
		// c.r += float(vmax(uv*resolution)<1.)*(d.x+mem.r);
		// // write next fragment to the right
		// vec2 fc = uv*resolution;
		// c.g += float(vmax(vec2(fc.x-1.,fc.y))<1. &&
		// 									 fc.x > 1.)*(d.y+mem.g);
		c += float(uv.x>.99)*(memr);
		c += float(uv.x<.99 && uv.x>.98)*(memj);
		c += float(uv.x<.98 && uv.x>.97)*(float(onGround));
		// c.rg += float(uv.y>.99)*(memu.rg);

		vec2 fc = uv*resolution;
		c += float(vmax(fc)<1.)*(memr);
		// c.rg += float(vmax(vec2(fc.x-1.,fc.y))<1. &&
		//  									fc.x > 1.)*(mouse+memr.rg);
		c.rg += float(vmax(vec2(fc.x-2.,fc.y))<1. &&
		 									fc.x > 2.)*(a);
		c.b += float(vmax(vec2(fc.x-3.,fc.y))<1. &&
		 									fc.x > 3.)*(memj.b);

    gl_FragColor = vec4(c, 1);
	}
}

void main() {
	if (PASSINDEX == 1) {
		mainFrag();
		//mainComp();
	}
	else {
		mainComp();
	}
}

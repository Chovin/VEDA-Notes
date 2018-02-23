/*
{
  "audio": true,
  "pixelRatio":3,
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

const float EPSILON = .0000005;
const int MAX_ITER = 9999;

float sdf(vec2 p) {
  //p = mod(p+.15, .3)-.15;
  return length(p)-.05;

  //  len({.2,0}-.1) -.1
}

float C,S;
#define rot(a) mat2(C=cos(a), S=sin(a), -S, C)
#define hash(x) fract(sin(x)*1e4)

vec2 sdf(vec3 p) {
  vec3 op = p;
  float swt = -1./3.;
  float sz = .5;// + (volume * float(sin(time/3.)<swt))/10.
  p.xyz = mod(p.xyz + sz/2., sz) - sz/2.;
  //p.z -= mod(time/200. + volume/10.,sin(time)*5.-10.) * float(sin(time/3.)<swt);
  vec3 sp = p;
  float s1 = 0.; sin(time/5.);
  float s2 = 0.; cos(time/7.)/2. + sin(time/9.)/2.;
  float s3 = 0.; sin(time/4.)/3. - cos(time/12.)/3.;
  //p.x += sin(time/4.) * 2.;
  //p.y += sin(time/5. + volume/40.) * 2.;
  //p.x -= texture2D(spectrum, mod(op.xy*20.+.15, .3)-.15 ).y*4.;
  float oo = texture2D(spectrum, floor(abs(op.zy + sin(time)*2. + s1*2.) *1000.)/400000.).x*3.;
  float pp = texture2D(spectrum, floor(abs(op.xy + sin(time)*2. +s2*3.) *1000.)/400000.).y*3.;
  float yy = texture2D(spectrum, floor(abs(op.yx+oo-pp + sin(time)*2. + s3*2.) *1000.)/400000. ).y*3.;
  float r =-.55 + yy*1.25 - oo - pp;
  return vec2(length(p)-r/2., p.y) - sp.z;
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


void main() {
  vec3 c = vec3(0,0,0);
  // vec2 uv = gl_FragCoord.xy/resolution.x;
  // float screen_ratio = resolution.x/resolution.y;
  // uv += vec2(-.5, -.5/screen_ratio);
  // vec2 nm = vec2(mouse.x, mouse.y)*gl_FragCoord.xy/resolution.x/2.-vec2(.15);
  // vec4 ba = texture2D(backbuffer, gl_FragCoord.xy / resolution);
  //uv = mod(uv+.2, .4)-.2;


  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  uv += vec2(-.5, -.5/screen_ratio);

  // doing screen origin so I can easily control screen distance from scene
  vec3 screen_origin = vec3(0.,0, -6);
  screen_origin.xz *= rot(time/6.);
  vec3 cam_dir = normalize(vec3(0) - screen_origin);
  vec3 cam_up = vec3(vec2(0,1)*rot(time/8.), 0);
  float fov = 90.;
  // opposite of zoom
  float screen_size = 1.;
  // https://cdn.discordapp.com/attachments/206277423120121857/399910186372038658/image.png
  // screen_size/2. * sin(90-fov/2.)/sin(fox/2.)
  // sin(pi/2 - x) / sin(x) == cot(x)
  float cam_dist = (screen_size/2.)/tan(radians(fov/2.));
  vec3 cam_origin = screen_origin - cam_dir * cam_dist;
  // now to transform world to place into screen position
  // scale > rotate up > rotate toward cam_dir > translate
  vec3 nuv = vec3(uv*screen_size,0); // scale
  // rotate up isn't as important :3
  nuv.xy *= rot(time/9.);
  vec3 olook = vec3(0,0,1);
  // https://math.stackexchange.com/questions/180418/calculate-rotation-matrix-to-align-vector-a-to-vector-b-in-3d

  // vec3 v = normalize(cross(olook, cam_dir));
  // float s = length(v);
  // float co = dot(olook, cam_dir);
  // mat3 sscp = mat3(0,    v.z,  -v.y,
  //                  -v.z, 0,    v.x,
  //                  v.y,  -v.x, 0);
  // mat3 r = mat3(1,0,0,0,1,0,0,0,1) + sscp + sscp*sscp / (1. + co);
  // // handles where vectors point in same direction
  // r = step(length(olook-cam_dir), abs(EPSILON/20000.)) * r +
  //     step(abs(EPSILON/20000.), length(olook-cam_dir)) * mat3(1,0,0,0,1,0,0,0,1);
  // r = step(length(olook+cam_dir), abs(EPSILON/20000.)) * r +
  //     step(abs(EPSILON/20000.), length(olook+cam_dir)) * -mat3(1,0,0,0,1,0,0,0,1);
  // // TODO: don't forget to handle when vectors are 180
  vec3 forward = normalize(cam_dir);
  vec3 right = cross(normalize(cam_up), forward);
  vec3 up = cross(forward, right);

  mat3 r = mat3(right.x, up.x, forward.x,
                right.y, up.y, forward.y,
                right.z, up.z, forward.z);

  nuv *= r; // rotate
  nuv += screen_origin; // translate

  // then make the ray
  vec3 ray = normalize(nuv - cam_origin);

  // collision, id, dist
  // nuv.xy *= rot(time);
  // nuv.xz *= rot(time/5.);
  vec3 collision = raycast(nuv, ray);

  c = vec3(collision.y>0.);

  vec3 light = vec3(0, -40, 50);
  light.yz *= rot(time*1.);
  if (collision.x < EPSILON) {
    vec3 surface = nuv+ray*collision.z;
    vec3 snorm = calcNormal(surface);
    vec3 light_ray = normalize(light-surface);
    vec3 skimangle = cross(snorm, light_ray);
    float intensity = max(dot(snorm, light_ray), 0.);

    float power = dot(ray,skimangle)/length(light-surface);
    c = vec3(power);

    c += vec3(1.-collision.z/1.)/20.;
    c.r *=collision.y*6.;
    c.b +=collision.z/19.;

  }
  c = min(c, 1.);

  c.rg = rot(time/8.)*c.rg;
  c.gb = rot(time/13.)*c.gb;

  gl_FragColor = vec4(c/5., 1.);
}

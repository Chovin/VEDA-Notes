/*
{
  "vertexCount": 30,
  "vertexMode": "POINTS"
}
*/

precision mediump float;
attribute float vertexId;
uniform float vertexCount;
uniform float time;
uniform vec2 resolution;
varying vec4 v_color;

float C,S;
#define rot(a) mat2(C=cos(a), S=sin(a), -S, C)
#define hash(x) fract(sin(x)*1e4)

const float PI = 3.14159265358979323846264338328;
const float PI2 = PI*2.;

#define PHI (sqrt(5.)*0.5 + 0.5)


void main() {
  float i = vertexId + time *.25;
  float r = resolution.x/resolution.y;
  float xya = sin(i+time/i)*PI;
  float zya = cos(i*1.5-i/time+mod(vertexId,5.)/5.)*PI;

  vec3 pos = vec3(1,0,0);

  pos.xy *= rot(xya);
  pos.zy *= rot(zya);
  pos.xz *= rot(time-xya*zya);
  pos.xy *= rot(PI/2.+time);

  pos.x /= r;

  gl_Position = vec4(pos.x, pos.y, pos.z, 1);
  gl_PointSize = 3. / max(length(pos+vec3(0,0,2)), 1.);

  v_color = vec4(vec3(fract(vertexId / 3.), 1, 1)/4., 1);
}

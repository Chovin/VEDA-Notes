/*
{
  "audio": true,
  "pixelRatio": 2
}
*/

// move mouse
// avoid black balls
// mouse top right to reset

// memory is the bottom left box

precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform sampler2D samples;
uniform sampler2D spectrum;
uniform float volume;
uniform vec2 mouse;
uniform sampler2D backbuffer;

void main(){
  vec3 c = vec3(.1,.1,.15);
  vec2 uv = gl_FragCoord.xy/resolution.x;
  float screen_ratio = resolution.x/resolution.y;
  vec2 ouv = uv;
  uv += vec2(-.5, -.5/screen_ratio);
  vec2 muv = uv + vec2(.5);
  float mem_px_sz = 4.;
  vec2 memuv = mod(gl_FragCoord.xy,mem_px_sz)/resolution.xy;

  vec3 ba = texture2D(backbuffer, memuv).rgb;

  vec3 mem = ba;

  vec2 offset = vec2(sin(time*1.56)/2. + sin(volume/10.)/6. + cos(time*2.)/5.,
                     cos(time/2. + volume/20.)/4. + tan(time*1.35));

  bool in_circle = length(uv.xy+offset)<.1 + sin(time/2.)/12. + .02;
  bool min_circle = length(memuv.xy+offset)<.1 + sin(time/2.)/12. + .02;

  if (in_circle) {
    c = vec3(mem.r,0,0);
  }

  bool in_mouse = length(abs(muv - mouse))<0.01;
  bool min_mouse = length(abs((memuv+mouse) - mouse))<0.01;
  bool minc_mouse = length((mouse-vec2(.5))+offset )<.1 + sin(time/2.)/8. + .05;

  c.r += float(in_mouse);

  //wipe memory line for refresh
  if (gl_FragCoord.y <= mem_px_sz) {
    c = vec3(0);
  }

  float t = sin(time/2.);
  float pt = sin((time-.1)/2.);

  if (gl_FragCoord.x <= mem_px_sz && gl_FragCoord.y <= mem_px_sz) {
    if (minc_mouse) { // t < 0. && pt > 0.
      mem = vec3(1);
    }
    if (mouse.x > .9 && mouse.y > .9) {
      mem = vec3(0);
    }
    c = mem;
  }

  // if (length(mem)>=1.) {
  //   c = vec3(1);
  // }


  gl_FragColor = vec4(c, 1.);
}

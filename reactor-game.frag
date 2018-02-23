/*
{
  "audio": true,
  "pixelRatio":2,
  "glslify": true,
  //"server": 1234,
  "PASSES": [{
    "TARGET": "memory",
    "FLOAT": true
  }, {}]
}
*/


// -- CONFIG --

const int DIFFICULTY = 0;  // 0: easy, 1: medium, 2: hard, 3: master

// ------------


precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform sampler2D samples;
uniform sampler2D spectrum;
uniform float volume;
uniform vec2 mouse;
uniform int  PASSINDEX;
uniform int FRAMEINDEX;
uniform sampler2D backbuffer;
uniform sampler2D memory;

const float PI = 3.14159265358979323846264338328;
const float PI2 = PI*2.;

#define PHI (sqrt(5.)*0.5 + 0.5)

// helpers from http://mercury.sexy/hg_sdf/

// Maximum/minumum elements of a vector
float vmax(vec2 v) {
  return max(v.x, v.y);
}

float vmax(vec3 v) {
  return max(max(v.x, v.y), v.z);
}

float vmin(vec2 v) {
  return min(v.x, v.y);
}

float vmin(vec3 v) {
  return min(min(v.x, v.y), v.z);
}

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


// memory positions
const int PP = 0;  // paddle pos (angle, width, radius)
const int MS = 1;  // misses (misses, missed recently [1..0], )
const int SK = 2;  // gotta have screenshake (angle, magnitude, )
const int PT = 3;  // points (points, won, time we won)
const int GS = 4;  // game state (time we lost if game_over else 0, , )
const int NB = 5;  // number of balls
const int BALL_MEM = NB+1;  // start of ball memory
const int MAX_BALLS = 10; // number of balls. not a memory location
const int MALLOCD = BALL_MEM + MAX_BALLS*2;

// TODO: wrap around
vec3 mget(int i) {
  float x = (float(i)+.5)/resolution.x;
  float y = (0. + .5)/resolution.y;
  return texture2D(memory, vec2(x, y)).rgb;
}

void mset(int i, inout vec3 c, vec3 val) {
  int vx = int(gl_FragCoord.x);
  int vy = int(gl_FragCoord.y);
  int x = i;
  int y = 0;
  c += float(vx == x && vy == y)*val;
}

struct Ball
{
  int id;
  vec2 pos;
  float radius;
  vec2 vel;
  float bounce;
};

// this stuff didn't pan out cause we can't take in a const as an arg and use it to index an array
// Ball get_ball(vec3 m[MALLOCD], int i) {
//   int oi = i;
//   _ball_id_to_mem_id(i);
//   vec3 posr = m[i];
//   vec3 velb = m[i+1];
//   return Ball(oi, posr.xy, posr.z, velb.xy, velb.z);
// }

// void set_ball(inout vec3 m[MALLOCD], Ball ball, const int id) {
//   // m[id + 3] = vec3(2);  // no work
//   // m[id*2 + BALL_MEM] = vec3(ball.pos, ball.radius);
//   // m[id*2 + BALL_MEM+1] = vec3(ball.vel, ball.bounce);
//   // m[id] = vec3(ball.pos, ball.radius);
//   // m[id+1] = vec3(ball.vel, ball.bounce);
// }

Ball spawn_ball(inout vec3 m[MALLOCD], inout vec3 c) {
  float num_balls = m[NB].r;
  // attempt to kinda randomize
  float seed = num_balls/15. + time + mouse.x*3. + mouse.y + mod(float(FRAMEINDEX), 5.)*1.5*length(mouse);
  Ball ball = Ball(
    int(num_balls),
    vec2(sin(seed), cos(seed))*.1*mod(seed+float(FRAMEINDEX)/200., 1.),
    1. + sin(time)/2.,
    vec2(sin(seed/2.), cos(seed/2.))*max(abs(sin(seed*3.+float(FRAMEINDEX)/200.))*.005,.0025),
    1.025 + cos(time)*.02);
  m[NB].r = num_balls + 1.;
  //can't set ball because id isn't constant
  //set_ball(m, ball);
  int bid = ball.id;
  bid *= 2;  // ball size
  mset(BALL_MEM + bid, c, vec3(ball.pos, ball.radius)); // is only ok if 1st time ball is spawned
  mset(BALL_MEM + bid+1, c, vec3(ball.vel, ball.bounce));
  return ball;
}

void read_mem(inout vec3 m[MALLOCD]) {
  for(int i = 0; i < MALLOCD; i++)
  {
    m[i] = mget(i);
  }
}

void write_mem(inout vec3 c, vec3 m[MALLOCD]) {
  for(int i = 0; i < MALLOCD; i++)
  {
    mset(i, c, m[i]);
  }
}

void compute() {
  vec3 c = vec3(0);
  vec3 m[MALLOCD];
  read_mem(m);

  if (FRAMEINDEX==0) {  // init
    m[GS].r = 0.;
  }else{  // update

    vec2 uv = gl_FragCoord.xy/resolution;
    float screen_ratio = resolution.x/resolution.y;
    vec2 nuv = gl_FragCoord.xy/resolution.x;
    nuv += vec2(-.5, -.5/screen_ratio);

    vec2 mu = mouse - .5;
    float a = atan(mu.x, mu.y)/PI2;

    float dl = uv.y;  // debug line
    c += float(dl>.99 && dl <1.)*m[PP];
    c += float(length(nuv-mu*.2)<.01)*.1;
    dl += .01;
    c += float(dl>.99 && dl <1.)*(m[NB].r/float(MAX_BALLS));
    // /debug

    bool won = m[PT].r > 42.;  // magic number for when the paddle is filled with white
    bool game_won = won && m[PT].g != 1.;
    m[PT].b = m[PT].b*float(!game_won) + float(game_won)*time;  // time when we won
    m[PT].g = float(won);

    if (mod(float(FRAMEINDEX)+50., 100.)==0. && m[NB].r<float(MAX_BALLS)) {
      Ball b = spawn_ball(m, c);
    }

    // paddle center.
    vec2 padb = vec2(0,-1);
    pR(padb, m[PP].r*PI2);
    padb *= m[PP].b+.025;  // offset to the back of the paddle for better bounce feel

    // debugging
    c += float(length(nuv + padb*.5) < .01)*.1;
    dl += .05;
    c.r += float(dl>.99 && dl <1.)*m[MS].r;

    float missed = 0.;
    float lost_one = m[MS].g;
    for(int id = 0; id < MAX_BALLS; id++)
    {
      if (id >= int(m[NB].r)) {break;}
      vec3 posr = m[id*2 + BALL_MEM];
      vec3 velb = m[id*2 + BALL_MEM + 1];
      Ball b = Ball(id, posr.xy, posr.z, velb.xy, velb.z);

      bool outside = length(b.pos) > m[PP].b + .075;
      if (outside) {
        bool just_lost = outside && b.pos != vec2(-1.);
        lost_one =+ float(just_lost);
        // screenshake if we just lost one
        m[SK].rg = vec2(atan(-b.pos.x, -b.pos.y), length(b.vel)*2.)*float(just_lost) + float(!just_lost)*m[SK].rg;
        missed += 1.;
        b.pos = vec2(-1.);
      }else{

        // debugging
        // c += float(length(nuv + clamp(b.pos*.2,vec2(.25),vec2(-.3)))<b.radius*.01)*.2;
        // c += float(length(nuv + b.vel)<b.radius*.0015)*vec3(.2,0,0);
        // dl += .01;
        // c += float(dl>.99 && dl <1.)*(posr);
        // dl += .01;
        // c += float(dl>.99 && dl <1.)*(velb);

        vec2 bray = normalize(padb - b.pos);

        float angle = m[PP].r*PI2;
        vec2 bpos = -b.pos;
        pR(bpos, -angle);
        float a = atan(bpos.x, bpos.y);
        float w = m[PP].g;
        float sr = b.radius*.01 + volume/3000.;  // increase radius by volume
        bool hit = length(bpos)>m[PP].b-.025-sr &&
                   length(bpos)<m[PP].b+.025+sr &&
                   a>-w/2. && a<w/2.;

        vec2 bounce = float(hit)*(normalize(-b.vel-bray)*length(b.vel));
        b.vel += float(hit)*(-b.vel + (bounce*1.025)*float(!won) + (normalize(-b.pos)*length(b.vel))*float(won)) ;
        bounce = -bounce*.5*(b.radius+length(b.vel));
        // screenshake on hit
        m[SK].r = atan(bounce.x, bounce.y);
        m[SK].g += .01*float(hit);

        b.vel = b.vel + b.vel*float(int(m[MS].r)==MAX_BALLS-1)*.001*float(!won); // speed up ball if last

        b.pos += b.vel * (.8 + volume/150. + mod(volume, 1.)*.8);  // speed up the ball based on volume? ¯\_(ツ)_/¯
      }

      m[id*2 + BALL_MEM] = vec3(b.pos, b.radius);
      m[id*2 + BALL_MEM + 1] = vec3(b.vel, b.bounce);
    }

    // screenshake decay
    m[SK].g *= .80;

    m[MS] = vec3(missed, lost_one*.92, 0);

    // make paddle smaller based on balls left
    float w = .3;
    float left = float(MAX_BALLS) - missed;
    w *= left/float(MAX_BALLS);

    // increase points based on balls left
    m[PT].r += left/(250. + float(DIFFICULTY)*25. - min(15., volume/30.));  // 300
    bool game_lost = int(left) == 0 && m[GS].r == 0.;
    m[GS].r = m[GS].r*float(!game_lost) + float(game_lost)*time;  // set GS.r to time that we lost

    bool game_over = m[GS].r != 0.;
    a = a*float(!game_over) + float(game_over)*m[PP].r;  // don't move paddle if game over

    // game over explosion screenshake
    m[SK].r += sin(mod(float(FRAMEINDEX), 3.)*time+time + cos(time*5.))*float(game_over);
    m[SK].g += max(0., (.05-(time-m[GS].r)*.025)*.2)*float(game_over);

    // grow paddle when won
    w = w*float(!won) + float(won)*min(PI2, m[PP].g*1.2);

    w*= max(1., volume/20.);  // gotta make the paddle bigger too if we're making ball bigger on volume

    m[PP] = vec3(a, w,.475/screen_ratio);
  }

  write_mem(c, m);
  gl_FragColor = vec4(c, 0);

}

void draw() {
  vec3 c = vec3(.1,.1,.13);
  vec3 m[MALLOCD];
  read_mem(m);

  if (FRAMEINDEX!=0) {

    vec2 uv = gl_FragCoord.xy/resolution.x;
    float screen_ratio = resolution.x/resolution.y;
    uv += vec2(-.5, -.5/screen_ratio);
    vec2 nsuv = uv;
    uv += vec2(sin(m[SK].r), -cos(m[SK].r))*m[SK].g;

    // draw balls
    for(int id = 0; id < MAX_BALLS; id++)
    {
      if (id >= int(m[NB].r)) {break;}
      vec3 posr = m[id*2 + BALL_MEM];
      vec3 velb = m[id*2 + BALL_MEM + 1];
      Ball b = Ball(id, posr.xy, posr.z, velb.xy, velb.z);
      c += float(length(uv + b.pos) < b.radius*.01);
      // glow
      c += abs((b.radius*.001 + min(.02, volume/1000.))/(length(uv + b.pos)-b.radius*.01));
    }

    // paddle
    float angle = m[PP].r*PI2;
    vec2 puv = uv;
    pR(puv, -angle);
    float a = atan(puv.x, puv.y);
    float w = m[PP].g;

    bool won = m[PT].g==1.;

    // fill paddle as points increase
    float pnts = length(puv)-(m[PP].b-.025+m[PT].r*.001);
    vec3 pc = vec3(.2-m[SK].g*20.,0,.5+m[SK].g*800.);  // blue when hit
    pc += .005/abs(pnts) + float(pnts < 0.)*2.;
    pc = min(vec3(1.), pc);
    // turn red if lost a ball recently
    pc -= vec3(0,1,1)*m[MS].g;

    // display number of balls left at top of win ring (that'll be what the player's thinks is points)
    vec2 tuv = uv;
    float stops = PI/float(MAX_BALLS)/2.;
    float left = float(MAX_BALLS) - m[MS].r;
    pR(tuv, stops*left + PI + stops/2. + sin(time*4.)*stops);  // turn down
    float ta = atan(tuv.x, tuv.y);
    // cut circle
    float top_brass = step(mod(ta+stops, stops*2.),stops)*float(ta+PI<stops*left*2.);
    // color shine on top_brass
    float t = 20.;
    bool shine = mod(float(FRAMEINDEX)+floor(a*PI), t)<t/2.;
    vec3 tbc = vec3(1,0,1) - float(shine)*(.3);
    pR(tbc.bg, floor(time*10.)/10. * float(shine));
    pc = pc - float(won)*tbc*top_brass;

    // draw paddle
    c += float(length(puv)>m[PP].b-.025 && length(puv)<m[PP].b+.025 && a>-w/2. && a<w/2.)*pc;
    vec3 pad_glow_c = vec3(1) - vec3(1,1,0)*(m[SK].g*20.);
    float pad_glow = .005/length(vec3((length(puv)-(m[PP].b-.025)),(length(puv)-(m[PP].b+.025)), (abs(a)-w/2.)/(4.+m[SK].g*200.)));
    c += pad_glow*pad_glow_c*float(m[PP].g>0.);  // draw glow if paddle exists

    // random sparks on win
    vec3 sparks = vec3(float(won)) * float(mod(float(FRAMEINDEX), 30.) < 5.+length(uv*10.));
    float spa = mod(time*sin(time)+float(FRAMEINDEX)*cos(time), PI2);
    float spd = m[PP].b * abs(mod(sin(time/2.)*float(FRAMEINDEX)+cos(time*3.)*time, 1.)) + .2;
    vec2 sp = uv + vec2(sin(spa), -cos(spa))*spd;
    vec3 spc = vec3(0);
    sparks *= (.005/abs(length(sp)/mod(float(FRAMEINDEX),3.)));

    c += sparks;

    // draw stars according to DIFFICULTY
    if (won) {  // probably more efficient to not calculate the stars unless we need to
      vec2 ruv = nsuv;
      ruv.y += .035 + sin(time*2.)*.01; // move down and bounce
      float mstars = 8.;  // number of stars to start with. we'll subtract from these
      float mstop = PI2/mstars;
      float diff = float(DIFFICULTY+1);
      pR(ruv, -mstop/2. - mstop*diff/2. + sin(time)*mstop/6.);  // center stars up top
      vec2 flt = ruv; // reference to filter the bottom stars
      pR(flt, mstop*diff + PI + mstop/2.);  // spin filter to cover bottom stars
      float fa = atan(flt.x, flt.y);
      bool sfilter = fa+PI<mstop*diff;
      pModPolar(ruv, mstars);  // repeat draw 8 stars
      ruv.x -= .17;
      pR(ruv, + sin(time/3. + sin(time/2.))*PI2 + PI); // spin stars
      pModPolar(ruv, 5.);  // 5 pointed star
      ruv *= 12.;
      ruv.x -= .1;
      ruv = abs(ruv);
      pR(ruv, PI/12.);
      vec3 starc = min(vec3(1), vec3(1,.5,0) + .07/length(ruv-.05));  // star color and glow
      float wt = max(0., time - m[PT].b - 1.);  // fade based on when we won the game
      float scperc = min(wt*2., 1.);  // fade in percentage
      starc = starc*(scperc) + c*(1.-scperc);
      bool a_star = abs(ruv.x-ruv.y)<0.2 && sfilter && won;
      c = float(a_star)*starc + float(!a_star)*c;  // draw stars on top of everything else
    }

    // game over explosion
    bool game_over = m[GS].r != 0.;

    float explosion = 0.;

    for(float i = 1.; i < 5.; i++)
    {
      explosion += (.005*i/2.)/abs(length(puv-vec2(0,m[PP].b))-((time-m[GS].r)/i));
    }
    c += float(game_over)*explosion;

    // outer glow
    vec2 suv = gl_FragCoord.xy/resolution;
    vec2 cuv = suv - vec2(.5);
    c += max(0.,-.35+length(cuv*.7*(1.+volume/800.)));

    // backbuffer trail
    c = c*.6 + texture2D(backbuffer, suv).rgb*.4;
    c = min(vec3(1.),c);
    //c *= .01;
  }
  gl_FragColor = vec4(c, 1);
}

void main() {
  if (PASSINDEX==0){
    compute();
  }else{
    draw();
    //compute();
  }
}

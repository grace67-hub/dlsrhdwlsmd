import { useEffect, useRef, useState } from 'react';

interface Props {
  onExit: () => void;
}

export const DinoGame = ({ onExit }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(() => Number(localStorage.getItem('dino_hi') || 0));
  const [gameOver, setGameOver] = useState(false);
  const stateRef = useRef({
    dinoY: 0, vy: 0, jumping: false, ducking: false,
    obstacles: [] as { x: number; w: number; h: number; type: 'cactus' | 'bird'; y: number }[],
    speed: 6, frame: 0, score: 0, dead: false, started: false,
  });

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const W = c.width, H = c.height;
    const GROUND = H - 20;
    let raf = 0;
    const s = stateRef.current;

    const reset = () => {
      s.dinoY = 0; s.vy = 0; s.jumping = false; s.ducking = false;
      s.obstacles = []; s.speed = 6; s.frame = 0; s.score = 0; s.dead = false;
      setScore(0); setGameOver(false);
    };

    const jump = () => {
      if (s.dead) { reset(); s.started = true; return; }
      if (!s.started) { s.started = true; return; }
      if (!s.jumping) { s.vy = -12; s.jumping = true; }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      if (e.code === 'ArrowDown') { s.ducking = true; }
      if (e.code === 'Escape') { onExit(); }
    };
    const onUp = (e: KeyboardEvent) => { if (e.code === 'ArrowDown') s.ducking = false; };
    const onClick = () => jump();

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    c.addEventListener('click', onClick);
    c.addEventListener('touchstart', onClick);

    const loop = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#535353';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, GROUND);
      ctx.lineTo(W, GROUND);
      ctx.stroke();

      if (s.started && !s.dead) {
        s.frame++;
        s.score = Math.floor(s.frame / 6);
        setScore(s.score);
        if (s.frame % 600 === 0) s.speed += 0.5;

        // gravity
        s.vy += 0.6;
        s.dinoY += s.vy;
        if (s.dinoY > 0) { s.dinoY = 0; s.vy = 0; s.jumping = false; }

        // spawn
        const last = s.obstacles[s.obstacles.length - 1];
        if (!last || last.x < W - 200 - Math.random() * 200) {
          const isBird = Math.random() < 0.2 && s.score > 200;
          if (isBird) {
            s.obstacles.push({ x: W, w: 20, h: 16, type: 'bird', y: GROUND - 40 - (Math.random() < 0.5 ? 20 : 0) });
          } else {
            const h = 25 + Math.random() * 20;
            s.obstacles.push({ x: W, w: 12 + Math.random() * 14, h, type: 'cactus', y: GROUND - h });
          }
        }

        // move + collide
        const dinoH = s.ducking ? 20 : 40;
        const dinoW = s.ducking ? 50 : 30;
        const dinoX = 30;
        const dinoTop = GROUND - dinoH + s.dinoY;
        for (const o of s.obstacles) {
          o.x -= s.speed;
          if (
            dinoX < o.x + o.w &&
            dinoX + dinoW > o.x &&
            dinoTop < o.y + o.h &&
            dinoTop + dinoH > o.y
          ) {
            s.dead = true;
            setGameOver(true);
            if (s.score > hi) {
              setHi(s.score);
              localStorage.setItem('dino_hi', String(s.score));
            }
          }
        }
        s.obstacles = s.obstacles.filter(o => o.x + o.w > 0);
      }

      // draw dino
      ctx.fillStyle = '#535353';
      const dinoH = s.ducking ? 20 : 40;
      const dinoW = s.ducking ? 50 : 30;
      ctx.fillRect(30, GROUND - dinoH + s.dinoY, dinoW, dinoH);
      // eye
      ctx.fillStyle = '#fff';
      ctx.fillRect(30 + dinoW - 8, GROUND - dinoH + s.dinoY + 6, 3, 3);

      // draw obstacles
      ctx.fillStyle = '#535353';
      for (const o of s.obstacles) {
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
    };
  }, [hi, onExit]);

  return (
    <div style={{
      minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'arial, sans-serif',
      padding: '20px', color: '#535353',
    }}>
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '72px', marginBottom: '20px' }}>📡</div>
        <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '10px' }}>
          인터넷 연결 없음
        </h1>
        <p style={{ fontSize: '14px', color: '#5f6368', marginBottom: '30px' }}>
          이 사이트에 연결할 수 없습니다. 네트워크 케이블, 모뎀, 라우터를 확인하거나 Wi-Fi에 다시 연결해 보세요.
        </p>
        <p style={{ fontSize: '12px', color: '#80868b', marginBottom: '20px' }}>
          ERR_INTERNET_DISCONNECTED
        </p>

        <div style={{
          fontSize: '11px', color: '#535353', textAlign: 'right',
          maxWidth: '600px', margin: '0 auto 4px',
        }}>
          HI {String(hi).padStart(5, '0')} &nbsp; {String(score).padStart(5, '0')}
        </div>
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          style={{ border: 'none', cursor: 'pointer', background: '#fff', maxWidth: '100%' }}
        />
        {!stateRef.current.started && !gameOver && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#80868b' }}>
            Space 또는 클릭 → 시작 / 점프 · ↓ 숙이기 · Esc 나가기
          </div>
        )}
        {gameOver && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#535353' }}>
            G A M E &nbsp; O V E R &nbsp;&nbsp; (Space로 재시작)
          </div>
        )}
        <button
          onClick={onExit}
          style={{
            marginTop: '20px', background: 'transparent', border: '1px solid #dadce0',
            padding: '6px 16px', fontSize: '12px', color: '#5f6368', cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          돌아가기
        </button>
      </div>
    </div>
  );
};

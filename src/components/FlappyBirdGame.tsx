import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/audio';
import { GameState, Bird, Pipe, Cloud, Bush, Particle } from '../types';

const CANVAS_WIDTH = 380;
const CANVAS_HEIGHT = 580;
const GROUND_HEIGHT = 90;
const GRAVITY = 0.36;
const JUMP_STRENGTH = -7.0;
const PIPE_SPEED = 2.4;
const PIPE_WIDTH = 58;
const PIPE_GAP = 132;
const PIPE_SPAWN_INTERVAL = 110;

export default function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flappy_high_score');
      return saved ? parseInt(saved, 10) || 0 : 0;
    }
    return 0;
  });
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState>('START');
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Mutable Game References to eliminate latency and avoid React re-render lag during 60 FPS loop
  const stateRef = useRef<{
    gameState: GameState;
    score: number;
    highScore: number;
    frames: number;
    groundOffset: number;
    shake: number;
    flashAlpha: number;
    bird: Bird;
    pipes: Pipe[];
    clouds: Cloud[];
    bushes: Bush[];
    particles: Particle[];
    pipeSpawnTimer: number;
    isPaused: boolean;
  }>({
    gameState: 'START',
    score: 0,
    highScore,
    frames: 0,
    groundOffset: 0,
    shake: 0,
    flashAlpha: 0,
    bird: {
      x: 80,
      y: CANVAS_HEIGHT / 2 - 30,
      radius: 14,
      velocity: 0,
      gravity: GRAVITY,
      jump: JUMP_STRENGTH,
      rotation: 0,
      wingAngle: 0,
      wingSpeed: 0.18,
    },
    pipes: [],
    clouds: [
      { x: 40, y: 70, scale: 0.9, speed: 0.4, opacity: 0.75 },
      { x: 190, y: 110, scale: 1.2, speed: 0.5, opacity: 0.85 },
      { x: 310, y: 55, scale: 0.7, speed: 0.35, opacity: 0.7 },
    ],
    bushes: [
      { x: 20, radius: 24, color: '#529633' },
      { x: 70, radius: 32, color: '#447d2b' },
      { x: 130, radius: 26, color: '#5da43c' },
      { x: 190, radius: 36, color: '#447d2b' },
      { x: 260, radius: 28, color: '#529633' },
      { x: 330, radius: 34, color: '#5da43c' },
      { x: 400, radius: 28, color: '#447d2b' },
    ],
    particles: [],
    pipeSpawnTimer: 0,
    isPaused: false,
  });

  // Keep stateRef synced with latest state
  useEffect(() => {
    stateRef.current.gameState = gameState;
  }, [gameState]);

  useEffect(() => {
    stateRef.current.highScore = highScore;
  }, [highScore]);

  useEffect(() => {
    stateRef.current.isPaused = isPaused;
  }, [isPaused]);

  const addFeatherParticles = (x: number, y: number) => {
    for (let i = 0; i < 4; i++) {
      stateRef.current.particles.push({
        x: x - 8,
        y: y + 4,
        vx: (Math.random() - 0.5) * 1.5 - 1.2,
        vy: (Math.random() - 0.5) * 1.5 + 1.0,
        color: Math.random() > 0.5 ? '#fff' : '#fed7aa',
        size: 3 + Math.random() * 2,
        alpha: 0.9,
        decay: 0.04,
        type: 'feather',
      });
    }
  };

  const addScoreParticles = (x: number, y: number) => {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.2;
      const speed = 1.5 + Math.random() * 2.5;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: ['#facc15', '#fef08a', '#fbbf24', '#ffffff'][i % 4],
        size: 3 + Math.random() * 2.5,
        alpha: 1,
        decay: 0.035,
        type: 'star',
      });
    }
  };

  const addCollisionParticles = (x: number, y: number) => {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: ['#f87171', '#fbbf24', '#ffffff', '#fed7aa'][i % 4],
        size: 3 + Math.random() * 3,
        alpha: 1,
        decay: 0.04,
        type: 'spark',
      });
    }
  };

  const handleFlap = useCallback(() => {
    const s = stateRef.current;
    if (s.isPaused) return;

    if (s.gameState === 'START') {
      s.gameState = 'PLAYING';
      setGameState('PLAYING');
      s.bird.velocity = JUMP_STRENGTH;
      sound.playFlap();
      addFeatherParticles(s.bird.x, s.bird.y);
      return;
    }

    if (s.gameState === 'PLAYING') {
      s.bird.velocity = JUMP_STRENGTH;
      sound.playFlap();
      addFeatherParticles(s.bird.x, s.bird.y);
      return;
    }

    if (s.gameState === 'GAMEOVER') {
      resetGame();
    }
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.bird.y = CANVAS_HEIGHT / 2 - 30;
    s.bird.velocity = 0;
    s.bird.rotation = 0;
    s.pipes = [];
    s.particles = [];
    s.score = 0;
    s.pipeSpawnTimer = 0;
    s.shake = 0;
    s.flashAlpha = 0;
    s.gameState = 'START';

    setScore(0);
    setIsNewRecord(false);
    setGameState('START');
  }, []);

  const triggerGameOver = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === 'GAMEOVER') return;

    s.gameState = 'GAMEOVER';
    setGameState('GAMEOVER');
    s.shake = 14;
    s.flashAlpha = 0.7;

    sound.playHit();
    setTimeout(() => sound.playDie(), 140);
    addCollisionParticles(s.bird.x, s.bird.y);

    if (s.score > s.highScore) {
      s.highScore = s.score;
      setHighScore(s.score);
      setIsNewRecord(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('flappy_high_score', s.score.toString());
      }
    }
  }, []);

  // Keyboard and Input Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
        e.preventDefault();
        handleFlap();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (stateRef.current.gameState === 'PLAYING') {
          setIsPaused((prev) => !prev);
        }
      } else if (e.code === 'KeyM') {
        const next = sound.toggleMute();
        setIsAudioEnabled(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlap]);

  // Main 60 FPS Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const s = stateRef.current;

      if (!s.isPaused) {
        s.frames++;

        // 1. UPDATE PHYSICS & LOGIC
        if (s.gameState === 'START') {
          // Gentle floating hover sine wave
          s.bird.y = CANVAS_HEIGHT / 2 - 30 + Math.sin(s.frames * 0.08) * 7;
          s.bird.rotation = 0;
          s.bird.wingAngle += s.bird.wingSpeed;
          s.groundOffset = (s.groundOffset + PIPE_SPEED) % 24;
        } else if (s.gameState === 'PLAYING') {
          // Bird gravity
          s.bird.velocity += s.bird.gravity;
          s.bird.y += s.bird.velocity;
          s.groundOffset = (s.groundOffset + PIPE_SPEED) % 24;

          // Rotation: tilts up on jump, slowly dives down on fall
          if (s.bird.velocity < 0) {
            s.bird.rotation = Math.max(-0.45, s.bird.velocity * 0.06);
          } else {
            s.bird.rotation = Math.min(Math.PI / 2.2, s.bird.rotation + 0.045);
          }

          // Flapping wing speed depends on upward motion
          s.bird.wingAngle += s.bird.velocity < 0 ? 0.35 : 0.12;

          // Ground collision
          if (s.bird.y + s.bird.radius >= CANVAS_HEIGHT - GROUND_HEIGHT) {
            s.bird.y = CANVAS_HEIGHT - GROUND_HEIGHT - s.bird.radius;
            triggerGameOver();
          }

          // Ceiling collision ("flies too high" check)
          if (s.bird.y - s.bird.radius <= 0) {
            s.bird.y = s.bird.radius;
            s.bird.velocity = 0;
            triggerGameOver();
          }

          // Pipes spawn
          s.pipeSpawnTimer++;
          if (s.pipeSpawnTimer >= PIPE_SPAWN_INTERVAL) {
            s.pipeSpawnTimer = 0;
            const minHeight = 55;
            const maxHeight = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - minHeight;
            const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

            s.pipes.push({
              x: CANVAS_WIDTH,
              topHeight,
              bottomY: topHeight + PIPE_GAP,
              width: PIPE_WIDTH,
              gap: PIPE_GAP,
              passed: false,
            });
          }

          // Pipes movement and collision detection
          for (let i = s.pipes.length - 1; i >= 0; i--) {
            const pipe = s.pipes[i];
            pipe.x -= PIPE_SPEED;

            // Score counter trigger
            if (!pipe.passed && pipe.x + pipe.width / 2 < s.bird.x) {
              pipe.passed = true;
              s.score++;
              setScore(s.score);
              sound.playScore();
              addScoreParticles(s.bird.x + 10, s.bird.y);
            }

            // Hitbox checks (generous inner radius to keep game fair & fun)
            const birdRadius = s.bird.radius - 2;
            const inPipeX = s.bird.x + birdRadius > pipe.x && s.bird.x - birdRadius < pipe.x + pipe.width;

            if (inPipeX) {
              const inTopPipe = s.bird.y - birdRadius < pipe.topHeight;
              const inBottomPipe = s.bird.y + birdRadius > pipe.bottomY;
              if (inTopPipe || inBottomPipe) {
                triggerGameOver();
              }
            }

            // Remove off-screen pipes
            if (pipe.x + pipe.width < -10) {
              s.pipes.splice(i, 1);
            }
          }
        } else if (s.gameState === 'GAMEOVER') {
          // Bird falls to ground if in air
          if (s.bird.y + s.bird.radius < CANVAS_HEIGHT - GROUND_HEIGHT) {
            s.bird.velocity += s.bird.gravity * 1.2;
            s.bird.y += s.bird.velocity;
            s.bird.rotation = Math.min(Math.PI / 2, s.bird.rotation + 0.08);
          } else {
            s.bird.y = CANVAS_HEIGHT - GROUND_HEIGHT - s.bird.radius;
          }
        }

        // Parallax Clouds
        for (const cloud of s.clouds) {
          cloud.x -= cloud.speed;
          if (cloud.x + 80 * cloud.scale < 0) {
            cloud.x = CANVAS_WIDTH + 40;
            cloud.y = 40 + Math.random() * 90;
          }
        }

        // Decay screen effects
        if (s.shake > 0) s.shake *= 0.88;
        if (s.shake < 0.3) s.shake = 0;
        if (s.flashAlpha > 0) s.flashAlpha -= 0.05;
        if (s.flashAlpha < 0) s.flashAlpha = 0;

        // Update particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08; // slight gravity
          p.alpha -= p.decay;
          if (p.alpha <= 0) {
            s.particles.splice(i, 1);
          }
        }
      }

      // 2. RENDERING CANVAS
      ctx.save();

      // Screen Shake
      if (s.shake > 0) {
        const dx = (Math.random() - 0.5) * s.shake * 2;
        const dy = (Math.random() - 0.5) * s.shake * 2;
        ctx.translate(dx, dy);
      }

      // Background Sky Gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - GROUND_HEIGHT);
      skyGradient.addColorStop(0, '#4ec0ca');
      skyGradient.addColorStop(0.65, '#7ad3db');
      skyGradient.addColorStop(1, '#bee8eb');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Sun with warm radiant aura
      ctx.save();
      const sunGradient = ctx.createRadialGradient(280, 70, 5, 280, 70, 55);
      sunGradient.addColorStop(0, 'rgba(255, 253, 220, 0.9)');
      sunGradient.addColorStop(0.4, 'rgba(255, 240, 150, 0.4)');
      sunGradient.addColorStop(1, 'rgba(255, 240, 150, 0)');
      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(280, 70, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Distant City Skyline Silhouette
      ctx.save();
      ctx.fillStyle = '#65b2ba';
      const cityBuildings = [
        { x: 10, w: 26, h: 55 },
        { x: 42, w: 32, h: 75 },
        { x: 80, w: 24, h: 45 },
        { x: 110, w: 38, h: 85 },
        { x: 154, w: 30, h: 60 },
        { x: 190, w: 28, h: 50 },
        { x: 224, w: 36, h: 80 },
        { x: 266, w: 25, h: 48 },
        { x: 298, w: 35, h: 70 },
        { x: 338, w: 32, h: 58 },
      ];
      const cityY = CANVAS_HEIGHT - GROUND_HEIGHT;
      for (const b of cityBuildings) {
        ctx.fillRect(b.x, cityY - b.h, b.w, b.h);
        // Small windows
        ctx.fillStyle = '#7accd4';
        for (let wy = cityY - b.h + 8; wy < cityY - 8; wy += 12) {
          ctx.fillRect(b.x + 5, wy, 4, 4);
          if (b.w > 26) ctx.fillRect(b.x + b.w - 9, wy, 4, 4);
        }
        ctx.fillStyle = '#65b2ba';
      }
      ctx.restore();

      // Parallax Clouds
      ctx.save();
      for (const cloud of s.clouds) {
        ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
        ctx.beginPath();
        const cx = cloud.x;
        const cy = cloud.y;
        const sc = cloud.scale;
        ctx.arc(cx, cy, 16 * sc, 0, Math.PI * 2);
        ctx.arc(cx + 14 * sc, cy - 8 * sc, 14 * sc, 0, Math.PI * 2);
        ctx.arc(cx + 30 * sc, cy, 18 * sc, 0, Math.PI * 2);
        ctx.arc(cx + 44 * sc, cy + 4 * sc, 12 * sc, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Bushes on horizon
      ctx.save();
      for (const bush of s.bushes) {
        ctx.fillStyle = bush.color;
        ctx.beginPath();
        ctx.arc(bush.x, CANVAS_HEIGHT - GROUND_HEIGHT + 4, bush.radius, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Draw Retro Pipes
      for (const pipe of s.pipes) {
        drawPipe(ctx, pipe.x, 0, pipe.width, pipe.topHeight, true);
        drawPipe(ctx, pipe.x, pipe.bottomY, pipe.width, CANVAS_HEIGHT - GROUND_HEIGHT - pipe.bottomY, false);
      }

      // Draw Scrolling Ground
      drawGround(ctx, s.groundOffset);

      // Draw Particles
      for (const p of s.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        if (p.type === 'star') {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Bird
      drawBird(ctx, s.bird);

      // Flash on Collision
      if (s.flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.flashAlpha})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // In-game live score (during active play)
      if (s.gameState === 'PLAYING') {
        drawScore(ctx, s.score, CANVAS_WIDTH / 2, 80, 42);
      }

      // Start Screen Banner
      if (s.gameState === 'START') {
        drawStartScreen(ctx, s.frames);
      }

      // Game Over Screen Card
      if (s.gameState === 'GAMEOVER') {
        drawGameOverScreen(ctx, s.score, s.highScore, s.frames, isNewRecord);
      }

      // Pause Overlay
      if (s.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '12px "Outfit", sans-serif';
        ctx.fillText('Press P or ESC to Resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [triggerGameOver, isNewRecord]);

  // Helper: Draw Retro Beveled Pipe
  const drawPipe = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    isTop: boolean
  ) => {
    if (height <= 0) return;
    ctx.save();

    const capHeight = 26;
    const capOverhang = 4;
    const capX = x - capOverhang;
    const capWidth = width + capOverhang * 2;
    const capY = isTop ? height - capHeight : y;
    const stemY = isTop ? 0 : y + capHeight;
    const stemHeight = Math.max(0, height - capHeight);

    // 1. Pipe Stem Body
    const stemGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    stemGrad.addColorStop(0, '#558022');
    stemGrad.addColorStop(0.18, '#73bf2e');
    stemGrad.addColorStop(0.35, '#9de64e');
    stemGrad.addColorStop(0.65, '#73bf2e');
    stemGrad.addColorStop(0.9, '#558022');
    stemGrad.addColorStop(1, '#2e4c13');

    ctx.fillStyle = stemGrad;
    ctx.fillRect(x, stemY, width, stemHeight);

    // Stem Borders
    ctx.strokeStyle = '#233910';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, stemY, width, stemHeight);

    // 2. Pipe Cap
    const capGrad = ctx.createLinearGradient(capX, 0, capX + capWidth, 0);
    capGrad.addColorStop(0, '#558022');
    capGrad.addColorStop(0.18, '#73bf2e');
    capGrad.addColorStop(0.35, '#a6f054');
    capGrad.addColorStop(0.65, '#73bf2e');
    capGrad.addColorStop(0.9, '#558022');
    capGrad.addColorStop(1, '#233910');

    ctx.fillStyle = capGrad;
    ctx.fillRect(capX, capY, capWidth, capHeight);

    // Cap Border
    ctx.strokeStyle = '#233910';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(capX, capY, capWidth, capHeight);

    // Cap Lip Highlight and Shadow line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(capX + 4, capY + 3, capWidth - 8, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(capX + 3, capY + capHeight - 4, capWidth - 6, 2);

    ctx.restore();
  };

  // Helper: Draw Ground Layer with Moving Stripes
  const drawGround = (ctx: CanvasRenderingContext2D, offset: number) => {
    ctx.save();
    const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;

    // Grass Top Strip
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, groundY, CANVAS_WIDTH, 14);

    // Grass Highlight Strip
    ctx.fillStyle = '#9de64e';
    ctx.fillRect(0, groundY + 1, CANVAS_WIDTH, 3);

    // Grass Border Line
    ctx.fillStyle = '#558022';
    ctx.fillRect(0, groundY + 13, CANVAS_WIDTH, 2);

    // Soil Base
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, groundY + 15, CANVAS_WIDTH, GROUND_HEIGHT - 15);

    // Moving Dirt Diagonal Chevron Stripes
    ctx.fillStyle = '#cbb868';
    ctx.beginPath();
    for (let x = -24; x < CANVAS_WIDTH + 24; x += 22) {
      const sx = x - offset;
      ctx.moveTo(sx, groundY + 15);
      ctx.lineTo(sx + 10, groundY + 15);
      ctx.lineTo(sx - 4, groundY + 36);
      ctx.lineTo(sx - 14, groundY + 36);
    }
    ctx.fill();

    // Subtle Soil specks
    ctx.fillStyle = '#a69046';
    for (let x = 8; x < CANVAS_WIDTH; x += 40) {
      ctx.fillRect(x, groundY + 50, 4, 3);
      ctx.fillRect(x + 18, groundY + 68, 5, 2);
    }

    // Top Ground Line
    ctx.strokeStyle = '#2e4c13';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(CANVAS_WIDTH, groundY);
    ctx.stroke();

    ctx.restore();
  };

  // Helper: Draw Animated Bird with Wings and Expressions
  const drawBird = (ctx: CanvasRenderingContext2D, bird: Bird) => {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    // Bird Dimensions
    const bodyW = 17;
    const bodyH = 13;

    // Bird Outline Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(2, 4, bodyW + 1, bodyH + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Bird Body Gradient (Golden Yellow with warm orange shading)
    const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, bodyW + 2);
    bodyGrad.addColorStop(0, '#fef08a');
    bodyGrad.addColorStop(0.4, '#facc15');
    bodyGrad.addColorStop(0.85, '#eab308');
    bodyGrad.addColorStop(1, '#ca8a04');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body Border
    ctx.strokeStyle = '#6d3c05';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Cute Red Cheek Blush
    ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.beginPath();
    ctx.arc(3, 4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Beak (Orange cartoon lips)
    ctx.save();
    const beakGrad = ctx.createLinearGradient(8, -4, 18, 5);
    beakGrad.addColorStop(0, '#fb923c');
    beakGrad.addColorStop(1, '#ea580c');

    ctx.fillStyle = beakGrad;
    ctx.beginPath();
    ctx.moveTo(9, -4);
    ctx.lineTo(19, 0);
    ctx.lineTo(9, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Beak middle mouth line
    ctx.beginPath();
    ctx.moveTo(9, 0.5);
    ctx.lineTo(17, 0.5);
    ctx.stroke();
    ctx.restore();

    // 3. Eye
    ctx.save();
    // Big White Sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(5, -4, 5.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Pupil
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(6.5, -4, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // White Gleam / Highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5.8, -5.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Flapping Wing
    ctx.save();
    // Wing oscillation angle
    const wingFlap = Math.sin(bird.wingAngle) * 7;
    ctx.translate(-5, 0);

    const wingGrad = ctx.createLinearGradient(-10, -6, 5, 8);
    wingGrad.addColorStop(0, '#ffffff');
    wingGrad.addColorStop(0.3, '#fef08a');
    wingGrad.addColorStop(1, '#eab308');

    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.ellipse(0, wingFlap, 9, 5.5, (wingFlap * Math.PI) / 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  // Helper: Draw Retro Pixel Arcade Numbers
  const drawScore = (
    ctx: CanvasRenderingContext2D,
    val: number,
    x: number,
    y: number,
    fontSize: number = 38
  ) => {
    ctx.save();
    ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Bold black outline
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeText(val.toString(), x, y);

    // Bright white body
    ctx.fillStyle = '#ffffff';
    ctx.fillText(val.toString(), x, y);

    ctx.restore();
  };

  // Helper: Draw Get Ready Screen Banner
  const drawStartScreen = (ctx: CanvasRenderingContext2D, frames: number) => {
    ctx.save();
    ctx.textAlign = 'center';

    // Game Title Badge
    ctx.font = 'bold 22px "Press Start 2P", monospace';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText('FLAPPY BIRD', CANVAS_WIDTH / 2, 130);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('FLAPPY BIRD', CANVAS_WIDTH / 2, 130);

    // Subtitle / Ready
    ctx.font = 'bold 15px "Press Start 2P", monospace';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeText('GET READY!', CANVAS_WIDTH / 2, 175);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GET READY!', CANVAS_WIDTH / 2, 175);

    // Pulsing Instruction Box
    const pulse = Math.sin(frames * 0.08) * 0.15 + 0.85;
    ctx.globalAlpha = pulse;

    // Retro instruction finger tap / space prompt
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    const boxW = 260;
    const boxH = 68;
    const boxX = (CANVAS_WIDTH - boxW) / 2;
    const boxY = 320;
    roundRect(ctx, boxX, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('TAP OR PRESS SPACE', CANVAS_WIDTH / 2, boxY + 28);
    ctx.font = '13px "Outfit", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Click • Spacebar • Screen Tap', CANVAS_WIDTH / 2, boxY + 50);

    ctx.restore();
  };

  // Helper: Draw Game Over Screen Modal
  const drawGameOverScreen = (
    ctx: CanvasRenderingContext2D,
    currentScore: number,
    bestScore: number,
    frames: number,
    newRecord: boolean
  ) => {
    ctx.save();
    ctx.textAlign = 'center';

    // "GAME OVER" Text with retro arcade glow
    ctx.font = 'bold 24px "Press Start 2P", monospace';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeText('GAME OVER', CANVAS_WIDTH / 2, 125);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 125);

    // Scoreboard Card
    const cardW = 280;
    const cardH = 175;
    const cardX = (CANVAS_WIDTH - cardW) / 2;
    const cardY = 160;

    // Card background
    ctx.fillStyle = '#ded895';
    roundRect(ctx, cardX, cardY, cardW, cardH, 10);
    ctx.fill();
    ctx.strokeStyle = '#558022';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Inner bevel border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cardX + 3, cardY + 3, cardW - 6, cardH - 6, 8);
    ctx.stroke();

    // Left Column: Medal
    ctx.fillStyle = '#65532f';
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.fillText('MEDAL', cardX + 60, cardY + 36);

    // Medal Circle
    const medalX = cardX + 60;
    const medalY = cardY + 86;
    ctx.beginPath();
    ctx.arc(medalX, medalY, 26, 0, Math.PI * 2);

    let medalColor = '#d1d5db'; // default / none
    let medalRim = '#9ca3af';
    let medalName = 'NONE';

    if (currentScore >= 40) {
      medalColor = '#38bdf8'; // Platinum
      medalRim = '#0284c7';
      medalName = 'PLAT';
    } else if (currentScore >= 25) {
      medalColor = '#fbbf24'; // Gold
      medalRim = '#d97706';
      medalName = 'GOLD';
    } else if (currentScore >= 15) {
      medalColor = '#cbd5e1'; // Silver
      medalRim = '#64748b';
      medalName = 'SILV';
    } else if (currentScore >= 5) {
      medalColor = '#d97706'; // Bronze
      medalRim = '#92400e';
      medalName = 'BRNZ';
    }

    ctx.fillStyle = medalColor;
    ctx.fill();
    ctx.strokeStyle = medalRim;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Medal Star or Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.fillText(medalName, medalX, medalY + 3);

    // Right Column: Scores
    ctx.textAlign = 'right';
    const scoreRightX = cardX + cardW - 25;

    // Current Score Label & Value
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.fillStyle = '#b45309';
    ctx.fillText('SCORE', scoreRightX, cardY + 36);

    ctx.font = 'bold 18px "Press Start 2P", monospace';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(currentScore.toString(), scoreRightX, cardY + 64);

    // Best Score Label & Value
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.fillStyle = '#b45309';
    ctx.fillText('BEST', scoreRightX, cardY + 98);

    ctx.font = 'bold 18px "Press Start 2P", monospace';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(bestScore.toString(), scoreRightX, cardY + 126);

    // New High Score Ribbon Flash
    if (newRecord) {
      const pulseNew = Math.sin(frames * 0.15) > 0;
      if (pulseNew) {
        ctx.fillStyle = '#ef4444';
        roundRect(ctx, cardX + cardW - 88, cardY + 84, 46, 16, 4);
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('NEW', cardX + cardW - 65, cardY + 96);
      }
    }

    // Restart Button prompt below card
    ctx.textAlign = 'center';
    const btnW = 240;
    const btnH = 54;
    const btnX = (CANVAS_WIDTH - btnW) / 2;
    const btnY = 360;

    const pulseBtn = Math.sin(frames * 0.08) * 0.08 + 0.96;
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, btnY + btnH / 2);
    ctx.scale(pulseBtn, pulseBtn);
    ctx.translate(-CANVAS_WIDTH / 2, -(btnY + btnH / 2));

    ctx.fillStyle = '#22c55e';
    roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.fillText('PLAY AGAIN', CANVAS_WIDTH / 2, btnY + 24);

    ctx.font = '12px "Outfit", sans-serif';
    ctx.fillStyle = '#ecfdf5';
    ctx.fillText('Click, Tap, or Press Space', CANVAS_WIDTH / 2, btnY + 42);
    ctx.restore();

    ctx.restore();
  };

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Game Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-sky-300">
        <canvas
          id="flappy-canvas"
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleFlap}
          onTouchStart={(e) => {
            e.preventDefault();
            handleFlap();
          }}
          className="cursor-pointer block touch-none"
        />

        {/* Top Control Bar overlay */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              id="audio-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                const next = sound.toggleMute();
                setIsAudioEnabled(next);
              }}
              title={isAudioEnabled ? 'Mute Sound (M)' : 'Unmute Sound (M)'}
              className="px-2.5 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
            >
              {isAudioEnabled ? (
                <>
                  <span className="text-sm">🔊</span>
                  <span className="hidden sm:inline">SFX</span>
                </>
              ) : (
                <>
                  <span className="text-sm">🔇</span>
                  <span className="hidden sm:inline">Muted</span>
                </>
              )}
            </button>

            {gameState === 'PLAYING' && (
              <button
                id="pause-toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused((prev) => !prev);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
              >
                <span>{isPaused ? '▶' : '⏸'}</span>
                <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            )}
          </div>

          {/* High Score pill top right */}
          <div className="px-2.5 py-1.5 rounded-lg bg-black/40 text-amber-300 backdrop-blur text-xs font-bold font-mono flex items-center gap-1 border border-amber-400/30">
            <span>🏆</span>
            <span>BEST: {highScore}</span>
          </div>
        </div>
      </div>

      {/* Retro Arcade Instructions Card */}
      <div className="mt-4 w-full max-w-[380px] bg-slate-900/90 text-slate-200 border border-slate-800 rounded-xl p-3.5 text-xs shadow-lg backdrop-blur">
        <div className="flex items-center justify-between text-slate-400 mb-2 font-medium">
          <span className="text-amber-400 font-semibold tracking-wide uppercase">Arcade Controls</span>
          <span className="text-[11px]">Space • Tap • Click</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/80 rounded-lg py-1.5 px-2 border border-slate-700/50">
            <span className="block text-amber-300 font-bold font-mono">Space / Up</span>
            <span className="text-[10px] text-slate-400">Flap Wings</span>
          </div>
          <div className="bg-slate-800/80 rounded-lg py-1.5 px-2 border border-slate-700/50">
            <span className="block text-amber-300 font-bold font-mono">P / Esc</span>
            <span className="text-[10px] text-slate-400">Pause Game</span>
          </div>
          <div className="bg-slate-800/80 rounded-lg py-1.5 px-2 border border-slate-700/50">
            <span className="block text-amber-300 font-bold font-mono">M Key</span>
            <span className="text-[10px] text-slate-400">Mute Audio</span>
          </div>
        </div>
      </div>
    </div>
  );
}

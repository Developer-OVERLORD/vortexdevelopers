
// ===== sound.js =====
// WEB AUDIO API SOUND SYNTHESISER FOR BILLIARD EFFECTS
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch (e) {
            console.warn("Web Audio API not supported on this browser", e);
            this.enabled = false;
        }
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Play cue tip hitting cue ball (wood tip snap)
    playCueHit(intensity = 0.5) {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        intensity = Math.min(Math.max(intensity, 0.1), 1.0);
        const now = this.ctx.currentTime;

        // Wood click (high pass noise spike)
        const bufferSize = this.ctx.sampleRate * 0.05; // 50ms buffer
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource(buffer);
        noiseNode.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1200, now);
        noiseFilter.Q.setValueAtTime(3, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08 * intensity, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        // Core tone of the tip strike
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.25 * intensity, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        // Connect
        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        // Start/Stop
        noiseNode.start(now);
        noiseNode.stop(now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    // Play ball colliding with ball (snappy high frequency ceramic clack)
    playBallClack(velocityRatio = 0.5) {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        // VelocityRatio 0 to 1
        const vol = Math.min(Math.max(velocityRatio * 0.35, 0.01), 0.5);
        const decay = Math.min(0.01 + velocityRatio * 0.015, 0.03); // 10ms - 25ms decay
        const pitchShift = 700 + velocityRatio * 400; // Harder hit = slightly higher pitch
        const now = this.ctx.currentTime;

        // Primary metal/ceramic ringing oscillator
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(pitchShift, now);

        // Secondary oscillator for complexity
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(pitchShift * 1.6, now);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(vol, now);
        gainNode.gain.setValueAtTime(vol, now + 0.002); // slight hold
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        // Quick noise tick for the contact impulse
        const bufferSize = this.ctx.sampleRate * 0.005; // 5ms noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource(buffer);
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(3000, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(vol * 0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.004);

        // Connections
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        // Trigger
        osc1.start(now);
        osc1.stop(now + decay + 0.01);
        osc2.start(now);
        osc2.stop(now + decay + 0.01);
        noise.start(now);
        noise.stop(now + 0.005);
    }

    // Play ball hitting rubber rail cushion (dull low frequency thud)
    playCushionThud(velocityRatio = 0.5) {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const vol = Math.min(Math.max(velocityRatio * 0.4, 0.02), 0.6);
        const decay = 0.08 + (velocityRatio * 0.06); // 80ms - 140ms
        const now = this.ctx.currentTime;

        // Sub bass component
        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(75, now);
        subOsc.frequency.exponentialRampToValueAtTime(38, now + decay);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(vol, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

        // Mid cushion friction rumble noise
        const bufferSize = this.ctx.sampleRate * decay;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource(buffer);
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(150, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(vol * 0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

        // Connections
        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        // Trigger
        subOsc.start(now);
        subOsc.stop(now + decay);
        noise.start(now);
        noise.stop(now + decay);
    }

    // Play pocket drop sequence (friction sweep + hollow plastic bottom impact)
    playPocketDrop() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Friction sweep (swish sound of rolling in leather/plastic pocket throat)
        const sweepOsc = this.ctx.createOscillator();
        sweepOsc.type = 'triangle';
        sweepOsc.frequency.setValueAtTime(250, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        const sweepGain = this.ctx.createGain();
        sweepGain.gain.setValueAtTime(0.15, now);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        sweepOsc.connect(sweepGain);
        sweepGain.connect(this.ctx.destination);
        sweepOsc.start(now);
        sweepOsc.stop(now + 0.15);

        // 2. Heavy hollow thud of dropping to the bottom (delayed by 80ms)
        const hitTime = now + 0.08;

        const bassOsc = this.ctx.createOscillator();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(100, hitTime);
        bassOsc.frequency.exponentialRampToValueAtTime(45, hitTime + 0.18);

        const bassGain = this.ctx.createGain();
        bassGain.gain.setValueAtTime(0.35, hitTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.18);

        // Connect noise overlay for plastic box bounce
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const boxNoise = this.ctx.createBufferSource(buffer);
        boxNoise.buffer = buffer;

        const boxFilter = this.ctx.createBiquadFilter();
        boxFilter.type = 'bandpass';
        boxFilter.frequency.setValueAtTime(220, hitTime);
        boxFilter.Q.setValueAtTime(2, hitTime);

        const boxGain = this.ctx.createGain();
        boxGain.gain.setValueAtTime(0.12, hitTime);
        boxGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.12);

        // Connections
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);

        boxNoise.connect(boxFilter);
        boxFilter.connect(boxGain);
        boxGain.connect(this.ctx.destination);

        // Trigger
        bassOsc.start(hitTime);
        bassOsc.stop(hitTime + 0.18);
        boxNoise.start(hitTime);
        boxNoise.stop(hitTime + 0.15);
    }
}

const sounds = new SoundManager();


// ===== physics.js =====
// PHYSICAL ENGINE: ELASTIC COLLISIONS, BOUNDARY BOUNCES, AND POCKETING MATH

const PHYSICS_CONFIG = {
    friction: 0.984,            // Deceleration multiplier per frame
    restitutionBall: 0.97,      // Bounciness between balls (elasticity)
    restitutionCushion: 0.78,   // Bounciness off cushion rubber
    pocketRadius: 24,           // Radius of pocket detection
    minSpeed: 0.08,             // Velocity cutoff threshold
    sidespinEffect: 0.28,       // How much sidespin alters bounce angle
    verticalSpinEffect: 0.40    // How much draw/follow alters cue ball path after hits
};

// Pockets center positions (relative to canvas width 960, height 540)
const POCKETS = [
    { id: 'TL', x: 80, y: 70 },
    { id: 'TC', x: 480, y: 64 },
    { id: 'TR', x: 880, y: 70 },
    { id: 'BL', x: 80, y: 470 },
    { id: 'BC', x: 480, y: 476 },
    { id: 'BR', x: 880, y: 470 }
];

// Playing field limits
const FIELD = {
    startX: 80,
    endX: 880,
    startY: 70,
    endY: 470,
    pocketCutout: 28 // Gap around pockets where cushions are cut out
};

// 1. Cushion / wall boundary collisions
function resolveCushionCollisions(ball, spinState = null) {
    if (!ball.active || ball.isPocketing) return;

    const r = ball.radius;
    let bounced = false;
    let normalVx = 0;
    let normalVy = 0;

    // Check boundary intersections
    // Top Cushion
    if (ball.y - r < FIELD.startY) {
        // Only bounce if not within pocket mouth width
        const inLeftPocket = ball.x < FIELD.startX + FIELD.pocketCutout;
        const inRightPocket = ball.x > FIELD.endX - FIELD.pocketCutout;
        const inMidPocket = Math.abs(ball.x - 480) < FIELD.pocketCutout + 4;

        if (!inLeftPocket && !inRightPocket && !inMidPocket) {
            ball.y = FIELD.startY + r;
            ball.vy = -ball.vy * PHYSICS_CONFIG.restitutionCushion;
            bounced = true;
            normalVy = 1;

            // Apply sidespin effect (adjusts horizontal speed based on left/right spin)
            if (ball.type === 'cue' && spinState) {
                ball.vx += spinState.x * Math.abs(ball.vy) * PHYSICS_CONFIG.sidespinEffect;
            }
        }
    }
    // Bottom Cushion
    else if (ball.y + r > FIELD.endY) {
        const inLeftPocket = ball.x < FIELD.startX + FIELD.pocketCutout;
        const inRightPocket = ball.x > FIELD.endX - FIELD.pocketCutout;
        const inMidPocket = Math.abs(ball.x - 480) < FIELD.pocketCutout + 4;

        if (!inLeftPocket && !inRightPocket && !inMidPocket) {
            ball.y = FIELD.endY - r;
            ball.vy = -ball.vy * PHYSICS_CONFIG.restitutionCushion;
            bounced = true;
            normalVy = -1;

            if (ball.type === 'cue' && spinState) {
                ball.vx -= spinState.x * Math.abs(ball.vy) * PHYSICS_CONFIG.sidespinEffect;
            }
        }
    }

    // Left Cushion
    if (ball.x - r < FIELD.startX) {
        const inTopPocket = ball.y < FIELD.startY + FIELD.pocketCutout;
        const inBottomPocket = ball.y > FIELD.endY - FIELD.pocketCutout;

        if (!inTopPocket && !inBottomPocket) {
            ball.x = FIELD.startX + r;
            ball.vx = -ball.vx * PHYSICS_CONFIG.restitutionCushion;
            bounced = true;
            normalVx = 1;

            if (ball.type === 'cue' && spinState) {
                ball.vy -= spinState.x * Math.abs(ball.vx) * PHYSICS_CONFIG.sidespinEffect;
            }
        }
    }
    // Right Cushion
    else if (ball.x + r > FIELD.endX) {
        const inTopPocket = ball.y < FIELD.startY + FIELD.pocketCutout;
        const inBottomPocket = ball.y > FIELD.endY - FIELD.pocketCutout;

        if (!inTopPocket && !inBottomPocket) {
            ball.x = FIELD.endX - r;
            ball.vx = -ball.vx * PHYSICS_CONFIG.restitutionCushion;
            bounced = true;
            normalVx = -1;

            if (ball.type === 'cue' && spinState) {
                ball.vy += spinState.x * Math.abs(ball.vx) * PHYSICS_CONFIG.sidespinEffect;
            }
        }
    }

    if (bounced) {
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        sounds.playCushionThud(speed / 15);
    }
}

// 2. Pocket collisions (checks if balls are close to pockets and pulls them in)
function resolvePocketCollisions(ball, onPocketed) {
    if (!ball.active || ball.isPocketing) return;

    for (const pocket of POCKETS) {
        const dx = ball.x - pocket.x;
        const dy = ball.y - pocket.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Standard pocket trigger (ball center must enter pocket zone)
        if (dist < PHYSICS_CONFIG.pocketRadius) {
            ball.pocket(pocket.x, pocket.y);
            sounds.playPocketDrop();
            if (onPocketed) onPocketed(ball);
            return;
        }
    }
}

// 3. Circle-to-circle elastic collision resolution
function resolveBallCollisions(balls, spinState = null, onCueBallFirstHit = null) {
    let firstHitOccurred = false;

    for (let i = 0; i < balls.length; i++) {
        const b1 = balls[i];
        if (!b1.active || b1.isPocketing) continue;

        for (let j = i + 1; j < balls.length; j++) {
            const b2 = balls[j];
            if (!b2.active || b2.isPocketing) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = b1.radius + b2.radius;

            if (dist < minDist) {
                // 1. Resolve overlap (push balls apart equally along normal)
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                b1.x -= nx * overlap * 0.5;
                b1.y -= ny * overlap * 0.5;
                b2.x += nx * overlap * 0.5;
                b2.y += ny * overlap * 0.5;

                // 2. Compute 1D relative velocity along normal
                const rvx = b2.vx - b1.vx;
                const rvy = b2.vy - b1.vy;
                const velAlongNormal = rvx * nx + rvy * ny;

                // Check if they are already moving apart
                if (velAlongNormal < 0) {
                    // Impulse scalar
                    const e = PHYSICS_CONFIG.restitutionBall;
                    const impulse = -(1 + e) * velAlongNormal / 2; // Equal masses (mass = 1)

                    // Apply impulse to velocities
                    b1.vx -= impulse * nx;
                    b1.vy -= impulse * ny;
                    b2.vx += impulse * nx;
                    b2.vy += impulse * ny;

                    // Play impact sound based on relative velocity
                    const relSpeed = Math.abs(velAlongNormal);
                    sounds.playBallClack(relSpeed / 12);

                    // 3. Rule tracking: Check if cue ball hits its first target ball
                    if (onCueBallFirstHit) {
                        if (b1.type === 'cue') {
                            onCueBallFirstHit(b2);
                            firstHitOccurred = true;
                        } else if (b2.type === 'cue') {
                            onCueBallFirstHit(b1);
                            firstHitOccurred = true;
                        }
                    }

                    // 4. Spin modification (if cue ball hits a target ball)
                    if (firstHitOccurred && spinState && (b1.type === 'cue' || b2.type === 'cue')) {
                        const cue = b1.type === 'cue' ? b1 : b2;
                        const target = b1.type === 'cue' ? b2 : b1;
                        
                        // Direction of target collision (normal)
                        // Vertical spin (draw/follow) alters cue ball along normal or tangent
                        // Draw (backspin, negative spinState.y) pushes cue ball backward relative to normal
                        // Follow (topspin, positive spinState.y) pushes cue ball forward relative to normal
                        
                        // We apply an impulse on the cue ball along the collision normal
                        // spinState.y is vertical spin [-1, 1], where -1 is full draw (back)
                        if (Math.abs(spinState.y) > 0.05) {
                            const spinImpulse = spinState.y * relSpeed * PHYSICS_CONFIG.verticalSpinEffect;
                            cue.vx += nx * spinImpulse;
                            cue.vy += ny * spinImpulse;
                        }
                    }
                }
            }
        }
    }
}

// 4. Global friction update and velocity cutoff
function applyFriction(ball) {
    if (!ball.active || ball.isPocketing) return;

    ball.vx *= PHYSICS_CONFIG.friction;
    ball.vy *= PHYSICS_CONFIG.friction;

    // Zero out velocity if below threshold
    if (Math.abs(ball.vx) < PHYSICS_CONFIG.minSpeed) ball.vx = 0;
    if (Math.abs(ball.vy) < PHYSICS_CONFIG.minSpeed) ball.vy = 0;
}


// ===== ball.js =====
// BALL PHYSICS OBJECT AND 3D SHADING RENDERER

const BALL_COLORS = {
    0: { main: '#fffffd', name: 'Cue' },
    1: { main: '#f5cd23', name: 'Yellow (Solid)' }, // Yellow
    2: { main: '#1e62c9', name: 'Blue (Solid)' },   // Blue
    3: { main: '#e82a2a', name: 'Red (Solid)' },    // Red
    4: { main: '#6d1cb8', name: 'Purple (Solid)' }, // Purple
    5: { main: '#f07113', name: 'Orange (Solid)' }, // Orange
    6: { main: '#1c913d', name: 'Green (Solid)' },  // Green
    7: { main: '#80121a', name: 'Burgundy (Solid)' },// Burgundy
    8: { main: '#121214', name: 'Black' },           // Black
    9: { main: '#f5cd23', name: 'Yellow (Stripe)' }, // Yellow Stripe
    10: { main: '#1e62c9', name: 'Blue (Stripe)' },   // Blue Stripe
    11: { main: '#e82a2a', name: 'Red (Stripe)' },    // Red Stripe
    12: { main: '#6d1cb8', name: 'Purple (Stripe)' }, // Purple Stripe
    13: { main: '#f07113', name: 'Orange (Stripe)' }, // Orange Stripe
    14: { main: '#1c913d', name: 'Green (Stripe)' },  // Green Stripe
    15: { main: '#80121a', name: 'Burgundy (Stripe)' } // Burgundy Stripe
};

class Ball {
    constructor(number, x, y, radius = 12) {
        this.number = number;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = radius;
        this.active = true;
        this.isPocketing = false;
        this.pocketAnimProgress = 1.0; // 1 to 0 scale down
        this.pocketTargetX = 0;
        this.pocketTargetY = 0;

        // Visual properties
        this.colorData = BALL_COLORS[number] || { main: '#ffffff', name: 'Unknown' };
        this.color = this.colorData.main;

        // Classification
        if (number === 0) {
            this.type = 'cue';
        } else if (number === 8) {
            this.type = 'black';
        } else if (number >= 1 && number <= 7) {
            this.type = 'solid';
        } else {
            this.type = 'stripe';
        }
    }

    // Trigger pocket animation
    pocket(pocketX, pocketY) {
        this.isPocketing = true;
        this.pocketTargetX = pocketX;
        this.pocketTargetY = pocketY;
        this.vx = 0;
        this.vy = 0;
    }

    // Physics step update (just position based on velocity, and pocket anim decay)
    update() {
        if (!this.active) return;

        if (this.isPocketing) {
            // Decelerate and spiral into the pocket center
            this.x += (this.pocketTargetX - this.x) * 0.15;
            this.y += (this.pocketTargetY - this.y) * 0.15;
            this.pocketAnimProgress -= 0.08;

            if (this.pocketAnimProgress <= 0.1) {
                this.active = false;
                this.isPocketing = false;
            }
            return;
        }

        // Apply velocities
        this.x += this.vx;
        this.y += this.vy;
    }

    // Render the ball with radial gradients for 3D sphere look
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        
        // Apply pocket scale effect
        const currentRadius = this.radius * (this.isPocketing ? this.pocketAnimProgress : 1.0);
        if (currentRadius <= 0.1) {
            ctx.restore();
            return;
        }

        // 1. Draw base ball circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        
        if (this.type === 'stripe') {
            // Draw white base circle
            ctx.fillStyle = '#fdfdfb';
            ctx.fill();

            // Draw colored stripe (clipped to the circle)
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.clip();
            
            ctx.beginPath();
            // Draw horizontal stripe band
            ctx.fillStyle = this.color;
            ctx.rect(this.x - currentRadius, this.y - currentRadius * 0.55, currentRadius * 2, currentRadius * 1.1);
            ctx.fill();
            ctx.restore();
        } else {
            // Draw solid color base
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // 2. Draw number badge (unless cue ball)
        if (this.type !== 'cue') {
            const badgeRadius = currentRadius * 0.45;
            
            // Draw white circle in center
            ctx.beginPath();
            ctx.arc(this.x, this.y, badgeRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Draw number text
            ctx.fillStyle = '#1e272e';
            ctx.font = `bold ${Math.max(6, Math.round(currentRadius * 0.7))}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.number, this.x, this.y + 0.5);
        }

        // 3. Add 3D Shading Radial Gradient Overlay
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        
        // Highlight is offset to top-left to represent top-left light source
        const grad = ctx.createRadialGradient(
            this.x - currentRadius * 0.35, 
            this.y - currentRadius * 0.35, 
            currentRadius * 0.05, 
            this.x, 
            this.y, 
            currentRadius
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.55)');
        
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();
    }
}


// ===== table.js =====
// TABLE, CUE STICK, AND AIMING GUIDE RENDERING

// Table dimensions
var WIDTH = 960;
var HEIGHT = 540;

class TableRenderer {
    constructor() {
        this.feltColor = '#0f1326'; // Cyber dark felt
        this.railColor = '#1a1f38'; // Dark metal rails
        this.neonTeal = '#00e5ff';
        this.neonPurple = '#a020f0';
    }

    // Draw table background, rails, pockets, and decorative lines
    drawTable(ctx, activePlayerColor = '#00e5ff') {
        // Clear canvas
        ctx.fillStyle = '#07080d';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // 1. Draw outer metallic rail border
        ctx.save();
        ctx.shadowColor = activePlayerColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.railColor;
        // Draw round rectangle for rails
        this.roundRect(ctx, 40, 30, WIDTH - 80, HEIGHT - 60, 24);
        ctx.fill();
        ctx.restore();

        // Inner rail border (bezel)
        ctx.strokeStyle = '#2d355c';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Draw Felt Playing Area
        ctx.save();
        // Inner felt has a radial gradient to look like it is lit from above
        const feltGrad = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 100, WIDTH/2, HEIGHT/2, 450);
        feltGrad.addColorStop(0, '#161b36');
        feltGrad.addColorStop(1, '#0b0c16');
        ctx.fillStyle = feltGrad;
        ctx.fillRect(FIELD.startX, FIELD.startY, FIELD.endX - FIELD.startX, FIELD.endY - FIELD.startY);
        ctx.restore();

        // 3. Draw Table Markings (Head String and D-zone)
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.lineWidth = 1;
        
        // Head string (vertical line at 1/4th table length)
        const headStringX = FIELD.startX + (FIELD.endX - FIELD.startX) * 0.25;
        ctx.beginPath();
        ctx.moveTo(headStringX, FIELD.startY);
        ctx.lineTo(headStringX, FIELD.endY);
        ctx.stroke();

        // D-Zone semicircle on the left
        ctx.beginPath();
        ctx.arc(headStringX, HEIGHT / 2, 50, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();

        // Spot on head string
        ctx.beginPath();
        ctx.arc(headStringX, HEIGHT / 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.fill();

        // Foot spot on the right (where balls are racked)
        const footSpotX = FIELD.startX + (FIELD.endX - FIELD.startX) * 0.75;
        ctx.beginPath();
        ctx.arc(footSpotX, HEIGHT / 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.fill();

        // 4. Draw Cushions with glow
        ctx.save();
        ctx.strokeStyle = activePlayerColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = activePlayerColor;
        ctx.shadowBlur = 8;
        
        // Draw separate cushion borders to leave pocket mouths open
        const offset = FIELD.pocketCutout;
        
        // Top left cushion
        ctx.beginPath();
        ctx.moveTo(FIELD.startX + offset, FIELD.startY);
        ctx.lineTo(WIDTH/2 - offset + 2, FIELD.startY);
        ctx.stroke();

        // Top right cushion
        ctx.beginPath();
        ctx.moveTo(WIDTH/2 + offset - 2, FIELD.startY);
        ctx.lineTo(FIELD.endX - offset, FIELD.startY);
        ctx.stroke();

        // Bottom left cushion
        ctx.beginPath();
        ctx.moveTo(FIELD.startX + offset, FIELD.endY);
        ctx.lineTo(WIDTH/2 - offset + 2, FIELD.endY);
        ctx.stroke();

        // Bottom right cushion
        ctx.beginPath();
        ctx.moveTo(WIDTH/2 + offset - 2, FIELD.endY);
        ctx.lineTo(FIELD.endX - offset, FIELD.endY);
        ctx.stroke();

        // Left cushion
        ctx.beginPath();
        ctx.moveTo(FIELD.startX, FIELD.startY + offset);
        ctx.lineTo(FIELD.startX, FIELD.endY - offset);
        ctx.stroke();

        // Right cushion
        ctx.beginPath();
        ctx.moveTo(FIELD.endX, FIELD.startY + offset);
        ctx.lineTo(FIELD.endX, FIELD.endY - offset);
        ctx.stroke();
        ctx.restore();

        // 5. Draw Rails Diamond Markers (Sight Diamonds)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        const drawDiamond = (x, y) => {
            ctx.beginPath();
            ctx.moveTo(x, y - 3);
            ctx.lineTo(x + 3, y);
            ctx.lineTo(x, y + 3);
            ctx.lineTo(x - 3, y);
            ctx.closePath();
            ctx.fill();
        };

        // Draw diamonds along rails
        const tableW = FIELD.endX - FIELD.startX;
        const tableH = FIELD.endY - FIELD.startY;

        for (let i = 1; i <= 3; i++) {
            // Top and Bottom diamonds
            const dxLeft = FIELD.startX + (tableW / 8) * i;
            const dxRight = FIELD.startX + (tableW / 8) * (i + 4);
            
            drawDiamond(dxLeft, 20);
            drawDiamond(dxRight, 20);
            drawDiamond(dxLeft, HEIGHT - 20);
            drawDiamond(dxRight, HEIGHT - 20);
        }
        for (let i = 1; i <= 2; i++) {
            // Left and Right diamonds
            const dy = FIELD.startY + (tableH / 4) * i;
            drawDiamond(30, dy);
            drawDiamond(WIDTH - 30, dy);
        }

        // 6. Draw Pockets (Holes)
        for (const pocket of POCKETS) {
            // Pocket ring shadow
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, 22, 0, Math.PI * 2);
            ctx.fillStyle = '#030407';
            ctx.fill();

            // Inner dark hole
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();

            // Metallic glow rim
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, 20, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // Helper for rounded rectangles
    roundRect(ctx, x, y, width, height, radius) {
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
    }

    // Draw Cue Stick orbiting cue ball
    drawCueStick(ctx, cueBall, angle, powerFraction, equippedCue = null) {
        if (!cueBall || !cueBall.active || cueBall.isPocketing) return;

        const cue = equippedCue || { name: 'Standard Cue', colors: ['#a55eea', '#2d3436'], stats: { power: 4, aim: 3 } };

        ctx.save();
        // Translate to cue ball position and rotate
        ctx.translate(cueBall.x, cueBall.y);
        ctx.rotate(angle);

        // Power pull back (offset cue stick based on current power fraction)
        // Draw back by max 60px
        const maxDrawBack = 50;
        const pullback = powerFraction * maxDrawBack;
        
        const stickLength = 260;
        const startOffset = cueBall.radius + 8 + pullback;

        // Draw shadows
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = startOffset / 2;
        ctx.shadowOffsetY = startOffset / 4;

        // Custom Cue Skins based on styling/naming
        const colors = cue.colors || ['#b8e994', '#079992']; // Default cyan/green gradient
        const cueGrad = ctx.createLinearGradient(startOffset, 0, startOffset + stickLength, 0);
        cueGrad.addColorStop(0, '#ffffff'); // Cue tip is always white/ivory
        cueGrad.addColorStop(0.04, '#a4b0be'); // Shaft collar
        cueGrad.addColorStop(0.40, colors[0]); // Primary skin color
        cueGrad.addColorStop(0.70, colors[1]); // Secondary skin color
        cueGrad.addColorStop(1.0, '#1e272e'); // Butt cap

        // Draw stick tapered shape
        ctx.beginPath();
        ctx.moveTo(startOffset, -2.5); // Tip top
        ctx.lineTo(startOffset + stickLength, -4.5); // Butt top
        ctx.lineTo(startOffset + stickLength, 4.5); // Butt bottom
        ctx.lineTo(startOffset, 2.5); // Tip bottom
        ctx.closePath();
        
        ctx.fillStyle = cueGrad;
        ctx.fill();

        // Tip leather overlay
        ctx.fillStyle = '#7ed6df'; // Blue leather tip
        ctx.fillRect(startOffset, -2.5, 3, 5);

        ctx.restore();
    }

    // Raycast and render aiming guide line (Miniclip-style)
    drawAimingGuide(ctx, cueBall, targetBalls, angle, equippedCue = null) {
        if (!cueBall || !cueBall.active || cueBall.isPocketing) return;

        const aimStat = equippedCue ? equippedCue.stats.aim : 3;
        // Aim length scales with cue aim stat: 3 => 220px, 10 => 600px
        const maxAimDist = 180 + aimStat * 40;

        // Aiming vector (pointing opposite to cue stick direction)
        const dx = -Math.cos(angle);
        const dy = -Math.sin(angle);

        let firstCollision = null;
        let minT = maxAimDist; // Raycast limit
        let collType = 'none'; // 'ball' or 'wall'

        const r = cueBall.radius;
        const doubleR = r * 2;

        // 1. Raycast vs Target Balls
        for (const target of targetBalls) {
            if (!target.active || target.isPocketing || target.type === 'cue') continue;

            // Math projection for ray-circle intersection (ray radius = 2R)
            const fx = target.x - cueBall.x;
            const fy = target.y - cueBall.y;

            // Project target center onto ray direction
            const projDist = fx * dx + fy * dy;
            if (projDist < 0) continue; // Behind ray

            // Shortest distance squared from circle center to ray line
            const distSq = (fx * fx + fy * fy) - (projDist * projDist);
            const rSq = doubleR * doubleR;

            if (distSq > rSq) continue; // Misses target circle

            // Intersection point distance along ray
            const t = projDist - Math.sqrt(rSq - distSq);

            if (t > 0 && t < minT) {
                minT = t;
                firstCollision = target;
                collType = 'ball';
            }
        }

        // 2. Check Cushion boundaries if no ball was hit within range
        let wallHitX = cueBall.x + dx * minT;
        let wallHitY = cueBall.y + dy * minT;

        if (collType === 'none') {
            // Find intersection with walls
            // Left Wall
            if (dx < 0) {
                const t = (FIELD.startX + r - cueBall.x) / dx;
                if (t > 0 && t < minT) {
                    minT = t;
                    collType = 'wall';
                }
            }
            // Right Wall
            else if (dx > 0) {
                const t = (FIELD.endX - r - cueBall.x) / dx;
                if (t > 0 && t < minT) {
                    minT = t;
                    collType = 'wall';
                }
            }

            // Top Wall
            if (dy < 0) {
                const t = (FIELD.startY + r - cueBall.y) / dy;
                if (t > 0 && t < minT) {
                    minT = t;
                    collType = 'wall';
                }
            }
            // Bottom Wall
            else if (dy > 0) {
                const t = (FIELD.endY - r - cueBall.y) / dy;
                if (t > 0 && t < minT) {
                    minT = t;
                    collType = 'wall';
                }
            }

            wallHitX = cueBall.x + dx * minT;
            wallHitY = cueBall.y + dy * minT;
        }

        // 3. Render the guide lines
        const hitX = cueBall.x + dx * minT;
        const hitY = cueBall.y + dy * minT;

        ctx.save();
        
        // Draw primary dash guide line from cue ball to contact point
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(hitX, hitY);
        ctx.stroke();

        if (collType === 'ball' && firstCollision) {
            // Draw ghost cue ball at contact location
            ctx.save();
            ctx.beginPath();
            ctx.arc(hitX, hitY, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([]);
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Calculate Normal Vector (impact path of target ball)
            const nx = (firstCollision.x - hitX) / doubleR;
            const ny = (firstCollision.y - hitY) / doubleR;

            // Draw target ball trajectory line
            const pathLen = Math.min(120, maxAimDist - minT);
            if (pathLen > 15) {
                ctx.save();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.0;
                ctx.setLineDash([]);
                
                // Add indicator circle in center of target ball path
                ctx.beginPath();
                ctx.moveTo(firstCollision.x, firstCollision.y);
                ctx.lineTo(firstCollision.x + nx * pathLen, firstCollision.y + ny * pathLen);
                ctx.stroke();

                // Draw tiny arrow head on target path
                const tx = firstCollision.x + nx * pathLen;
                const ty = firstCollision.y + ny * pathLen;
                const anglePath = Math.atan2(ny, nx);
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(tx - 6 * Math.cos(anglePath - 0.4), ty - 6 * Math.sin(anglePath - 0.4));
                ctx.moveTo(tx, ty);
                ctx.lineTo(tx - 6 * Math.cos(anglePath + 0.4), ty - 6 * Math.sin(anglePath + 0.4));
                ctx.stroke();
                ctx.restore();
            }

            // Draw cue ball deflection path (Perpendicular Tangent line)
            // Tangent direction is perpendicular to normal (nx, ny)
            // We project incoming ray (dx, dy) onto the tangent vector
            const txVal = -ny;
            const tyVal = nx;
            let dot = dx * txVal + dy * tyVal;
            
            // Choose direction matching incoming flow
            const tangentVx = txVal * (dot >= 0 ? 1 : -1);
            const tangentVy = tyVal * (dot >= 0 ? 1 : -1);

            const tangentLen = pathLen * 0.7; // slightly shorter tangent guide
            if (tangentLen > 15) {
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)'; // Glow teal for cue path
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(hitX, hitY);
                ctx.lineTo(hitX + tangentVx * tangentLen, hitY + tangentVy * tangentLen);
                ctx.stroke();
                ctx.restore();
            }
        }
        else if (collType === 'wall') {
            // Draw bounce point indicator
            ctx.beginPath();
            ctx.arc(hitX, hitY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Simple ray reflection off wall boundary
            let refDx = dx;
            let refDy = dy;
            
            // Invert vector component based on wall hit coordinates
            const margin = 0.5;
            if (Math.abs(hitX - (FIELD.startX + r)) < margin || Math.abs(hitX - (FIELD.endX - r)) < margin) {
                refDx = -dx;
            }
            if (Math.abs(hitY - (FIELD.startY + r)) < margin || Math.abs(hitY - (FIELD.endY - r)) < margin) {
                refDy = -dy;
            }

            const wallPathLen = Math.min(80, maxAimDist - minT);
            if (wallPathLen > 10) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.moveTo(hitX, hitY);
                ctx.lineTo(hitX + refDx * wallPathLen, hitY + refDy * wallPathLen);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}
const tableRenderer = new TableRenderer();


// ===== ai.js =====
// CHALLENGE CYBER-BOT: AI PATH SEARCH, ANGLE CALCULATING, AND ERROR GENERATORS

class AIOpponent {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty; // 'easy', 'medium', 'hard'
    }

    setDifficulty(diff) {
        this.difficulty = diff;
    }

    // Determine target group and find the best physical shot angle
    computeShot(cueBall, balls, targetGroup) {
        // targetGroup is 'solids', 'stripes', '8ball', or 'any'
        const r = cueBall.radius;
        const doubleR = r * 2;

        // 1. Identify eligible target balls
        const targets = [];
        if (targetGroup === 'lowest') {
            // 9-ball: must target the lowest numbered ball
            const activeSorted = balls.filter(b => b.active && !b.isPocketing && b.type !== 'cue')
                .sort((a, b) => a.number - b.number);
            if (activeSorted.length > 0) targets.push(activeSorted[0]);
        } else {
            balls.forEach(b => {
                if (!b.active || b.isPocketing || b.type === 'cue') return;
                if (targetGroup === '8ball') {
                    if (b.type === 'black') targets.push(b);
                } else if (targetGroup === 'solids') {
                    if (b.type === 'solid') targets.push(b);
                } else if (targetGroup === 'stripes') {
                    if (b.type === 'stripe') targets.push(b);
                } else {
                    if (b.type !== 'black') targets.push(b);
                }
            });
        }

        // If open table and only 8-ball left, target it
        if (targets.length === 0 && targetGroup !== '8ball') {
            const blackBall = balls.find(b => b.active && !b.isPocketing && b.type === 'black');
            if (blackBall) targets.push(blackBall);
        }

        if (targets.length === 0) {
            // Fallback: just hit anything
            const activeBalls = balls.filter(b => b.active && !b.isPocketing && b.type !== 'cue');
            if (activeBalls.length > 0) {
                targets.push(activeBalls[0]);
            } else {
                return { angle: 0, power: 0.2 }; // Nothing to hit
            }
        }

        const validShots = [];

        // 2. Scan all target balls against all pockets
        for (const target of targets) {
            for (const pocket of POCKETS) {
                // Vector target -> pocket
                const tpX = pocket.x - target.x;
                const tpY = pocket.y - target.y;
                const distTargetPocket = Math.sqrt(tpX * tpX + tpY * tpY);

                if (distTargetPocket === 0) continue;

                // Normal direction from pocket to target
                const nx = tpX / distTargetPocket;
                const ny = tpY / distTargetPocket;

                // Ghost ball center (where cue ball must contact target ball)
                // c_g = target - 2R * n
                const ghostX = target.x - nx * doubleR;
                const ghostY = target.y - ny * doubleR;

                // Check if ghost ball lies within table boundaries
                if (ghostX < FIELD.startX + r || ghostX > FIELD.endX - r ||
                    ghostY < FIELD.startY + r || ghostY > FIELD.endY - r) {
                    continue; // Cue ball can't stand here
                }

                // Vector cue ball -> ghost ball
                const cgX = ghostX - cueBall.x;
                const cgY = ghostY - cueBall.y;
                const distCueGhost = Math.sqrt(cgX * cgX + cgY * cgY);

                if (distCueGhost === 0) continue;

                // 3. Cut Angle Validation
                // Dot product of incoming cue direction and outgoing target direction
                const cueDx = cgX / distCueGhost;
                const cueDy = cgY / distCueGhost;
                
                // Cut angle is the angle between cue ball trajectory and target ball trajectory
                // Dot product of cue -> ghost and target -> pocket
                const dot = cueDx * nx + cueDy * ny;

                // If dot <= 0.1, cut is too sharp (more than 85 degrees) or behind, physically extremely hard/impossible
                if (dot <= 0.1) continue;

                // 4. Obstruction check 1: Target to Pocket path
                let pathBlocked = false;
                for (const obstacle of balls) {
                    if (!obstacle.active || obstacle.isPocketing || obstacle.number === target.number || obstacle.type === 'cue') continue;

                    // Distance of obstacle to line segment target -> pocket
                    const distToPath = this.pointToSegmentDistance(
                        obstacle.x, obstacle.y, 
                        target.x, target.y, 
                        pocket.x, pocket.y
                    );

                    // Obstacle intersects if its distance is less than double radius (leaving safety margin)
                    if (distToPath < doubleR * 0.95) {
                        pathBlocked = true;
                        break;
                    }
                }
                if (pathBlocked) continue;

                // 5. Obstruction check 2: Cue Ball to Ghost Ball path
                let cueBlocked = false;
                for (const obstacle of balls) {
                    if (!obstacle.active || obstacle.isPocketing || obstacle.number === target.number || obstacle.type === 'cue') continue;

                    const distToPath = this.pointToSegmentDistance(
                        obstacle.x, obstacle.y,
                        cueBall.x, cueBall.y,
                        ghostX, ghostY
                    );

                    if (distToPath < doubleR * 0.95) {
                        cueBlocked = true;
                        break;
                    }
                }
                if (cueBlocked) continue;

                // 6. Rate the shot quality
                // Rating favors:
                // - Smaller cut angles (straight shots, dot closer to 1)
                // - Shorter distances target -> pocket (easier pot)
                // - Shorter distances cue -> target (less aiming error magnification)
                const cutAngleScore = dot; // 0.1 to 1.0 (higher is better)
                const targetDistScore = 1.0 - (distTargetPocket / 1000); // 0 to 1 (near is better)
                const cueDistScore = 1.0 - (distCueGhost / 1000); // 0 to 1

                const score = (cutAngleScore * 3.0) + (targetDistScore * 1.5) + (cueDistScore * 0.5);

                validShots.push({
                    target: target,
                    pocket: pocket,
                    ghostX: ghostX,
                    ghostY: ghostY,
                    angle: Math.atan2(cgY, cgX),
                    distance: distTargetPocket,
                    cutScore: dot,
                    score: score
                });
            }
        }

        // 7. Choose the shot based on score and difficulty
        let selectedShot = null;

        if (validShots.length > 0) {
            // Sort by score descending
            validShots.sort((a, b) => b.score - a.score);

            if (this.difficulty === 'hard') {
                selectedShot = validShots[0]; // Hard AI always picks the optimal shot
            } else if (this.difficulty === 'medium') {
                // Medium AI picks top shot 75% of the time, or a random top 3
                const index = Math.random() < 0.75 ? 0 : Math.min(validShots.length - 1, Math.floor(Math.random() * 3));
                selectedShot = validShots[index];
            } else {
                // Easy AI picks a random valid shot out of top 5 (or less) to represent poor shot selection
                const pool = Math.min(validShots.length, 5);
                const index = Math.floor(Math.random() * pool);
                selectedShot = validShots[index];
            }
        }

        // Fallback: If no clean shot exists, find a target ball and hit it anyway
        if (!selectedShot) {
            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
            const dx = randomTarget.x - cueBall.x;
            const dy = randomTarget.y - cueBall.y;
            const angle = Math.atan2(dy, dx);
            return {
                angle: angle + Math.PI, // aiming cue stick points opposite to shot direction
                power: 0.35,
                spin: { x: 0, y: 0 }
            };
        }

        // 8. Calculate shooting parameters
        // Aiming direction for the cue stick is pointing OPPOSITE to the target direction
        // cueStickAngle = shotAngle + Math.PI
        let finalShotAngle = selectedShot.angle;

        // Apply error margin (aim noise) depending on difficulty
        let noiseRange = 0;
        if (this.difficulty === 'easy') {
            noiseRange = 0.13; // Approx +-7 degrees
        } else if (this.difficulty === 'medium') {
            noiseRange = 0.055; // Approx +-3 degrees
        } else {
            noiseRange = 0.009; // Approx +-0.5 degree (very precise)
        }

        const angleNoise = (Math.random() * 2 - 1) * noiseRange;
        finalShotAngle += angleNoise;

        // Convert shot direction to cue stick orientation angle
        const cueStickAngle = finalShotAngle + Math.PI;

        // Calculate required power: straight shots need less force, long shots or steep cuts need more
        // Base power scaled by distance
        let power = 0.2 + (selectedShot.distance / 800) * 0.45;
        // Increase power if shot is sharp cut (dot is small) to compensate for collision energy loss
        power += (1.0 - selectedShot.cutScore) * 0.25;
        // Clamp power between 0.15 and 0.95
        power = Math.min(Math.max(power, 0.15), 0.95);

        // Cyber-Bot spins! (Hard difficulty uses draw/follow spin based on physics)
        let spin = { x: 0, y: 0 };
        if (this.difficulty === 'hard') {
            // Apply draw/backspin (negative y) for close straight shots to avoid scratching
            if (selectedShot.distance < 150 && selectedShot.cutScore > 0.9) {
                spin.y = -0.6; // Backspin
            }
            // Apply follow/topspin (positive y) for long running shots
            else if (selectedShot.distance > 300 && selectedShot.cutScore > 0.8) {
                spin.y = 0.5; // Topspin
            }
        } else if (this.difficulty === 'medium' && Math.random() < 0.3) {
            // Medium AI sometimes applies a bit of random vertical spin
            spin.y = (Math.random() * 2 - 1) * 0.4;
        }

        return {
            angle: cueStickAngle,
            power: power,
            spin: spin
        };
    }

    // Helper math: distance from point C to line segment AB
    pointToSegmentDistance(cx, cy, ax, ay, bx, by) {
        const abX = bx - ax;
        const abY = by - ay;
        const acX = cx - ax;
        const acY = cy - ay;

        // Project AC onto AB
        const abLenSq = abX * abX + abY * abY;
        if (abLenSq === 0) return Math.sqrt(acX * acX + acY * acY); // A == B

        // Normalise parameter t
        let t = (acX * abX + acY * abY) / abLenSq;
        t = Math.max(0, Math.min(1, t)); // Clamp to segment

        // Closest point coordinates on segment
        const dx = ax + t * abX;
        const dy = ay + t * abY;

        // Distance C to D
        const diffX = cx - dx;
        const diffY = cy - dy;
        return Math.sqrt(diffX * diffX + diffY * diffY);
    }
}
const aiOpponent = new AIOpponent('easy');


// ===== ui.js =====
// UI MANAGER: LOCAL STORAGE, SHOP TRANSACTIONS, TIMER RINGS, AND HUD DRAWS

const CUES_DATABASE = [
    {
        id: 'cue_standard',
        name: 'Standard Cue',
        price: 0,
        stats: { power: 4, aim: 3, spin: 3 },
        colors: ['#8c7ae6', '#353b48'],
        description: 'Your reliable starting cue stick.'
    },
    {
        id: 'cue_neon_razer',
        name: 'Neon Razer',
        price: 500,
        stats: { power: 6, aim: 5, spin: 4 },
        colors: ['#00ffcc', '#00a8ff'],
        description: 'Equipped with glowing plasma sights.'
    },
    {
        id: 'cue_crimson_fire',
        name: 'Crimson Fire',
        price: 1500,
        stats: { power: 8, aim: 6, spin: 6 },
        colors: ['#ff4757', '#ff6b81'],
        description: 'Engineered for explosive shot force.'
    },
    {
        id: 'cue_chrome_cyber',
        name: 'Chrome Cyberpunk',
        price: 4000,
        stats: { power: 9, aim: 8, spin: 7 },
        colors: ['#dff9fb', '#3c40c6'],
        description: 'High-end carbon fiber and chrome plating.'
    },
    {
        id: 'cue_vortex_elite',
        name: 'Vortex Elite',
        price: 8000,
        stats: { power: 10, aim: 10, spin: 10 },
        colors: ['#ffd32a', '#ff5e57'],
        description: 'Vortex championship grade. Maximum stats.'
    },
    {
        id: 'cue_dragon_lord',
        name: 'Dragon Lord',
        price: 15000,
        legendary: true,
        stats: { power: 10, aim: 9, spin: 10 },
        colors: ['#ff0044', '#ff9500'],
        description: 'Forged in dragonfire. Devastating force with enchanted precision.',
        effect: 'flame'
    },
    {
        id: 'cue_nebula_strike',
        name: 'Nebula Strike',
        price: 25000,
        legendary: true,
        stats: { power: 10, aim: 10, spin: 9 },
        colors: ['#7b2ff7', '#00d4ff'],
        description: 'Channels the cosmos. Galaxy-tier aim assist with nebula trails.',
        effect: 'cosmic'
    },
    {
        id: 'cue_phoenix_blaze',
        name: 'Phoenix Blaze',
        price: 50000,
        legendary: true,
        stats: { power: 10, aim: 10, spin: 10 },
        colors: ['#ff6b00', '#ffe600'],
        description: 'Rises from ashes. Perfect stats. The ultimate championship cue.',
        effect: 'phoenix'
    }
];

const CITY_TABLES = [
    {
        id: 'london',
        name: 'London',
        landmark: 'Big Ben',
        mode: '8ball',
        bet: 100,
        minLevel: 1,
        trophyReward: 5,
        feltColor: '#0d6e3a',
        accentColor: '#c8a951',
        difficulty: 'easy',
        unlocked: true
    },
    {
        id: 'islamabad',
        name: 'Islamabad',
        landmark: 'Faisal Mosque',
        mode: '8ball',
        bet: 250,
        minLevel: 2,
        trophyReward: 10,
        feltColor: '#1a5c34',
        accentColor: '#2ecc71',
        difficulty: 'easy'
    },
    {
        id: 'mumbai',
        name: 'Mumbai',
        landmark: 'Gateway of India',
        mode: '9ball',
        bet: 500,
        minLevel: 4,
        trophyReward: 15,
        feltColor: '#1a3c5c',
        accentColor: '#e67e22',
        difficulty: 'medium'
    },
    {
        id: 'brasilia',
        name: 'BrasÃ­lia',
        landmark: 'Cathedral',
        mode: '8ball',
        bet: 1000,
        minLevel: 6,
        trophyReward: 25,
        feltColor: '#0a4d28',
        accentColor: '#f1c40f',
        difficulty: 'medium'
    },
    {
        id: 'newyork',
        name: 'New York',
        landmark: 'Statue of Liberty',
        mode: '9ball',
        bet: 2500,
        minLevel: 8,
        trophyReward: 40,
        feltColor: '#1c2833',
        accentColor: '#3498db',
        difficulty: 'hard'
    },
    {
        id: 'tokyo',
        name: 'Tokyo',
        landmark: 'Tokyo Tower',
        mode: '8ball',
        bet: 5000,
        minLevel: 12,
        trophyReward: 60,
        feltColor: '#2d1b3d',
        accentColor: '#e74c3c',
        difficulty: 'hard'
    },
    {
        id: 'nagasaki',
        name: 'Nagasaki',
        landmark: 'Peace Statue',
        mode: '9ball',
        bet: 10000,
        minLevel: 16,
        trophyReward: 100,
        feltColor: '#0a0a2e',
        accentColor: '#9b59b6',
        difficulty: 'hard'
    }
];

class UIManager {
    constructor() {
        this.profile = {
            coins: 1000,
            xp: 0,
            level: 1,
            unlockedCues: ['cue_standard'],
            equippedCue: 'cue_standard',
            wins: 0,
            losses: 0,
            trophies: 0
        };

        this.currentDifficulty = 'easy'; // Game state cache
        this.selectedBet = 100;
        this.selectedCity = null;
    }

    init() {
        this.loadProfile();
        this.renderLobby();
        this.setupShop();
        this.renderCityRooms();
        this.setupMainShop('standard');
        this.bindEvents();
    }

    // 1. Storage and Profile Loading
    loadProfile() {
        const stored = localStorage.getItem('vortex_pool_profile');
        if (stored) {
            try {
                this.profile = { ...this.profile, ...JSON.parse(stored) };
            } catch (e) {
                console.error("Failed to parse stored profile", e);
            }
        }
    }

    saveProfile() {
        localStorage.setItem('vortex_pool_profile', JSON.stringify(this.profile));
    }

    resetProfile() {
        this.profile = {
            coins: 1000,
            xp: 0,
            level: 1,
            unlockedCues: ['cue_standard'],
            equippedCue: 'cue_standard',
            wins: 0,
            losses: 0,
            trophies: 0
        };
        this.saveProfile();
        this.renderLobby();
        this.setupShop();
        this.showToast("Stats reset successfully!");
    }

    // 2. XP & Level Up Progression
    addXp(amount) {
        this.profile.xp += amount;
        let leveledUp = false;

        while (this.profile.xp >= this.getXpNeededForLevel(this.profile.level)) {
            const xpNeeded = this.getXpNeededForLevel(this.profile.level);
            this.profile.xp -= xpNeeded;
            this.profile.level++;
            leveledUp = true;
        }

        if (leveledUp) {
            this.showToast(`âœ¨ LEVEL UP! You reached Level ${this.profile.level}!`, 5000);
        }
        this.saveProfile();
        this.renderLobby();
        return leveledUp;
    }

    getXpNeededForLevel(level) {
        return level * 400; // e.g. 400 for L1, 800 for L2
    }

    // 3. UI Screen Transitions
    switchScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });

        const target = document.getElementById(screenId);
        if (target) {
            target.style.display = 'flex';
            // Force redraw for CSS transition
            target.offsetHeight;
            target.classList.add('active');
        }
    }

    // 4. Render lobby widgets
    renderLobby() {
        document.getElementById('lobbyCoins').innerText = this.profile.coins.toLocaleString();
        document.getElementById('lobbyLevel').innerText = `Lv.${this.profile.level}`;
        
        const xpNeeded = this.getXpNeededForLevel(this.profile.level);
        const xpPct = (this.profile.xp / xpNeeded) * 100;
        document.getElementById('lobbyXpFill').style.width = `${xpPct}%`;
        
        const equipped = this.getEquippedCue();
        document.getElementById('hudCueName').innerText = equipped.name;
        document.getElementById('statCuePower').style.width = `${equipped.stats.power * 10}%`;
        document.getElementById('statCueAim').style.width = `${equipped.stats.aim * 10}%`;
        document.getElementById('statCueSpin').style.width = `${equipped.stats.spin * 10}%`;

        document.getElementById('lobbyTrophies').innerText = this.profile.trophies || 0;
    }

    getEquippedCue() {
        return CUES_DATABASE.find(c => c.id === this.profile.equippedCue) || CUES_DATABASE[0];
    }

    // 5. Shop Setup (modal shop)
    setupShop(category = 'all', gridId = 'cueCardsGrid', coinsId = 'shopCoins') {
        const coinsEl = document.getElementById(coinsId);
        if (coinsEl) coinsEl.innerText = this.profile.coins.toLocaleString();
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.innerHTML = '';

        let filteredCues;
        if (category === 'standard') {
            filteredCues = CUES_DATABASE.filter(c => !c.legendary);
        } else if (category === 'legendary') {
            filteredCues = CUES_DATABASE.filter(c => c.legendary);
        } else {
            filteredCues = CUES_DATABASE;
        }

        filteredCues.forEach(cue => {
            const isUnlocked = this.profile.unlockedCues.includes(cue.id);
            const isEquipped = this.profile.equippedCue === cue.id;

            const card = document.createElement('div');
            card.className = `cue-shop-card glass-effect ${isEquipped ? 'equipped' : ''}`;
            
            // Build gradient stripe preview for cue stick
            const styleGrad = `linear-gradient(90deg, #ffffff 0%, #aaa 10%, ${cue.colors[0]} 40%, ${cue.colors[1]} 80%, #202020 100%)`;

            card.innerHTML = `
                <div class="cue-card-header">
                    <span class="cue-title">${cue.name}</span>
                    ${isEquipped ? '<span class="cue-badge">Equipped</span>' : ''}
                </div>
                <div style="height: 8px; width: 100%; border-radius: 4px; background: ${styleGrad}; border: 1px solid rgba(255,255,255,0.1)"></div>
                <div class="cue-card-stats">
                    <div class="cue-stat-row">
                        <span>Power:</span>
                        <div class="stat-bar"><div class="stat-fill" style="width: ${cue.stats.power * 10}%"></div></div>
                    </div>
                    <div class="cue-stat-row">
                        <span>Aim:</span>
                        <div class="stat-bar"><div class="stat-fill" style="width: ${cue.stats.aim * 10}%"></div></div>
                    </div>
                    <div class="cue-stat-row">
                        <span>Spin:</span>
                        <div class="stat-bar"><div class="stat-fill" style="width: ${cue.stats.spin * 10}%"></div></div>
                    </div>
                </div>
                <div class="cue-card-actions">
                    <div class="cue-price">
                        ${isUnlocked ? 'Unlocked' : `ðŸª™ ${cue.price.toLocaleString()}`}
                    </div>
                    ${
                        isEquipped ? '<button class="btn btn-outline btn-small" disabled>Equipped</button>' :
                        isUnlocked ? `<button class="btn btn-primary btn-small btn-equip" data-cue="${cue.id}">Equip</button>` :
                        `<button class="btn btn-accent btn-small btn-buy" data-cue="${cue.id}" data-price="${cue.price}">Buy</button>`
                    }
                </div>
            `;
            grid.appendChild(card);
        });

        // Add listeners to new buttons
        grid.querySelectorAll('.btn-equip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cueId = e.target.getAttribute('data-cue');
                this.profile.equippedCue = cueId;
                this.saveProfile();
                this.renderLobby();
                this.setupShop(category, gridId, coinsId);
                this.showToast("Cue equipped!");
            });
        });

        grid.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cueId = e.target.getAttribute('data-cue');
                const price = parseInt(e.target.getAttribute('data-price'));

                if (this.profile.coins >= price) {
                    this.profile.coins -= price;
                    this.profile.unlockedCues.push(cueId);
                    this.profile.equippedCue = cueId;
                    this.saveProfile();
                    this.renderLobby();
                    this.setupShop(category, gridId, coinsId);
                    this.showToast("Purchased and equipped!");
                } else {
                    this.showToast("âŒ Insufficient coins!", 3000);
                }
            });
        });
    }

    // 5b. Main lobby tab shop
    setupMainShop(category = 'standard') {
        const coinsEl = document.getElementById('shopCoinsMain');
        if (coinsEl) coinsEl.innerText = 'ðŸª™ ' + this.profile.coins.toLocaleString();
        const grid = document.getElementById('cueCardsGridMain');
        if (!grid) return;
        grid.innerHTML = '';

        const filteredCues = category === 'legendary' 
            ? CUES_DATABASE.filter(c => c.legendary)
            : CUES_DATABASE.filter(c => !c.legendary);

        filteredCues.forEach(cue => {
            const isUnlocked = this.profile.unlockedCues.includes(cue.id);
            const isEquipped = this.profile.equippedCue === cue.id;

            const card = document.createElement('div');
            card.className = `cue-shop-card glass-effect ${isEquipped ? 'equipped' : ''} ${cue.legendary ? 'legendary-card' : ''}`;
            
            const styleGrad = `linear-gradient(90deg, #ffffff 0%, #aaa 10%, ${cue.colors[0]} 40%, ${cue.colors[1]} 80%, #202020 100%)`;

            card.innerHTML = `
                <div class="cue-card-header">
                    <span class="cue-title">${cue.legendary ? 'âš¡ ' : ''}${cue.name}</span>
                    ${isEquipped ? '<span class="cue-badge">Equipped</span>' : ''}
                    ${cue.legendary ? '<span class="legendary-badge">LEGENDARY</span>' : ''}
                </div>
                <div style="height: 8px; width: 100%; border-radius: 4px; background: ${styleGrad}; border: 1px solid rgba(255,255,255,0.1)"></div>
                ${cue.description ? `<p class="cue-desc">${cue.description}</p>` : ''}
                <div class="cue-card-stats">
                    <div class="cue-stat-row"><span>Power:</span><div class="stat-bar"><div class="stat-fill" style="width: ${cue.stats.power * 10}%"></div></div></div>
                    <div class="cue-stat-row"><span>Aim:</span><div class="stat-bar"><div class="stat-fill" style="width: ${cue.stats.aim * 10}%"></div></div></div>
                    <div class="cue-stat-row"><span>Spin:</span><div class="stat-bar"><div class="stat-fill" style="width: ${cue.stats.spin * 10}%"></div></div></div>
                </div>
                <div class="cue-card-actions">
                    <div class="cue-price">${isUnlocked ? 'Unlocked' : `ðŸª™ ${cue.price.toLocaleString()}`}</div>
                    ${isEquipped ? '<button class="btn btn-outline btn-small" disabled>Equipped</button>' :
                      isUnlocked ? `<button class="btn btn-primary btn-small btn-equip-main" data-cue="${cue.id}">Equip</button>` :
                      `<button class="btn btn-accent btn-small btn-buy-main" data-cue="${cue.id}" data-price="${cue.price}">Buy</button>`}
                </div>
            `;
            grid.appendChild(card);
        });

        // Event listeners
        grid.querySelectorAll('.btn-equip-main').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.profile.equippedCue = e.target.getAttribute('data-cue');
                this.saveProfile();
                this.renderLobby();
                this.setupMainShop(category);
                this.showToast('Cue equipped!');
            });
        });
        grid.querySelectorAll('.btn-buy-main').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cueId = e.target.getAttribute('data-cue');
                const price = parseInt(e.target.getAttribute('data-price'));
                if (this.profile.coins >= price) {
                    this.profile.coins -= price;
                    this.profile.unlockedCues.push(cueId);
                    this.profile.equippedCue = cueId;
                    this.saveProfile();
                    this.renderLobby();
                    this.setupMainShop(category);
                    this.showToast('Purchased and equipped!');
                } else {
                    this.showToast('âŒ Insufficient coins!', 3000);
                }
            });
        });
    }

    // City Rooms rendering
    renderCityRooms() {
        const container = document.getElementById('roomsListContainer');
        container.innerHTML = '';

        CITY_TABLES.forEach(city => {
            const isUnlocked = this.profile.level >= city.minLevel;
            const canAfford = this.profile.coins >= city.bet;

            const card = document.createElement('div');
            card.className = `room-card ${!isUnlocked ? 'locked' : ''}`;
            card.innerHTML = `
                <div class="room-card-bg" style="background: linear-gradient(135deg, ${city.feltColor}, ${city.accentColor}22);">
                    <div class="room-landmark-icon">${this.getCityEmoji(city.id)}</div>
                </div>
                <div class="room-card-info">
                    <h3 class="room-city-name">${city.name}</h3>
                    <span class="room-landmark-text">${city.landmark}</span>
                    <div class="room-meta-row">
                        <span class="room-mode-badge ${city.mode}">${city.mode === '9ball' ? '9-Ball' : '8-Ball'}</span>
                        <span class="room-bet">ðŸª™ ${city.bet.toLocaleString()}</span>
                    </div>
                    <div class="room-meta-row">
                        <span class="room-trophy">ðŸ† +${city.trophyReward}</span>
                        <span class="room-difficulty ${city.difficulty}">${city.difficulty.toUpperCase()}</span>
                    </div>
                    ${!isUnlocked ? `<div class="room-lock-overlay"><span>ðŸ”’ Level ${city.minLevel}</span></div>` : ''}
                    ${isUnlocked ? `<button class="btn btn-primary btn-small room-play-btn" data-city="${city.id}" ${!canAfford ? 'disabled title="Not enough coins"' : ''}>Play</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        // Bind play buttons
        container.querySelectorAll('.room-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cityId = e.target.getAttribute('data-city');
                const city = CITY_TABLES.find(c => c.id === cityId);
                if (city) {
                    this.selectedCity = city;
                    this.selectedBet = city.bet;
                    this.currentDifficulty = city.difficulty;
                    // Dispatch custom event for game.js to catch
                    window.dispatchEvent(new CustomEvent('startCityMatch', { detail: city }));
                }
            });
        });
    }

    getCityEmoji(cityId) {
        const emojis = {
            london: 'ðŸ‡¬ðŸ‡§', islamabad: 'ðŸ‡µðŸ‡°', mumbai: 'ðŸ‡®ðŸ‡³',
            brasilia: 'ðŸ‡§ðŸ‡·', newyork: 'ðŸ‡ºðŸ‡¸', tokyo: 'ðŸ‡¯ðŸ‡µ', nagasaki: 'ðŸ¯'
        };
        return emojis[cityId] || 'ðŸŒ';
    }

    // 6. HUD In-game updates
    updateGameHUD(p1Name, p2Name, p1Group, p2Group, p1ActiveBalls, p2ActiveBalls, isAI = false) {
        document.getElementById('nameP1').innerText = p1Name;
        document.getElementById('nameP2').innerText = p2Name;

        // Group text display (Solids/Stripes/Open)
        const displayGroup = (group) => {
            if (!group) return 'Open Table';
            return group === 'solid' ? 'Solids (1-7)' : 'Stripes (9-15)';
        };

        const badgeP1 = document.getElementById('badgeP1');
        const badgeP2 = document.getElementById('badgeP2');

        badgeP1.querySelector('.badge-text').innerText = displayGroup(p1Group);
        badgeP2.querySelector('.badge-text').innerText = displayGroup(p2Group);

        // Fill balls remaining rows
        const rowP1 = document.getElementById('ballsP1');
        const rowP2 = document.getElementById('ballsP2');
        rowP1.innerHTML = '';
        rowP2.innerHTML = '';

        // Colors lookup to draw HUD indicator balls
        const colorLookup = {
            1: '#f5cd23', 2: '#1e62c9', 3: '#e82a2a', 4: '#6d1cb8', 5: '#f07113', 6: '#1c913d', 7: '#80121a',
            9: '#f5cd23', 10: '#1e62c9', 11: '#e82a2a', 12: '#6d1cb8', 13: '#f07113', 14: '#1c913d', 15: '#80121a',
            8: '#121214'
        };

        const createHUDDot = (number) => {
            const dot = document.createElement('div');
            const color = colorLookup[number] || '#fff';
            
            if (number === 8) {
                dot.className = 'ball-preview-dot solid';
                dot.style.backgroundColor = color;
            } else if (number <= 7) {
                // Solid
                dot.className = 'ball-preview-dot solid';
                dot.style.backgroundColor = color;
            } else {
                // Stripe
                dot.className = 'ball-preview-dot stripe';
                dot.style.backgroundColor = '#fdfdfb';
                
                const inner = document.createElement('div');
                inner.className = 'ball-preview-dot stripe-inner';
                inner.style.backgroundColor = color;
                dot.appendChild(inner);
            }
            return dot;
        };

        // Render remaining balls for Player 1
        p1ActiveBalls.forEach(n => rowP1.appendChild(createHUDDot(n)));
        
        // Render remaining balls for Player 2
        p2ActiveBalls.forEach(n => rowP2.appendChild(createHUDDot(n)));
    }

    updateTimerRings(activePlayerIndex, progressFraction) {
        const timerRing1 = document.getElementById('timerP1');
        const timerRing2 = document.getElementById('timerP2');

        const pct = Math.max(0, Math.min(100, Math.round(progressFraction * 100)));
        const strokeVal = `${pct}, 100`;

        if (activePlayerIndex === 0) {
            timerRing1.setAttribute('stroke-dasharray', strokeVal);
            timerRing2.setAttribute('stroke-dasharray', '100, 100');
        } else {
            timerRing2.setAttribute('stroke-dasharray', strokeVal);
            timerRing1.setAttribute('stroke-dasharray', '100, 100');
        }
    }

    // Status Banner Toast
    showToast(message, duration = 3000) {
        const status = document.getElementById('statusMessage');
        if (status) {
            status.innerText = message;
            // Highlight animation restart
            status.style.animation = 'none';
            status.offsetHeight; // trigger reflow
            status.style.animation = 'pulseGlow 2s infinite ease-in-out';
        }
    }

    // Modal Control
    openShop() {
        this.setupShop();
        document.getElementById('shopModal').classList.add('active');
    }

    closeShop() {
        document.getElementById('shopModal').classList.remove('active');
    }

    showGameOver(victory, p2Name, coinsEarned, xpEarned, stakesBet) {
        this.switchScreen('lobbyScreen'); // Move back to main lobby under overlay
        
        const modal = document.getElementById('gameOverModal');
        const header = document.getElementById('resultHeader');
        const subtitle = document.getElementById('resultSubtitle');
        const rewardCoinsText = document.getElementById('rewardCoins');
        const rewardXpText = document.getElementById('rewardXp');

        if (victory) {
            header.innerText = 'VICTORY!';
            header.classList.remove('result-lost');
            subtitle.innerText = `You defeated ${p2Name}`;
            rewardCoinsText.innerText = `+${coinsEarned.toLocaleString()}`;
            rewardCoinsText.style.color = 'var(--color-accent)';
            this.profile.wins++;
            
            // Add rewards
            this.profile.coins += coinsEarned;
            this.addXp(xpEarned);

            // Add trophies on victory
            this.profile.trophies = (this.profile.trophies || 0) + (this.selectedCity ? this.selectedCity.trophyReward : 5);
        } else {
            header.innerText = 'MATCH LOST';
            header.classList.add('result-lost');
            subtitle.innerText = `${p2Name} won the match`;
            rewardCoinsText.innerText = `-${stakesBet.toLocaleString()}`;
            rewardCoinsText.style.color = 'var(--color-foul)';
            this.profile.losses++;

            // Subtract bet stakes
            this.profile.coins = Math.max(0, this.profile.coins - stakesBet);
            this.addXp(Math.round(xpEarned * 0.3)); // minor XP consolation
        }

        rewardXpText.innerText = `+${xpEarned.toLocaleString()}`;

        // Level text progress update inside modal
        const nextLevel = this.profile.level;
        const xpNeeded = this.getXpNeededForLevel(nextLevel);
        const xpPct = (this.profile.xp / xpNeeded) * 100;
        
        document.getElementById('rewardLevelText').innerText = `Level ${nextLevel}`;
        document.getElementById('rewardXpText').innerText = `${this.profile.xp} / ${xpNeeded} XP`;
        document.getElementById('rewardXpFill').style.width = `${xpPct}%`;

        this.saveProfile();
        this.renderLobby();
        modal.classList.add('active');
    }

    closeGameOver() {
        document.getElementById('gameOverModal').classList.remove('active');
    }

    bindEvents() {
        // Toggle Shop
        const openShopBtn = document.getElementById('btnOpenShop');
        if (openShopBtn) openShopBtn.addEventListener('click', () => this.openShop());

        const closeShopBtn = document.getElementById('btnCloseShop');
        if (closeShopBtn) closeShopBtn.addEventListener('click', () => this.closeShop());
        
        // Reset stats
        const resetStatsBtn = document.getElementById('btnResetStats');
        if (resetStatsBtn) resetStatsBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to reset all coins, stats, and unlocked cues?")) {
                this.resetProfile();
            }
        });

        // Collect Rewards
        const rewardCollectBtn = document.getElementById('btnRewardCollect');
        if (rewardCollectBtn) rewardCollectBtn.addEventListener('click', () => this.closeGameOver());

        // Stake Bet options Cache
        const betSelect = document.getElementById('betSelect');
        if (betSelect) betSelect.addEventListener('change', (e) => {
            this.selectedBet = parseInt(e.target.value);
        });

        // Difficulty select
        const diffBtns = document.querySelectorAll('.difficulty-select .diff-btn');
        diffBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                diffBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDifficulty = e.target.getAttribute('data-difficulty');
            });
        });

        // Lobby tab switching
        const tabBtns = document.querySelectorAll('.lobby-navigation-tabs .tab-btn');
        const tabPanes = {
            'tabBtnRooms': 'tabContentRooms',
            'tabBtnShop': 'tabContentShop', 
            'tabBtnPractice': 'tabContentPractice'
        };
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Object.values(tabPanes).forEach(paneId => {
                    const pane = document.getElementById(paneId);
                    if (pane) {
                        pane.classList.remove('active');
                        pane.style.display = 'none';
                    }
                });
                const targetPane = document.getElementById(tabPanes[btn.id]);
                if (targetPane) {
                    targetPane.style.display = 'block';
                    targetPane.classList.add('active');
                }
                if (btn.id === 'tabBtnShop') this.setupMainShop('standard');
                if (btn.id === 'tabBtnRooms') this.renderCityRooms();
            });
        });

        // Shop category tabs
        const btnStandard = document.getElementById('btnShopCatStandard');
        const btnLegendary = document.getElementById('btnShopCatLegendary');
        if (btnStandard) {
            btnStandard.addEventListener('click', () => {
                btnStandard.classList.add('active');
                btnLegendary.classList.remove('active');
                this.setupMainShop('standard');
            });
        }
        if (btnLegendary) {
            btnLegendary.addEventListener('click', () => {
                btnLegendary.classList.add('active');
                btnStandard.classList.remove('active');
                this.setupMainShop('legendary');
            });
        }

        // Scroll arrows for rooms
        const scrollContainer = document.getElementById('roomsListContainer');
        const slideLeft = document.getElementById('slideLeft');
        const slideRight = document.getElementById('slideRight');
        if (slideLeft && scrollContainer) {
            slideLeft.addEventListener('click', () => scrollContainer.scrollBy({ left: -260, behavior: 'smooth' }));
        }
        if (slideRight && scrollContainer) {
            slideRight.addEventListener('click', () => scrollContainer.scrollBy({ left: 260, behavior: 'smooth' }));
        }
    }
}

const ui = new UIManager();
ui.init();


// ===== game.js =====
// CORE GAME MANAGER: RENDERING LOOPS, RULES ENFORCER, USER INPUTS, AND TURN CONTROLLERS

var WIDTH = 960;
var HEIGHT = 540;

class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;

        // Game States
        this.gameMode = 'lobby'; // 'lobby', 'practice', 'pvp', 'ai'
        this.playState = 'aiming'; // 'aiming', 'shooting', 'rolling', 'placingCue', 'aiThinking'
        this.gameRules = '8ball'; // '8ball' or '9ball'
        
        // Objects
        this.balls = [];
        this.cueBall = null;
        this.spinState = { x: 0, y: 0 }; // side-spin [-1, 1], vertical draw/follow [-1, 1]
        
        // Aim / Shoot parameters
        this.cueAngle = 0; // angle of the cue stick (radians)
        this.powerFraction = 0; // 0 to 1
        this.isDraggingPower = false;
        this.isDraggingAim = false;
        
        // Turn management
        this.players = [
            { name: 'Player 1', group: null, activeBalls: [] },
            { name: 'Cyber-Bot', group: null, activeBalls: [] }
        ];
        this.activePlayerIndex = 0;
        this.tableOpen = true;
        this.winner = null;
        
        // Rule tracking for current shot
        this.shotResult = {
            cueSunk: false,
            blackSunk: false,
            solidsSunkCount: 0,
            stripesSunkCount: 0,
            sunkBallNumbers: [],
            firstContactBall: null,
            foulOccurred: false,
            foulReason: ''
        };

        // Turn Timer
        this.turnTimeLeft = 30; // 30 seconds
        this.timerInterval = null;

        // Mouse placements
        this.isPlacingDrag = false;
        this.mousePos = { x: 0, y: 0 };

        // AI animation variables
        this.aiTargetAngle = 0;
        this.aiTargetPower = 0;
        this.aiAnimProgress = 0;
    }

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.bindEvents();
        this.resetGameVariables();

        // Start Animation Loop
        requestAnimationFrame((t) => this.tick(t));
    }

    resetGameVariables() {
        this.balls = [];
        this.spinState = { x: 0, y: 0 };
        this.cueAngle = Math.PI;
        this.powerFraction = 0;
        this.tableOpen = true;
        this.winner = null;
        this.activePlayerIndex = 0;
        this.players[0].group = null;
        this.players[1].group = null;
        this.players[0].activeBalls = [];
        this.players[1].activeBalls = [];
        this.clearTimer();
    }

    // 1. Racking the balls in a standard triangle grid
    rackBalls() {
        this.balls = [];
        const r = 12;
        
        // Cue ball on the headstring D-zone spot
        const headStringX = FIELD.startX + (FIELD.endX - FIELD.startX) * 0.25;
        this.cueBall = new Ball(0, headStringX, HEIGHT / 2, r);
        this.balls.push(this.cueBall);

        // Rack vertices
        const footSpotX = FIELD.startX + (FIELD.endX - FIELD.startX) * 0.75;
        const footSpotY = HEIGHT / 2;

        const dX = r * 2 * Math.cos(Math.PI / 6) + 0.1; // Row horizontal step with micro gap
        const dY = r + 0.05; // Row vertical step

        // Rack pattern numbers layout (official balance)
        // Apex is 1 (solid)
        // Row 1: 9 (stripe), 2 (solid)
        // Row 2: 3 (solid), 8 (black), 10 (stripe)
        // Row 3: 11 (stripe), 4 (solid), 12 (stripe), 5 (solid)
        // Row 4: 6 (solid), 13 (stripe), 14 (stripe), 7 (solid), 15 (stripe)
        const rackOrder = [
            1,
            9, 2,
            3, 8, 10,
            11, 4, 12, 5,
            6, 13, 14, 7, 15
        ];

        let idx = 0;
        // 5 rows triangle
        for (let row = 0; row < 5; row++) {
            const x = footSpotX + row * dX;
            for (let col = 0; col <= row; col++) {
                const y = footSpotY + (col - row * 0.5) * (dY * 2);
                const number = rackOrder[idx++];
                const ball = new Ball(number, x, y, r);
                this.balls.push(ball);
            }
        }
    }

    rackBalls9Ball() {
        this.balls = [];
        const r = 12;
        
        // Cue ball on headstring
        const headStringX = FIELD.startX + (FIELD.endX - FIELD.startX) * 0.25;
        this.cueBall = new Ball(0, headStringX, HEIGHT / 2, r);
        this.balls.push(this.cueBall);

        // Diamond formation for 9-ball (official rack)
        // Diamond shape: rows of 1-2-3-2-1, balls numbered 1-9
        // 1-ball at apex, 9-ball in center, rest random
        const footSpotX = FIELD.startX + (FIELD.endX - FIELD.startX) * 0.75;
        const footSpotY = HEIGHT / 2;
        const dX = r * 2 * Math.cos(Math.PI / 6) + 0.1;
        const dY = r + 0.05;

        // Positions in diamond: row counts = [1, 2, 3, 2, 1]
        // Official: 1 at apex, 9 in middle of row 3, rest shuffled
        let remaining = [2, 3, 4, 5, 6, 7, 8];
        // Shuffle remaining
        for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }

        // Diamond layout positions [row][col offset from center]
        const diamondPositions = [
            [{ row: 0, col: 0 }],                          // Row 0: 1 ball (apex = ball 1)
            [{ row: 1, col: -0.5 }, { row: 1, col: 0.5 }], // Row 1: 2 balls
            [{ row: 2, col: -1 }, { row: 2, col: 0 }, { row: 2, col: 1 }], // Row 2: 3 balls (center = ball 9)
            [{ row: 3, col: -0.5 }, { row: 3, col: 0.5 }], // Row 3: 2 balls
            [{ row: 4, col: 0 }]                           // Row 4: 1 ball
        ];

        // Assign ball numbers
        // Flatten positions
        const allPos = diamondPositions.flat();
        // Index 0 = ball 1 (apex)
        // Index 4 = center of row 2 = ball 9
        const ballAssignment = new Array(9);
        ballAssignment[0] = 1; // apex
        ballAssignment[4] = 9; // center of diamond
        let remIdx = 0;
        for (let i = 0; i < 9; i++) {
            if (i === 0 || i === 4) continue;
            ballAssignment[i] = remaining[remIdx++];
        }

        for (let i = 0; i < allPos.length; i++) {
            const pos = allPos[i];
            const x = footSpotX + pos.row * dX;
            const y = footSpotY + pos.col * (dY * 2);
            const number = ballAssignment[i];
            const ball = new Ball(number, x, y, r);
            this.balls.push(ball);
        }
    }

    startMatch(mode, cityConfig = null) {
        this.gameMode = mode;
        this.resetGameVariables();
        
        // Determine game rules from city config
        if (cityConfig && cityConfig.mode) {
            this.gameRules = cityConfig.mode;
        } else {
            this.gameRules = '8ball';
        }
        
        // Rack based on game rules
        if (this.gameRules === '9ball') {
            this.rackBalls9Ball();
        } else {
            this.rackBalls();
        }

        // Configure player statistics
        if (mode === 'practice') {
            this.players[0].name = ui.profile.playerName || 'Player 1';
            this.players[1].name = 'N/A';
            this.playState = 'aiming';
            ui.showToast("Practice Mode - Pot all balls!");
        } else if (mode === 'pvp') {
            this.players[0].name = 'Player 1';
            this.players[1].name = 'Player 2';
            this.playState = 'aiming';
            this.startTurnTimer();
            ui.showToast("Player 1's Turn - Break Shot!");
        } else if (mode === 'ai') {
            this.players[0].name = ui.profile.playerName || 'Player 1';
            this.players[1].name = 'Cyber-Bot';
            aiOpponent.setDifficulty(ui.currentDifficulty);
            this.playState = 'aiming';
            this.startTurnTimer();
            ui.showToast(`Cyber-Bot match (${ui.currentDifficulty.toUpperCase()}) - ${this.gameRules === '9ball' ? '9-Ball' : '8-Ball'} Break!`);
        }

        this.updateHUD();
        ui.switchScreen('gameScreen');
    }

    // 2. Turn Timers & Intervals
    startTurnTimer() {
        this.clearTimer();
        if (this.gameMode === 'practice') return;

        this.turnTimeLeft = 30;
        ui.updateTimerRings(this.activePlayerIndex, 1.0);

        this.timerInterval = setInterval(() => {
            if (this.playState === 'aiming' || this.playState === 'placingCue' || this.playState === 'aiThinking') {
                this.turnTimeLeft--;
                const fraction = this.turnTimeLeft / 30;
                ui.updateTimerRings(this.activePlayerIndex, fraction);

                if (this.turnTimeLeft <= 0) {
                    this.clearTimer();
                    this.handleTimeOutFoul();
                }
            }
        }, 1000);
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    handleTimeOutFoul() {
        ui.showToast("â° TIME OUT! Foul committed.");
        sounds.playCueHit(0.2); // play small buzzer/thud

        // Mark foul details
        this.shotResult.foulOccurred = true;
        this.shotResult.foulReason = 'Time Out';
        
        // Pass turn with ball-in-hand
        this.endTurnAnalysis();
    }

    // 3. Engine update tick
    tick(timestamp) {
        this.updatePhysics();
        this.updateAITurn();
        this.renderCanvas();
        requestAnimationFrame((t) => this.tick(t));
    }

    // High fidelity substep physics resolver
    updatePhysics() {
        if (this.playState !== 'rolling') {
            // Update spiral pocket animations even when not actively rolling
            this.balls.forEach(b => b.update());
            return;
        }

        // Substepping splits the frame speed into 4 updates to prevent overlaps or clipping glitches
        const substeps = 4;
        for (let step = 0; step < substeps; step++) {
            // 1. Move balls
            this.balls.forEach(b => b.update());

            // 2. Resolve cushion boundaries
            this.balls.forEach(b => {
                resolveCushionCollisions(b, b.type === 'cue' ? this.spinState : null);
            });

            // 3. Check pockets
            this.balls.forEach(b => {
                resolvePocketCollisions(b, (pocketedBall) => this.handleBallPocketed(pocketedBall));
            });

            // 4. Resolve ball-to-ball collisions
            resolveBallCollisions(
                this.balls, 
                this.spinState, 
                (contactedBall) => this.handleFirstContact(contactedBall)
            );

            // 5. Apply friction
            this.balls.forEach(b => applyFriction(b));
        }

        // Check if all balls have fully stopped
        let isRolling = false;
        for (const ball of this.balls) {
            if (ball.active && (ball.vx !== 0 || ball.vy !== 0 || ball.isPocketing)) {
                isRolling = true;
                break;
            }
        }

        if (!isRolling) {
            // All balls stopped, analyze shot results!
            this.playState = 'aiming'; // Fallback base state
            this.endTurnAnalysis();
        }
    }

    handleBallPocketed(ball) {
        this.shotResult.sunkBallNumbers.push(ball.number);
        
        if (ball.type === 'cue') {
            this.shotResult.cueSunk = true;
        } else if (ball.type === 'black') {
            this.shotResult.blackSunk = true;
        } else if (ball.type === 'solid') {
            this.shotResult.solidsSunkCount++;
        } else if (ball.type === 'stripe') {
            this.shotResult.stripesSunkCount++;
        }
    }

    handleFirstContact(ball) {
        if (!this.shotResult.firstContactBall) {
            this.shotResult.firstContactBall = ball;
        }
    }

    // Cyber-Bot shooting automation
    updateAITurn() {
        if (this.playState !== 'aiThinking') return;

        // Perform gradual rotation of cue stick and power bar pulls (Visual shot aiming)
        this.aiAnimProgress += 0.02;

        // Rotate cue stick towards optimal angle
        const angleDiff = this.aiTargetAngle - this.cueAngle;
        // Wrap angle
        const wrappedAngleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        this.cueAngle += wrappedAngleDiff * 0.1;

        // Pull back power slider
        if (this.aiAnimProgress > 0.6) {
            const powerDiff = this.aiTargetPower - this.powerFraction;
            this.powerFraction += powerDiff * 0.15;
            this.updatePowerMeterUI();
        }

        // Fire shot when animation concludes
        if (this.aiAnimProgress >= 1.0) {
            this.cueAngle = this.aiTargetAngle;
            this.powerFraction = this.aiTargetPower;
            this.fireCueBall();
        }
    }

    // 4. Core game enforcer logic after rolling stops
    endTurnAnalysis() {
        if (this.gameRules === '9ball') {
            this.endTurnAnalysis9Ball();
            return;
        }

        this.clearTimer();

        // 1. Practice Mode Analysis
        if (this.gameMode === 'practice') {
            if (this.shotResult.blackSunk) {
                // Sunk the 8 ball
                const remaining = this.balls.filter(b => b.active && b.type !== 'cue');
                if (remaining.length === 0) {
                    ui.showGameOver(true, 'Practice', 100, 150, 0);
                } else {
                    ui.showToast("Pocketed 8-ball early! Table reset.");
                    this.startMatch('practice');
                }
                this.resetShotTracker();
                return;
            }

            if (this.shotResult.cueSunk) {
                ui.showToast("Scratch! Placing cue ball.");
                this.respawnCueBall();
                this.playState = 'placingCue';
            }

            this.resetShotTracker();
            this.updateHUD();
            return;
        }

        // 2. VS/AI Mode Rules enforcer
        const activePlayer = this.players[this.activePlayerIndex];
        const opponentPlayer = this.players[1 - this.activePlayerIndex];

        let isFoul = false;
        let foulMsg = '';

        // Check cue ball pocketed (Scratch)
        if (this.shotResult.cueSunk) {
            isFoul = true;
            foulMsg = 'Scratch! Cue ball pocketed.';
        }
        // Check contact foul
        else if (!this.shotResult.firstContactBall) {
            isFoul = true;
            foulMsg = 'Foul! Cue ball missed target balls.';
        }
        // Check correct group hit
        else if (activePlayer.group) {
            const first = this.shotResult.firstContactBall;
            if (activePlayer.activeBalls.length > 0 && first.type !== activePlayer.group) {
                isFoul = true;
                foulMsg = `Foul! Hit ${first.type === 'solid' ? 'solids' : 'stripes'} first.`;
            } else if (activePlayer.activeBalls.length === 0 && first.type !== 'black') {
                isFoul = true;
                foulMsg = 'Foul! Must hit the 8-ball first.';
            }
        }
        // Check open table black ball hit
        else if (this.tableOpen && this.shotResult.firstContactBall.type === 'black') {
            isFoul = true;
            foulMsg = 'Foul! Hitting 8-ball first on open table.';
        }

        this.shotResult.foulOccurred = isFoul;
        this.shotResult.foulReason = foulMsg;

        // 3. Evaluate 8-Ball Game Over Conditions
        if (this.shotResult.blackSunk) {
            let winMatch = false;

            if (isFoul) {
                winMatch = false; // Sunk 8-ball, but scratched/foul = automatic loss
                foulMsg = 'Foul on 8-ball! Match Lost.';
            } else if (activePlayer.activeBalls.length > 0) {
                winMatch = false; // Sunk 8-ball too early = loss
                foulMsg = '8-ball pocketed early! Match Lost.';
            } else {
                winMatch = true; // Legit victory
            }

            this.concludeMatch(winMatch ? this.activePlayerIndex : (1 - this.activePlayerIndex), foulMsg);
            this.resetShotTracker();
            return;
        }

        // 4. Assign Groups (Stripes vs Solids)
        let groupAssignedThisTurn = false;
        if (!isFoul && this.tableOpen && this.shotResult.sunkBallNumbers.length > 0) {
            // Find what ball types fell
            const hasSolids = this.shotResult.solidsSunkCount > 0;
            const hasStripes = this.shotResult.stripesSunkCount > 0;

            if (hasSolids && !hasStripes) {
                activePlayer.group = 'solid';
                opponentPlayer.group = 'stripe';
                this.tableOpen = false;
                groupAssignedThisTurn = true;
                ui.showToast(`${activePlayer.name} assigned Solids!`);
            } else if (hasStripes && !hasSolids) {
                activePlayer.group = 'stripe';
                opponentPlayer.group = 'solid';
                this.tableOpen = false;
                groupAssignedThisTurn = true;
                ui.showToast(`${activePlayer.name} assigned Stripes!`);
            } else if (hasSolids && hasStripes) {
                // Pocketed both. Assign based on the first target ball pocketed in order of sequence
                // For simplicity, assign based on first contact or solids
                activePlayer.group = 'solid';
                opponentPlayer.group = 'stripe';
                this.tableOpen = false;
                groupAssignedThisTurn = true;
                ui.showToast(`${activePlayer.name} assigned Solids!`);
            }
        }

        // 5. Turn progression
        let keepTurn = false;
        if (!isFoul) {
            // Check if active player pocketed their own ball
            if (activePlayer.group === 'solid' && this.shotResult.solidsSunkCount > 0) {
                keepTurn = true;
            } else if (activePlayer.group === 'stripe' && this.shotResult.stripesSunkCount > 0) {
                keepTurn = true;
            } else if (this.tableOpen && this.shotResult.sunkBallNumbers.length > 0) {
                keepTurn = true; // Practice/Open table potting
            }
        }

        if (isFoul) {
            ui.showToast(`ðŸš¨ ${foulMsg} - Ball in Hand!`);
            this.activePlayerIndex = 1 - this.activePlayerIndex; // pass turn
            this.respawnCueBall();
            this.playState = 'placingCue';
        } else if (!keepTurn) {
            // Pass turn normally
            this.activePlayerIndex = 1 - this.activePlayerIndex;
            ui.showToast(`${this.players[this.activePlayerIndex].name}'s Turn`);
            this.playState = 'aiming';
        } else {
            // Keep turn
            if (!groupAssignedThisTurn) {
                ui.showToast(`${activePlayer.name} pocketed target. Shoot again!`);
            }
            this.playState = 'aiming';
        }

        // Refresh lists of remaining balls
        this.updateHUD();

        // 6. AI trigger if next player is AI
        if (this.gameMode === 'ai' && this.activePlayerIndex === 1) {
            if (this.playState === 'placingCue') {
                this.aiPlaceCueBallHand();
            } else {
                this.triggerAIOpponent();
            }
        } else {
            this.startTurnTimer();
        }

        this.resetShotTracker();
    }

    concludeMatch(winnerIndex, reason) {
        this.winner = this.players[winnerIndex];
        const isPlayer1Victory = winnerIndex === 0;

        const stakes = ui.selectedBet;
        const rewardCoins = stakes * 2;
        const rewardXp = stakes >= 1000 ? 250 : 100;

        setTimeout(() => {
            ui.showGameOver(isPlayer1Victory, this.players[1].name, rewardCoins, rewardXp, stakes);
        }, 1200);
    }

    resetShotTracker() {
        this.shotResult = {
            cueSunk: false,
            blackSunk: false,
            solidsSunkCount: 0,
            stripesSunkCount: 0,
            sunkBallNumbers: [],
            firstContactBall: null,
            foulOccurred: false,
            foulReason: ''
        };
        // Reset spin marker
        this.spinState = { x: 0, y: 0 };
        document.getElementById('spinMarker').style.top = '50%';
        document.getElementById('spinMarker').style.left = '50%';
        document.getElementById('spinFeedback').innerText = 'No spin';
    }

    respawnCueBall() {
        this.cueBall.active = true;
        this.cueBall.isPocketing = false;
        this.cueBall.pocketAnimProgress = 1.0;
        this.cueBall.vx = 0;
        this.cueBall.vy = 0;
        
        // Find safe coordinate on headstring line
        const headStringX = FIELD.startX + (FIELD.endX - FIELD.startX) * 0.25;
        this.cueBall.x = headStringX;
        this.cueBall.y = HEIGHT / 2;
    }

    updateHUD() {
        if (this.gameRules === '9ball') {
            // In 9-ball, show all remaining balls for both players
            const allRemaining = this.balls.filter(b => b.active && b.type !== 'cue').map(b => b.number).sort((a, b) => a - b);
            this.players[0].activeBalls = [...allRemaining];
            this.players[1].activeBalls = [...allRemaining];
            
            // Update HUD
            ui.updateGameHUD(
                this.players[0].name, this.players[1].name,
                '9-Ball', '9-Ball',
                this.players[0].activeBalls, this.players[1].activeBalls,
                this.gameMode === 'ai'
            );
            document.getElementById('matchPot').innerText = `ðŸª™ ${(ui.selectedBet * 2).toLocaleString()}`;
            return;
        }

        // Find active balls remaining
        const solidsLeft = this.balls.filter(b => b.active && b.type === 'solid').map(b => b.number);
        const stripesLeft = this.balls.filter(b => b.active && b.type === 'stripe').map(b => b.number);
        
        // Add 8 ball to list if group is clear
        const blackActive = this.balls.find(b => b.type === 'black' && b.active);
        
        // Assign HUD ball lists
        for (let i = 0; i < 2; i++) {
            const player = this.players[i];
            if (player.group === 'solid') {
                player.activeBalls = [...solidsLeft];
                if (solidsLeft.length === 0 && blackActive) player.activeBalls.push(8);
            } else if (player.group === 'stripe') {
                player.activeBalls = [...stripesLeft];
                if (stripesLeft.length === 0 && blackActive) player.activeBalls.push(8);
            } else {
                // Table open
                player.activeBalls = [];
            }
        }

        // Draw HUD details
        ui.updateGameHUD(
            this.players[0].name,
            this.players[1].name,
            this.players[0].group,
            this.players[1].group,
            this.players[0].activeBalls,
            this.players[1].activeBalls,
            this.gameMode === 'ai'
        );

        // Update pot
        document.getElementById('matchPot').innerText = `ðŸª™ ${(ui.selectedBet * 2).toLocaleString()}`;
    }

    // AI positioning logic for ball-in-hand
    aiPlaceCueBallHand() {
        this.playState = 'aiThinking';
        this.clearTimer();

        setTimeout(() => {
            // Find a safe spot behind the headstring that doesn't overlap other balls
            let safeX = FIELD.startX + (FIELD.endX - FIELD.startX) * 0.25;
            let safeY = HEIGHT / 2;
            let overlap = true;
            let attempts = 0;

            while (overlap && attempts < 100) {
                overlap = false;
                // AI can place anywhere on the left half of table for breaks, or anywhere for general fouls
                safeX = FIELD.startX + 30 + Math.random() * 300;
                safeY = FIELD.startY + 30 + Math.random() * 300;
                
                for (const b of this.balls) {
                    if (b.number === 0 || !b.active) continue;
                    const dx = safeX - b.x;
                    const dy = safeY - b.y;
                    if (Math.sqrt(dx*dx + dy*dy) < (this.cueBall.radius + b.radius + 5)) {
                        overlap = true;
                        break;
                    }
                }
                attempts++;
            }

            this.cueBall.x = safeX;
            this.cueBall.y = safeY;
            this.playState = 'aiming';
            ui.showToast("Cyber-Bot placed the cue ball.");
            this.triggerAIOpponent();
        }, 1500);
    }

    triggerAIOpponent() {
        this.playState = 'aiThinking';
        this.clearTimer();

        // Target group
        let targetGroup;
        if (this.gameRules === '9ball') {
            // In 9-ball, target the lowest numbered ball
            const activeBalls = this.balls.filter(b => b.active && b.type !== 'cue').sort((a, b) => a.number - b.number);
            targetGroup = activeBalls.length > 0 ? 'lowest' : 'any';
        } else {
            targetGroup = this.players[1].group || 'any';
        }
        
        // Calculate shot
        const shotParams = aiOpponent.computeShot(this.cueBall, this.balls, targetGroup);

        this.aiTargetAngle = shotParams.angle;
        this.aiTargetPower = shotParams.power;
        this.spinState = shotParams.spin;
        this.aiAnimProgress = 0;

        // Apply visual spin indicator dot reflection
        const marker = document.getElementById('spinMarker');
        marker.style.left = `${50 + shotParams.spin.x * 50}%`;
        marker.style.top = `${50 + shotParams.spin.y * 50}%`;
        document.getElementById('spinFeedback').innerText = 
            `Draw: ${Math.round(shotParams.spin.y * 100)}, Sidespin: ${Math.round(shotParams.spin.x * 100)}`;
    }

    // 5. Cue Ball Firing Math
    fireCueBall() {
        this.playState = 'rolling';
        
        const forceStat = ui.getEquippedCue().stats.power;
        // Strike velocity scaling with cue power
        const maxVelocity = 12 + (forceStat * 0.7);
        const impulseSpeed = this.powerFraction * maxVelocity;

        // Angle is opposite to aiming direction line
        const shotAngle = this.cueAngle - Math.PI;

        this.cueBall.vx = Math.cos(shotAngle) * impulseSpeed;
        this.cueBall.vy = Math.sin(shotAngle) * impulseSpeed;

        sounds.playCueHit(this.powerFraction);

        // Reset variables
        this.powerFraction = 0;
        this.updatePowerMeterUI();
    }

    // 6. Rendering loop
    renderCanvas() {
        // Redraw table felt and cushions
        const activeColor = this.activePlayerIndex === 0 ? '#00e5ff' : '#a020f0';
        tableRenderer.drawTable(this.ctx, activeColor);

        // Draw aiming guides
        if (this.playState === 'aiming' && this.cueBall) {
            // Find active target balls (filter out cue ball)
            const targetBalls = this.balls.filter(b => b.active && b.number !== 0);
            
            // Get equipped cue for aim guides stats
            const currentCue = ui.getEquippedCue();
            tableRenderer.drawAimingGuide(this.ctx, this.cueBall, targetBalls, this.cueAngle, currentCue);
        }

        // Draw balls
        this.balls.forEach(b => b.draw(this.ctx));

        // Draw cue stick on top of balls
        if ((this.playState === 'aiming' || this.playState === 'aiThinking') && this.cueBall) {
            const currentCue = ui.getEquippedCue();
            tableRenderer.drawCueStick(this.ctx, this.cueBall, this.cueAngle, this.powerFraction, currentCue);
        }

        // Draw placements indicator rings
        if (this.playState === 'placingCue') {
            this.ctx.beginPath();
            this.ctx.arc(this.cueBall.x, this.cueBall.y, this.cueBall.radius + 6, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([3, 3]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    updatePowerMeterUI() {
        const fill = document.getElementById('powerFill');
        const handle = document.getElementById('powerHandle');
        const percentage = this.powerFraction * 100;
        
        fill.style.height = `${percentage}%`;
        // Clamp handle position
        handle.style.bottom = `calc(${percentage}% - 6px)`;
    }

    // 7. Event listeners and mouse tracking
    bindEvents() {
        // Lobby controls
        const playPracticeBtn = document.getElementById('btnPlayPractice');
        if (playPracticeBtn) playPracticeBtn.addEventListener('click', () => this.startMatch('practice'));

        const playPassPlayBtn = document.getElementById('btnPlayPassPlay');
        if (playPassPlayBtn) playPassPlayBtn.addEventListener('click', () => this.startMatch('pvp'));

        const playAIBtn = document.getElementById('btnPlayAI');
        if (playAIBtn) playAIBtn.addEventListener('click', () => {
            if (ui.profile.coins >= ui.selectedBet) {
                this.startMatch('ai');
            } else {
                ui.showToast("âŒ Insufficient coins to cover stake!");
            }
        });

        window.addEventListener('startCityMatch', (e) => {
            const city = e.detail;
            this.startMatch('ai', city);
        });

        // Quit game button
        document.getElementById('btnLeaveGame').addEventListener('click', () => {
            if (confirm("Are you sure you want to quit the match? You will lose your stakes.")) {
                this.clearTimer();
                if (this.gameMode === 'ai') {
                    // deduct stakes as loss
                    ui.profile.losses++;
                    ui.profile.coins = Math.max(0, ui.profile.coins - ui.selectedBet);
                    ui.saveProfile();
                    ui.renderLobby();
                }
                ui.switchScreen('lobbyScreen');
            }
        });

        // Track mouse coords on canvas
        const getCanvasMouse = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = WIDTH / rect.width;
            const scaleY = HEIGHT / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };

        // Aiming orbit control by mouse coordinates
        this.canvas.addEventListener('mousemove', (e) => {
            this.mousePos = getCanvasMouse(e);

            if (this.playState === 'aiming' && this.isDraggingAim) {
                const dx = this.mousePos.x - this.cueBall.x;
                const dy = this.mousePos.y - this.cueBall.y;
                this.cueAngle = Math.atan2(dy, dx);
            } 
            else if (this.playState === 'placingCue' && this.isPlacingDrag) {
                // Update placement position clamped within cushion boundaries
                const r = this.cueBall.radius;
                let targetX = Math.max(FIELD.startX + r + 4, Math.min(FIELD.endX - r - 4, this.mousePos.x));
                let targetY = Math.max(FIELD.startY + r + 4, Math.min(FIELD.endY - r - 4, this.mousePos.y));

                // If practice or break shot, restrict cue placement behind headstring
                const isBreak = this.balls.filter(b => b.active && b.number !== 0).length === 15;
                if (isBreak) {
                    const headStringX = FIELD.startX + (FIELD.endX - FIELD.startX) * 0.25;
                    targetX = Math.min(headStringX - r, targetX);
                }

                // Check overlap with other balls
                let overlap = false;
                for (const b of this.balls) {
                    if (b.number === 0 || !b.active) continue;
                    const dx = targetX - b.x;
                    const dy = targetY - b.y;
                    if (Math.sqrt(dx*dx + dy*dy) < (r + b.radius + 2)) {
                        overlap = true;
                        break;
                    }
                }

                if (!overlap) {
                    this.cueBall.x = targetX;
                    this.cueBall.y = targetY;
                }
            }
        });

        // Placing click control
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.playState === 'aiming') {
                this.isDraggingAim = true;
            }
            if (this.playState === 'placingCue') {
                const mouse = getCanvasMouse(e);
                const dx = mouse.x - this.cueBall.x;
                const dy = mouse.y - this.cueBall.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                // Allow drag start if close to cue ball
                if (dist < this.cueBall.radius + 15) {
                    this.isPlacingDrag = true;
                }
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isDraggingAim) {
                this.isDraggingAim = false;
            }
            if (this.playState === 'placingCue' && this.isPlacingDrag) {
                this.isPlacingDrag = false;
                // Lock placement, switch to aim
                this.playState = 'aiming';
                ui.showToast("Cue ball placed! Take aim.");
                this.startTurnTimer();
            }
        });

        // Dragging cue ball place alternative: clicking anywhere places it
        this.canvas.addEventListener('click', (e) => {
            if (this.playState === 'placingCue') {
                this.playState = 'aiming';
                ui.showToast("Cue ball placed! Take aim.");
                this.startTurnTimer();
            }
        });

        // Miniclip Power Meter dragging mechanics
        const powerTrack = document.getElementById('powerTrack'); // Needs tracker container
        const powerContainer = document.querySelector('.power-meter-container');
        
        const updatePowerDrag = (clientY) => {
            const rect = powerContainer.getBoundingClientRect();
            const top = rect.top + 40; // paddings
            const bottom = rect.bottom - 40;
            const height = bottom - top;
            
            const relativeY = clientY - top;
            // 0 at bottom, 1 at top
            let val = 1.0 - (relativeY / height);
            val = Math.max(0.0, Math.min(1.0, val));
            
            this.powerFraction = val;
            this.updatePowerMeterUI();
        };

        powerContainer.addEventListener('mousedown', (e) => {
            if (this.playState !== 'aiming') return;
            this.isDraggingPower = true;
            updatePowerDrag(e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDraggingPower) {
                updatePowerDrag(e.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isDraggingPower) {
                this.isDraggingPower = false;
                if (this.powerFraction > 0.05) {
                    this.fireCueBall();
                } else {
                    this.powerFraction = 0;
                    this.updatePowerMeterUI();
                }
            }
        });

        // Alternative: Spacebar to shoot if power is set manually
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.playState === 'aiming') {
                e.preventDefault();
                // Pull power fraction and shoot
                this.powerFraction = 0.5; // mid fallback
                this.fireCueBall();
            }
        });

        // Spin control crosshair pad adjustments
        const pad = document.getElementById('spinPad');
        const marker = document.getElementById('spinMarker');
        
        const updateSpin = (clientX, clientY) => {
            const rect = pad.getBoundingClientRect();
            const size = rect.width;
            const centerX = rect.left + size / 2;
            const centerY = rect.top + size / 2;

            const dx = clientX - centerX;
            const dy = clientY - centerY;
            
            // Normalized radius [-1.0, 1.0]
            const rMax = size / 2;
            let nx = dx / rMax;
            let ny = dy / rMax;

            // Clamping within circle boundary (r <= 1.0)
            const dist = Math.sqrt(nx*nx + ny*ny);
            if (dist > 1.0) {
                nx /= dist;
                ny /= dist;
            }

            this.spinState.x = nx;
            this.spinState.y = ny;

            // Position HTML marker
            marker.style.left = `${50 + nx * 50}%`;
            marker.style.top = `${50 + ny * 50}%`;

            // Text feedback
            const sideStr = nx > 0.1 ? 'Right English' : nx < -0.1 ? 'Left English' : '';
            const vertStr = ny > 0.1 ? 'Topspin/Follow' : ny < -0.1 ? 'Backspin/Draw' : '';
            
            if (!sideStr && !vertStr) {
                document.getElementById('spinFeedback').innerText = 'No spin';
            } else {
                document.getElementById('spinFeedback').innerText = `${vertStr} ${sideStr}`.trim();
            }
        };

        let isDraggingSpin = false;
        pad.addEventListener('mousedown', (e) => {
            isDraggingSpin = true;
            updateSpin(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e) => {
            if (isDraggingSpin) {
                updateSpin(e.clientX, e.clientY);
            }
        });
        window.addEventListener('mouseup', () => {
            isDraggingSpin = false;
        });

        // Reset spin button
        document.getElementById('btnResetSpin').addEventListener('click', () => {
            this.spinState = { x: 0, y: 0 };
            marker.style.left = '50%';
            marker.style.top = '50%';
            document.getElementById('spinFeedback').innerText = 'No spin';
        });
    }
}

// Instantiate and initiate on window load
window.addEventListener('load', () => {
    const game = new Game();
    game.init();
});


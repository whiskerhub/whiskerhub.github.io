/* ==========================================================
   WhiskerPet v2 – WhiskerHub piksel art kedisi
   - Kütüphane yok, sprite'lar kodla (piksel ızgarası) çizilir
   - Durumlar: idle | walking | sleeping | waking | playing | eating | reacting
   - Gece (koyu mod) kedi uyur, gündüz (açık mod) esneyip uyanır
   - Oyuncaklar: yumak, top, oyuncak fare  |  Yemek: mama, süt
   ========================================================== */
(() => {
    'use strict';

    const root = document.getElementById('whiskerpet');
    if (!root) return;

    const canvas    = document.getElementById('wpCanvas');
    const ctx       = canvas.getContext('2d');
    const feedBtn   = document.getElementById('wpFeedBtn');
    const milkBtn   = document.getElementById('wpMilkBtn');
    const toySrcs   = document.querySelectorAll('.wp-toy');
    const yarnIcon  = document.getElementById('wpYarnIcon');
    const ballIcon  = document.getElementById('wpBallIcon');
    const mouseIcon = document.getElementById('wpMouseIcon');
    const bowlIcon  = document.getElementById('wpBowlIcon');
    const milkIcon  = document.getElementById('wpMilkIcon');

    /* ---------------------------------------------------- yardımcılar */
    const rand  = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const rnd   = Math.round;

    function hash(n) {
        n = (n ^ 61) ^ (n >>> 16);
        n = n + (n << 3);
        n = n ^ (n >>> 4);
        n = Math.imul(n, 0x27d4eb2d);
        n = n ^ (n >>> 15);
        return n >>> 0;
    }

    /* ---------------------------------------------------- renkler */
    const C = {
        k: '#3b2f4f',   // dış çizgi
        b: '#f2b880',   // gövde
        d: '#d98f4e',   // çizgiler / uzak bacaklar
        w: '#fff4e6',   // beyaz (patiler, karın)
        p: '#ff9ec7',   // pembe (burun, kulak içi)
        e: '#2a2140',   // göz
        wh: '#6a5a8a',  // bıyık
        yarn: '#ff7eb6',
        yarnL: '#ffc7e0',
        ball: '#5bb8ff',
        mouse: '#b9b2c9',
        bowl: '#8fd3ff',
        bowlL: '#cfefff',
        milk: '#ffa9cf',
        milkL: '#ffd6e8',
        kib: '#a8643a',
        kibL: '#c98652',
        heart: '#ff6b9d',
        bang: '#ff5c8a'
    };

    const THEMES = {
        light: { ground: '#d8c7ff', line: '#a98cf0', dots: '#c3a9f6', tuft: '#9fdcb0', z: '#7a55d8', shadow: 0.18 },
        dark:  { ground: '#17122e', line: '#3d3166', dots: '#221a42', tuft: '#2e6b57', z: '#d8c7ff', shadow: 0.38 }
    };
    let isDark = false;
    let theme = THEMES.light;

    function readTheme() {
        isDark = document.body.classList.contains('dark-mode');
        theme = isDark ? THEMES.dark : THEMES.light;
    }

    /* ---------------------------------------------------- sprite çizici */
    function drawRows(g, rows, x, y, map) {
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                const col = map[rows[r][c]];
                if (!col) continue;
                g.fillStyle = col;
                g.fillRect(x + c, y + r, 1, 1);
            }
        }
    }

    const YARN   = ['..kkk..', '.kyyyk.', 'kyyyyyk', 'kyyyyyk', 'kyyyyyk', '.kyyyk.', '..kkk..'];
    const BALL   = ['..kkk..', '.kaaak.', 'kaaaaak', 'kaaaaak', 'kaaaaak', '.kaaak.', '..kkk..'];
    const MOUSE  = ['.........kk.', '..kkkkkkkppk', 'tkggggggggek', 'tkggggggggnk', '..kkkkkkkkkk'];
    const BOWL   = ['.kkkkkkkkkk.', 'kllllllllllk', 'kbbbbppbbbbk', '.kbbbbbbbbk.', '..kkkkkkkk..'];
    const HEART  = ['.kk.kk.', 'kppkppk', 'kpppppk', '.kpppk.', '..kpk..', '...k...'];
    const ZGLYPH = ['###', '..#', '.#.', '#..', '###'];

    // Yumak: dönüş açısına göre kayan açık renk iplik çizgileri
    function drawYarn(g, x, y, rot) {
        drawRows(g, YARN, x, y, { k: C.k, y: C.yarn });
        const cs = Math.cos(rot), sn = Math.sin(rot);
        g.fillStyle = C.yarnL;
        for (const s of [-1.6, 1.6]) {
            for (let t = -3; t <= 3; t += 0.5) {
                const px = rnd(3 - s * sn + t * cs);
                const py = rnd(3 + s * cs + t * sn);
                if (px >= 0 && px < 7 && py >= 0 && py < 7 && YARN[py][px] === 'y') {
                    g.fillRect(x + px, y + py, 1, 1);
                }
            }
        }
    }

    // Top: dönerken beyaz şerit de döner
    function drawBall(g, x, y, rot) {
        drawRows(g, BALL, x, y, { k: C.k, a: C.ball });
        const cs = Math.cos(rot), sn = Math.sin(rot);
        g.fillStyle = '#ffffff';
        for (let t = -3; t <= 3; t += 0.5) {
            const px = rnd(3 + t * cs);
            const py = rnd(3 + t * sn);
            if (px >= 0 && px < 7 && py >= 0 && py < 7 && BALL[py][px] === 'a') {
                g.fillRect(x + px, y + py, 1, 1);
            }
        }
    }

    // Oyuncak fare: sağa bakar, flip ile sola çevrilir, kuyruk kıpırdar
    function drawMouse(g, x, y, flip, wig) {
        g.save();
        g.translate(x + (flip ? 12 : 0), y);
        g.scale(flip ? -1 : 1, 1);
        drawRows(g, MOUSE, 0, 0, { k: C.k, g: C.mouse, p: C.p, e: C.e, t: C.p, n: C.p });
        g.fillStyle = C.p;
        g.fillRect(-1, 2 + (wig & 1), 1, 1);
        g.restore();
    }

    // Kap: kind 'food' (mama) veya 'milk' (süt); food 0..1
    function drawBowl(g, x, y, food, kind) {
        const milk = kind === 'milk';
        drawRows(g, BOWL, x, y, milk
            ? { k: C.k, l: C.milkL, b: C.milk, p: C.milkL }
            : { k: C.k, l: C.bowlL, b: C.bowl, p: C.p });
        const lvl = Math.ceil(food * 3 - 1e-6);
        if (milk) {
            g.fillStyle = '#ffffff';
            if (lvl >= 3) g.fillRect(x + 1, y + 1, 10, 2);
            else if (lvl === 2) g.fillRect(x + 1, y + 2, 10, 1);
            else if (lvl === 1) g.fillRect(x + 2, y + 3, 8, 1);
            return;
        }
        const kib = (dx, dy) => {
            g.fillStyle = ((dx + dy) & 1) ? C.kib : C.kibL;
            g.fillRect(x + dx, y + dy, 1, 1);
        };
        if (lvl === 1) for (let i = 4; i <= 7; i++) kib(i, -1);
        if (lvl === 2) for (let i = 3; i <= 8; i++) kib(i, -1);
        if (lvl >= 3) {
            for (let i = 2; i <= 9; i++) kib(i, -1);
            for (let i = 4; i <= 7; i++) kib(i, -2);
        }
    }

    function drawToyIcon(g, kind) {
        if (kind === 'ball') drawBall(g, 0, 0, 0.6);
        else if (kind === 'mouse') drawMouse(g, 0, 1, false, 0);
        else drawYarn(g, 0, 0, 0.6);
    }

    // Araç çubuğu ikonları
    if (yarnIcon)  drawToyIcon(yarnIcon.getContext('2d'), 'yarn');
    if (ballIcon)  drawToyIcon(ballIcon.getContext('2d'), 'ball');
    if (mouseIcon) drawToyIcon(mouseIcon.getContext('2d'), 'mouse');
    if (bowlIcon)  drawBowl(bowlIcon.getContext('2d'), 0, 2, 1, 'food');
    if (milkIcon)  drawBowl(milkIcon.getContext('2d'), 0, 2, 1, 'milk');

    /* ---------------------------------------------------- sahne boyutları */
    let S = 4, W = 0, H = 0, GY = 0;
    let MIN = 14, MAX = 100;
    const bg = document.createElement('canvas');
    let stars = [];
    let clouds = [];
    let butterflies = [];
    let fireflies = [];
    let initialized = false;

    function resize() {
        const w = root.clientWidth, h = root.clientHeight;
        if (!w || !h) return;
        S = w < 600 ? 3 : 4;
        W = Math.ceil(w / S);
        H = Math.ceil(h / S);
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = (W * S) + 'px';
        canvas.style.height = (H * S) + 'px';
        GY = H - 7;                 // zemin çizgisinin satırı
        MIN = 14;                   // kedinin sol/sağ sınırı (kuyruk + bıyık payı)
        MAX = Math.max(MIN, W - 14);

        if (!initialized) {
            cat.x = W / 2;
            initialized = true;
            clouds = [
                { x: W * 0.15, y: 5,  v: 2.5 },
                { x: W * 0.55, y: 12, v: 1.8 },
                { x: W * 0.85, y: 4,  v: 3.2 }
            ];
        }

        // Pencere değişince her şeyi yeni sınırlara çek
        cat.x = clamp(cat.x, MIN, MAX);
        cat.target = clamp(cat.target, MIN, MAX);
        if (toy) toy.x = clamp(toy.x, 4, W - 4);
        if (bowl) bowl.x = clamp(bowl.x, 26, Math.max(26, W - 26));
        buildBackground();
    }

    function buildBackground() {
        bg.width = W;
        bg.height = H;
        const g = bg.getContext('2d');
        g.clearRect(0, 0, W, H);

        // zemin
        g.fillStyle = theme.ground;
        g.fillRect(0, GY, W, H - GY);
        g.fillStyle = theme.line;
        g.fillRect(0, GY, W, 1);

        // zemin dokusu
        g.fillStyle = theme.dots;
        const gh = H - GY - 2;
        for (let x = 0; x < W; x++) {
            const r = hash(x + 17);
            if (r % 6 === 0 && gh > 0) g.fillRect(x, GY + 2 + ((r >>> 4) % gh), 1, 1);
        }

        // çimen tutamları
        g.fillStyle = theme.tuft;
        for (let x = 2; x < W - 3; x++) {
            if (hash(x * 3 + 5) % 19 === 0) {
                g.fillRect(x, GY - 2, 1, 2);
                g.fillRect(x + 2, GY - 3, 1, 3);
                g.fillRect(x + 1, GY - 1, 1, 1);
            }
        }

        // gökyüzü süsleri
        const skyH = GY - 20;
        stars = [];
        if (isDark) {
            for (let i = 0; i < Math.max(8, W / 10); i++) {
                const x = hash(i * 7 + 1) % W;
                const y = 2 + (hash(i * 13 + 3) % Math.max(1, skyH));
                stars.push({ x, y, tw: i % 4 === 0, i });
                if (i % 4 !== 0) {
                    g.fillStyle = (i % 3 === 0) ? '#ffffff' : '#bfb3e0';
                    g.fillRect(x, y, 1, 1);
                }
            }
            // hilal
            const mx = rnd(W * 0.38), my = 12;
            g.fillStyle = '#fff2c2';
            for (let dy = -5; dy <= 5; dy++)
                for (let dx = -5; dx <= 5; dx++)
                    if (dx * dx + dy * dy <= 25) g.fillRect(mx + dx, my + dy, 1, 1);
            for (let dy = -5; dy <= 5; dy++)
                for (let dx = -5; dx <= 5; dx++)
                    if ((dx - 3) * (dx - 3) + (dy + 2) * (dy + 2) <= 20) g.clearRect(mx + dx, my + dy, 1, 1);
        } else {
            // güneş
            const sx = rnd(W * 0.38), sy = 12;
            for (let dy = -4; dy <= 4; dy++)
                for (let dx = -4; dx <= 4; dx++) {
                    const d = dx * dx + dy * dy;
                    if (d <= 16) { g.fillStyle = d > 9 ? '#ffd27a' : '#ffe9a8'; g.fillRect(sx + dx, sy + dy, 1, 1); }
                }
        }

        // canlı süsler: gündüz kelebekler, gece ateşböcekleri
        butterflies = [];
        for (let i = 0; i < 2; i++) {
            butterflies.push({
                x0: hash(i * 31 + 7) % Math.max(1, W),
                y0: 4 + (hash(i * 17 + 2) % 8),
                v: 4 + (i * 2),
                ph: i * 2.1,
                col: i ? '#ffd27a' : '#ff9ec7'
            });
        }
        fireflies = [];
        for (let i = 0; i < 8; i++) {
            fireflies.push({
                x0: hash(i * 23 + 9) % Math.max(1, W),
                y0: 4 + (hash(i * 11 + 5) % Math.max(1, GY - 8)),
                ph: i * 1.7
            });
        }
    }

    /* ---------------------------------------------------- kedi durum makinesi */
    const cat = {
        x: 100, dir: 1,
        state: 'idle', t: 0, dur: 2, anim: 0, animRate: 8,
        target: 100, speed: 16,
        phase: '', phaseT: 0,
        blink: 0, nextBlink: 3,
        // playing
        playTime: 0, playDur: 10, swatT: -1, swatHit: false, cool: 0, moving: false,
        // eating
        eatDir: 1, eatDur: 5,
        // sleeping
        zTimer: 0, zCount: 0, nightSleep: false
    };

    // Hangi durumdan hangisine geçilebilir (çakışan davranışları engeller)
    const TRANSITIONS = {
        idle:     ['idle', 'walking', 'sleeping', 'playing', 'eating', 'reacting'],
        walking:  ['idle', 'walking', 'playing', 'eating', 'reacting'],
        sleeping: ['idle', 'waking', 'playing', 'eating', 'reacting'],
        waking:   ['idle', 'playing', 'eating'],
        reacting: ['idle', 'playing', 'eating'],
        playing:  ['idle', 'eating'],          // mama, oyunu bölebilir
        eating:   ['idle']                     // yemek bitmeden başka şeye geçmez
    };

    let pending = null; // meşgulken gelen istek: 'play' | 'eat'

    function setState(next, data) {
        if (!TRANSITIONS[cat.state].includes(next)) return false;
        cat.state = next;
        cat.t = 0;
        cat.anim = 0;
        cat.phase = '';
        cat.phaseT = 0;
        ENTER[next](data || {});
        return true;
    }

    // Oyun/yemek/tepki/uyanma bitince: gece ise uyku, bekleyen istek varsa ona, yoksa dinlenmeye
    function afterBusy() {
        if (isDark) {
            if (cat.state === 'playing' && toy) pending = 'play';   // sabah devam eder
            setState('idle', { dur: 0.5 });
            setState('sleeping');
            return;
        }
        const wantEat = pending === 'eat' && bowl && bowl.food > 0;
        const wantPlay = pending === 'play' && toy;
        pending = null;
        setState('idle', { dur: rand(1.2, 2.5) });
        if (wantEat) setState('eating');
        else if (wantPlay) setState('playing');
    }

    const ENTER = {
        idle(d) { cat.dur = d.dur || rand(2, 5); },

        walking() {
            const left = cat.x - MIN, right = MAX - cat.x;
            let dir = Math.random() < 0.5 ? 1 : -1;
            if (dir === 1 && right < 20) dir = -1;
            if (dir === -1 && left < 20) dir = 1;
            const room = dir === 1 ? right : left;
            const dist = Math.min(room, rand(25, 90));
            cat.target = clamp(cat.x + dir * dist, MIN, MAX);
            cat.speed = Math.random() < 0.2 ? 28 : rand(14, 19);
        },

        sleeping() {
            cat.nightSleep = isDark;
            cat.dur = isDark ? 1e9 : rand(9, 18);   // gece sabaha kadar uyur
            cat.zTimer = 0.6;
            cat.phase = 'settle';                   // önce gözler kapanır, sonra yatar
            cat.phaseT = 0;
        },

        waking() { cat.dur = 2.4; },

        reacting(d) {
            cat.dur = 1.1;
            if (d.startle) parts.push({ k: 'bang', x: cat.x + cat.dir * 2, y: GY - 24, vx: 0, vy: -4, t: 0, life: 0.9 });
        },

        playing() {
            cat.playTime = 0;
            cat.playDur = rand(9, 13);
            cat.swatT = -1;
            cat.cool = 0.2;
            cat.moving = false;
        },

        eating() {
            if (!bowl) return;
            cat.eatDir = bowl.x >= cat.x ? 1 : -1;
            cat.target = clamp(bowl.x - cat.eatDir * 10, MIN, MAX);
            cat.eatDur = rand(4.5, 6.5);
            cat.phase = 'approach';
        }
    };

    // Hedefe doğru yürü; vardıysa true döner
    function moveToward(tx, speed, dt) {
        const d = tx - cat.x;
        cat.animRate = Math.min(12, speed * 0.55);
        if (Math.abs(d) <= speed * dt) { cat.x = tx; return true; }
        cat.dir = d > 0 ? 1 : -1;
        cat.x += cat.dir * speed * dt;
        return false;
    }

    function nextFromIdle() {
        if (isDark) { setState('sleeping'); return; }
        const r = Math.random();
        if (r < 0.55) setState('walking');
        else if (r < 0.78) setState('sleeping');
        else setState('idle');
    }

    const REACH = 15, STAND = 12;

    const UPDATE = {
        idle() {
            if (isDark || cat.t >= cat.dur) nextFromIdle();
        },

        walking(dt) {
            if (moveToward(cat.target, cat.speed, dt)) {
                if (!isDark && Math.random() < 0.25) setState('walking');
                else setState('idle');
            } else if (cat.t > 1.5 && Math.random() < dt * 0.12) {
                setState('idle', { dur: rand(1.5, 3) });   // yürürken rastgele durma
            }
        },

        sleeping(dt) {
            cat.phaseT += dt;
            if (cat.phase === 'settle') {
                if (cat.phaseT > 1.3) cat.phase = '';
                return;
            }
            cat.zTimer -= dt;
            if (cat.zTimer <= 0) {
                cat.zTimer = 1.3;
                const big = (cat.zCount++ % 2) + 1;
                parts.push({ k: 'z', x: cat.x + cat.dir * 9, y: GY - 14, vx: 0, vy: -6, t: 0, life: 2.6, s: big, bx: cat.x + cat.dir * 9 });
            }
            if (cat.nightSleep) {
                if (!isDark) setState('waking');                 // gündüz oldu: uyan
            } else if (cat.t >= cat.dur) {
                setState('idle', { dur: 1.5 });
            }
        },

        waking() {
            if (cat.t >= cat.dur) {
                spawnHeart(cat.x + cat.dir * 2, GY - 22);
                afterBusy();
            }
        },

        reacting() {
            if (cat.t >= cat.dur) afterBusy();
        },

        playing(dt) {
            const y = toy;
            if (!y) { afterBusy(); return; }            // oyuncak alındı
            if (isDark && cat.swatT < 0) { afterBusy(); return; }   // gece oldu: yatağa
            cat.playTime += dt;
            cat.cool -= dt;
            cat.moving = false;

            if (cat.swatT >= 0) {                       // pati atma animasyonu
                cat.swatT += dt;
                if (!cat.swatHit && cat.swatT >= 0.2) {
                    cat.swatHit = true;
                    const k = KIND[y.kind];
                    y.vx = cat.dir * rand(k.hx[0], k.hx[1]);
                    y.vy = rand(k.hy[0], k.hy[1]);
                    if (Math.random() < 0.2) y.vx *= -0.6;
                }
                if (cat.swatT >= 0.45) cat.swatT = -1;
                return;
            }

            const dx = y.x - cat.x, adx = Math.abs(dx);
            if (adx > REACH) {                          // oyuncağın peşinden git
                const dir = dx > 0 ? 1 : -1;
                const sp = Math.abs(y.vx) > 15 ? 34 : 24;
                moveToward(clamp(y.x - dir * STAND, MIN, MAX), sp, dt);
                cat.moving = true;
            } else {
                if (adx > 2) cat.dir = dx > 0 ? 1 : -1;
                if (cat.cool <= 0 && y.h < 8) { cat.swatT = 0; cat.swatHit = false; cat.cool = rand(0.5, 1.0); }
            }

            if ((cat.playTime > cat.playDur && Math.abs(y.vx) < 3 && y.h < 1) || cat.playTime > cat.playDur + 8) afterBusy();
        },

        eating(dt) {
            if (!bowl) { afterBusy(); return; }         // kap kaldırıldı
            if (cat.phase === 'approach') {
                if (moveToward(cat.target, 26, dt)) {
                    cat.phase = 'eat';
                    cat.phaseT = 0;
                    cat.dir = cat.eatDir;
                }
            } else if (cat.phase === 'eat') {
                cat.phaseT += dt;
                bowl.food = Math.max(0, 1 - cat.phaseT / cat.eatDur);
                if (Math.random() < dt * 4) {
                    parts.push({
                        k: 'crumb', x: cat.x + cat.dir * 14, y: GY - 5,
                        vx: cat.dir * rand(2, 9), vy: -rand(8, 18), t: 0, life: 2,
                        c: bowl.kind === 'milk' ? '#ffffff' : C.kib
                    });
                }
                if (cat.phaseT >= cat.eatDur) {
                    bowl.food = 0;
                    cat.phase = 'done';
                    cat.phaseT = 0;
                    spawnHeart(cat.x + cat.dir * 2, GY - 22);
                }
            } else {
                cat.phaseT += dt;
                if (cat.phaseT > 1.3) afterBusy();
            }
        }
    };

    /* ---------------------------------------------------- oyuncak & kap */
    // Oyuncak türlerinin fiziği: zıplama, sürtünme, kedinin vuruş gücü
    const KIND = {
        yarn:  { rest: 0.45, min: 12, air: 0.3, gnd: 1.6, hx: [35, 70],  hy: [14, 28] },
        ball:  { rest: 0.78, min: 8,  air: 0.1, gnd: 0.55, hx: [50, 100], hy: [24, 48] },
        mouse: { rest: 0.2,  min: 12, air: 0.3, gnd: 1.2, hx: [30, 55],  hy: [10, 20] }
    };

    let toy  = null;   // { kind, x, h, vx, vy, rot, flip, wt, fc }
    let bowl = null;   // { x, h, vy, food, emptyT, kind }

    function dropToy(kind, lx, ly) {
        toy = {
            kind, x: clamp(lx, 6, W - 6), h: Math.max(0, GY - ly - 3.5),
            vx: 0, vy: 0, rot: 0, flip: false, wt: 0.5, fc: 0
        };
        if (isDark) { pending = 'play'; return; }         // kedi uyuyor, sabah oynar
        if (cat.state === 'playing') cat.playTime = 0;
        else if (!setState('playing')) pending = 'play';
    }

    function updateToy(dt) {
        const y = toy;
        if (!y) return;
        const k = KIND[y.kind];

        if (y.h > 0 || y.vy !== 0) {
            y.vy -= 140 * dt;
            y.h += y.vy * dt;
            if (y.h <= 0) {
                y.h = 0;
                y.vy = y.vy < -k.min ? -y.vy * k.rest : 0;
            }
        }

        // fare kendi kendine kaçışır / dolanır
        if (y.kind === 'mouse' && y.h === 0 && !isDark && cat.state !== 'sleeping') {
            y.wt -= dt;
            y.fc -= dt;
            const dx = y.x - cat.x;
            if (cat.state === 'playing' && Math.abs(dx) < 26 && y.fc <= 0 && cat.swatT < 0) {
                y.vx = (dx >= 0 ? 1 : -1) * rand(24, 36);
                y.fc = rand(0.5, 0.9);
            } else if (y.wt <= 0) {
                y.wt = rand(0.8, 2.2);
                y.vx = (Math.random() < 0.5 ? -1 : 1) * rand(12, 24);
            }
        }

        y.x += y.vx * dt;
        if (y.x < 4)     { y.x = 4;     y.vx =  Math.abs(y.vx) * 0.6; }
        if (y.x > W - 4) { y.x = W - 4; y.vx = -Math.abs(y.vx) * 0.6; }
        y.vx *= Math.exp(-(y.h > 0 ? k.air : k.gnd) * dt);
        if (y.h === 0 && Math.abs(y.vx) < 1.5) y.vx = 0;
        y.rot += y.vx * dt / 3;
        if (y.kind === 'mouse' && Math.abs(y.vx) > 2) y.flip = y.vx < 0;
    }

    function feed(kind) {
        if (cat.state === 'eating') return;
        if (!bowl) {
            let x = rand(26, Math.max(27, W - 26));
            for (let i = 0; i < 10 && Math.abs(x - cat.x) < 40; i++) x = rand(26, Math.max(27, W - 26));
            bowl = { x, h: 36, vy: 0, food: 1, emptyT: 0, kind };
        } else if (bowl.food <= 0 || bowl.kind !== kind) {
            bowl.kind = kind;
            bowl.food = 1;
            bowl.emptyT = 0;
        }
        if (isDark) { pending = 'eat'; return; }          // kedi uyuyor, sabah yer
        if (!setState('eating')) pending = 'eat';
    }

    function updateBowl(dt) {
        if (!bowl) return;
        if (bowl.h > 0 || bowl.vy !== 0) {
            bowl.vy -= 160 * dt;
            bowl.h += bowl.vy * dt;
            if (bowl.h <= 0) {
                bowl.h = 0;
                bowl.vy = bowl.vy < -15 ? -bowl.vy * 0.3 : 0;
            }
        }
        // boşalınca bir süre kalır, yanıp söner ve kendiliğinden kaybolur
        if (bowl.food <= 0 && !(cat.state === 'eating' && cat.phase === 'eat')) {
            bowl.emptyT += dt;
            if (bowl.emptyT > 5) {
                puff(bowl.x, GY - 3);
                bowl = null;
            }
        }
    }

    function removeBowl() {
        if (!bowl) return;
        puff(bowl.x, GY - 3);
        bowl = null;
        if (pending === 'eat') pending = null;
    }

    /* ---------------------------------------------------- parçacıklar */
    const parts = [];
    function spawnHeart(x, y) { parts.push({ k: 'heart', x, y, vx: rand(-4, 4), vy: -14, t: 0, life: 1.2 }); }
    function puff(x, y) {
        for (let i = 0; i < 5; i++) parts.push({ k: 'puff', x, y, vx: rand(-14, 14), vy: -rand(2, 12), t: 0, life: 0.5 });
    }

    function updateParticles(dt) {
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.t += dt;
            p.y += p.vy * dt;
            if (p.k === 'z') p.x = p.bx + Math.sin(p.t * 3) * 3;
            else p.x += p.vx * dt;
            if (p.k === 'crumb') {
                p.vy += 70 * dt;
                if (p.y >= GY) { parts.splice(i, 1); continue; }
            }
            if (p.t >= p.life) parts.splice(i, 1);
        }
    }

    /* ---------------------------------------------------- sprite pozları */
    function head(hx, hy, eyes, mouth) {
        const sh = [[hx, hy, 8, 7, C.b], [hx, hy - 2, 2, 2, C.b], [hx + 6, hy - 2, 2, 2, C.b]];
        const dt = [
            [hx + 1, hy - 1, 1, 1, C.p], [hx + 6, hy - 1, 1, 1, C.p],
            [hx + 3, hy, 1, 2, C.d], [hx + 5, hy, 1, 2, C.d]
        ];
        if (eyes === 'open') {
            dt.push([hx + 3, hy + 2, 1, 2, C.e], [hx + 6, hy + 2, 1, 2, C.e]);
        } else if (eyes === 'closed') {
            dt.push([hx + 3, hy + 3, 2, 1, C.e], [hx + 6, hy + 3, 2, 1, C.e]);
        } else { // mutlu ^ ^
            dt.push([hx + 1, hy + 3, 1, 1, C.e], [hx + 2, hy + 2, 1, 1, C.e], [hx + 3, hy + 3, 1, 1, C.e],
                    [hx + 5, hy + 3, 1, 1, C.e], [hx + 6, hy + 2, 1, 1, C.e], [hx + 7, hy + 3, 1, 1, C.e]);
        }
        dt.push([hx + 5, hy + 4, 3, 2, C.w], [hx + 7, hy + 4, 1, 1, C.p]);
        if (mouth) dt.push([hx + 5, hy + 6, 3, 1, C.e]);
        dt.push([hx + 8, hy + 4, 2, 1, C.wh], [hx + 8, hy + 6, 2, 1, C.wh]); // bıyıklar
        return { sh, dt };
    }

    // bacak: x, faz ofseti, uzak mı
    const LEGS = [
        { x: -7, o: 0.5, far: 1 }, { x: -4, o: 0, far: 0 },
        { x: 1,  o: 0,   far: 1 }, { x: 3,  o: 0.5, far: 0 }
    ];

    function legs(sh, dt, f, mode, skip) {
        for (let i = 0; i < 4; i++) {
            if (i === skip) continue;
            const L = LEGS[i];
            let dx = 0, lift = 0;
            if (mode === 'walk') {
                const p = ((f / 4) + L.o) % 1;
                if (p < 0.5) dx = rnd(1 - 4 * p);
                else { dx = rnd(-1 + 4 * (p - 0.5)); lift = p < 0.7 ? 1 : 2; }
            } else if (mode === 'air') {
                lift = 1;
            }
            const h = Math.max(1, 3 - lift);
            sh.push([L.x + dx, -3, 2, h, L.far ? C.d : C.b]);
            dt.push([L.x + dx, -3 + h - 1, 2, 1, C.w]);
        }
    }

    function body(sh, dt) {
        sh.push([-8, -9, 13, 6, C.b]);
        dt.push([-7, -4, 11, 1, C.w], [-6, -9, 1, 2, C.d], [-3, -9, 1, 2, C.d], [0, -9, 1, 2, C.d]);
    }

    function tailUp(sh, dt, tw) {
        sh.push([-11 + tw, -13, 2, 6, C.b], [-10, -8, 3, 2, C.b]);
        dt.push([-11 + tw, -13, 2, 2, C.d]);
    }

    function merge(sh, dt, h) { sh.push(...h.sh); dt.push(...h.dt); }

    function poseWalk(f, mode, eyes, tw) {
        const sh = [], dt = [];
        tailUp(sh, dt, tw);
        legs(sh, dt, f, mode);
        body(sh, dt);
        merge(sh, dt, head(3, -13, eyes, false));
        return { sh, dt };
    }

    function poseSit(sw, eyes) {
        const sh = [], dt = [];
        sh.push([-12, -2, 5, 2, C.b], [-13, -5 - sw, 2, 4 + sw, C.b]);       // kuyruk
        dt.push([-13, -5 - sw, 2, 1, C.d]);
        sh.push([-8, -4, 4, 4, C.b], [-6, -8, 9, 8, C.b], [1, -5, 2, 5, C.b]); // kalça, gövde, ön bacak
        dt.push([-5, -8, 1, 2, C.d], [-2, -8, 1, 2, C.d], [-7, -4, 1, 2, C.d], [1, -1, 2, 1, C.w], [2, -7, 1, 3, C.w]);
        merge(sh, dt, head(-1, -14, eyes, false));
        return { sh, dt };
    }

    function poseSleep(br) {
        const sh = [], dt = [];
        sh.push([-11, -4, 3, 4, C.b], [-9, -6, 18, 6, C.b], [-7, -7, 14, 1, C.b]);
        if (br) sh.push([-5, -8, 10, 1, C.b]);
        dt.push([-6, -7, 1, 2, C.d], [-2, -7, 1, 2, C.d], [2, -7, 1, 2, C.d]);
        merge(sh, dt, head(4, -9, 'closed', false));
        sh.push([8, -2, 5, 2, C.w]);                                          // patiler
        return { sh, dt };
    }

    // Esneme: arka kalkık, ön patiler ileri uzanmış, ağız açık
    function poseStretch(yawn) {
        const sh = [], dt = [];
        tailUp(sh, dt, 0);
        sh.push([-7, -3, 2, 3, C.d], [-4, -3, 2, 3, C.b]);                    // arka bacaklar
        dt.push([-7, -1, 2, 1, C.w], [-4, -1, 2, 1, C.w]);
        sh.push([-8, -10, 7, 7, C.b]);                                        // yukarıdaki arka gövde
        sh.push([-1, -7, 6, 4, C.b]);                                         // alçalan ön gövde
        sh.push([2, -3, 10, 2, C.b]);                                         // uzanan ön patiler
        dt.push([10, -3, 2, 2, C.w], [-6, -10, 1, 2, C.d], [-3, -10, 1, 2, C.d]);
        merge(sh, dt, head(5, -10, 'closed', yawn));
        return { sh, dt };
    }

    function poseEat(hy, mouth, tw) {
        const sh = [], dt = [];
        tailUp(sh, dt, tw);
        legs(sh, dt, 0, 'stand');
        body(sh, dt);
        sh.push([4, -9, 4, 6, C.b]);                                          // boyun
        merge(sh, dt, head(6, hy, 'happy', mouth));
        return { sh, dt };
    }

    function poseSwat(t, tw) {
        const sh = [], dt = [];
        tailUp(sh, dt, tw);
        legs(sh, dt, 0, 'stand', 3);
        body(sh, dt);
        if (t >= 0.18 && t < 0.34) {          // vuruş: pati ileri uzanır
            sh.push([4, -6, 7, 2, C.b]);
            dt.push([9, -6, 2, 2, C.w]);
        } else {                               // hazırlık / toparlanma: pati havada
            sh.push([3, -7, 2, 4, C.b]);
            dt.push([3, -7, 2, 1, C.w]);
        }
        merge(sh, dt, head(3, -12, 'open', false));
        return { sh, dt };
    }

    function currentPose() {
        const eyes = cat.blink > 0 ? 'closed' : 'open';
        const f = Math.floor(cat.anim * cat.animRate) & 3;
        switch (cat.state) {
            case 'walking':
                return poseWalk(f, 'walk', eyes, Math.floor(cat.anim * 3) & 1);
            case 'idle':
                return poseSit(Math.floor(cat.anim * 1.3) & 1, eyes);
            case 'sleeping':
                if (cat.phase === 'settle') return poseSit(0, 'closed');
                return poseSleep(Math.sin(cat.anim * 2) > 0 ? 1 : 0);
            case 'waking':
                if (cat.t < 0.6) return poseSit(0, 'closed');
                if (cat.t < 1.9) return poseStretch(cat.t > 0.8 && cat.t < 1.7);
                return poseSit(Math.floor(cat.anim * 2) & 1, eyes);
            case 'reacting':
                return poseWalk(0, 'air', 'happy', Math.floor(cat.anim * 8) & 1);
            case 'playing':
                if (cat.swatT >= 0) return poseSwat(cat.swatT, Math.floor(cat.anim * 10) & 1);
                if (cat.moving) return poseWalk(f, 'walk', eyes, Math.floor(cat.anim * 8) & 1);
                return poseWalk(0, 'stand', eyes, Math.floor(cat.anim * 10) & 1);
            case 'eating':
                if (cat.phase === 'eat') {
                    const b = Math.floor(cat.phaseT * 5) & 1;
                    return poseEat(-10 + b * 2, b === 1, Math.floor(cat.anim * 4) & 1);
                }
                if (cat.phase === 'done') return poseSit(Math.floor(cat.anim * 2) & 1, 'happy');
                return poseWalk(f, 'walk', eyes, Math.floor(cat.anim * 8) & 1);
        }
        return poseSit(0, eyes);
    }

    /* ---------------------------------------------------- çizim */
    function drawCat() {
        const p = currentPose();
        const lift = cat.state === 'reacting' ? rnd(Math.abs(Math.sin(cat.t * 5.4)) * 7) : 0;
        const cx = rnd(cat.x);

        // gölge
        ctx.globalAlpha = theme.shadow;
        ctx.fillStyle = '#000';
        const sw = Math.max(6, 10 - lift);
        ctx.fillRect(cx - sw, GY + 1, sw * 2, 1);
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(cx, GY - lift);
        ctx.scale(cat.dir, 1);
        ctx.fillStyle = C.k;
        for (const [x, y, w, h] of p.sh) ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        for (const [x, y, w, h, c] of p.sh) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
        for (const [x, y, w, h, c] of p.dt) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
        ctx.restore();
    }

    function drawParticles() {
        for (const p of parts) {
            const k = p.t / p.life;
            ctx.globalAlpha = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
            const x = rnd(p.x), y = rnd(p.y);
            if (p.k === 'heart') {
                drawRows(ctx, HEART, x - 3, y, { k: C.k, p: C.heart });
            } else if (p.k === 'z') {
                ctx.fillStyle = theme.z;
                for (let r = 0; r < 5; r++)
                    for (let c = 0; c < 3; c++)
                        if (ZGLYPH[r][c] === '#') ctx.fillRect(x + c * p.s, y + r * p.s, p.s, p.s);
            } else if (p.k === 'crumb') {
                ctx.fillStyle = p.c || C.kib;
                ctx.fillRect(x, y, 1, 1);
            } else if (p.k === 'puff') {
                ctx.fillStyle = isDark ? '#cfc4ee' : '#ffffff';
                const s = 1 + Math.floor(k * 2);
                ctx.fillRect(x, y, s, s);
            } else if (p.k === 'bang') {
                ctx.fillStyle = C.bang;
                ctx.fillRect(x, y, 2, 4);
                ctx.fillRect(x, y + 5, 2, 2);
            }
        }
        ctx.globalAlpha = 1;
    }

    function drawCloud(x, y) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x + 3, y, 3, 1);
        ctx.fillRect(x + 2, y + 1, 6, 1);
        ctx.fillRect(x, y + 2, 11, 1);
        ctx.fillRect(x + 1, y + 3, 9, 1);
    }

    function drawButterfly(b, time) {
        const px = rnd(((b.x0 + time * b.v) % (W + 12)) - 6);
        const py = rnd(b.y0 + Math.sin(time * 2 + b.ph) * 4);
        const up = (Math.floor(time * 6 + b.ph) & 1) === 0;
        ctx.fillStyle = b.col;
        if (up) {
            ctx.fillRect(px - 2, py - 1, 2, 1);
            ctx.fillRect(px + 1, py - 1, 2, 1);
            ctx.fillRect(px - 1, py, 1, 1);
            ctx.fillRect(px + 1, py, 1, 1);
        } else {
            ctx.fillRect(px - 2, py, 2, 1);
            ctx.fillRect(px + 1, py, 2, 1);
        }
        ctx.fillStyle = C.k;
        ctx.fillRect(px, py, 1, 1);
    }

    function drawFirefly(f, time) {
        const px = rnd(f.x0 + Math.sin(time * 0.4 + f.ph) * 12);
        const py = rnd(f.y0 + Math.cos(time * 0.3 + f.ph * 2) * 5);
        ctx.globalAlpha = 0.25 + 0.75 * Math.max(0, Math.sin(time * 1.6 + f.ph));
        ctx.fillStyle = '#e8ff8a';
        ctx.fillRect(px, py, 1, 1);
        ctx.globalAlpha = ctx.globalAlpha * 0.35;
        ctx.fillRect(px - 1, py, 3, 1);
        ctx.fillRect(px, py - 1, 1, 3);
        ctx.globalAlpha = 1;
    }

    function render(time) {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(bg, 0, 0);

        if (isDark) {
            for (const s of stars) {
                if (!s.tw) continue;
                ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 2 + s.i));
                ctx.fillStyle = '#fff';
                ctx.fillRect(s.x, s.y, 1, 1);
            }
            ctx.globalAlpha = 1;
            for (const f of fireflies) drawFirefly(f, time);
        } else {
            for (const c of clouds) drawCloud(rnd(c.x), c.y);
            for (const b of butterflies) drawButterfly(b, time);
        }

        if (toy) {
            if (toy.kind === 'ball')       drawBall(ctx, rnd(toy.x) - 3, rnd(GY - toy.h - 7), toy.rot);
            else if (toy.kind === 'mouse') drawMouse(ctx, rnd(toy.x) - 6, rnd(GY - toy.h - 5), toy.flip, Math.floor(time * 8));
            else                           drawYarn(ctx, rnd(toy.x) - 3, rnd(GY - toy.h - 7), toy.rot);
        }

        drawCat();

        if (bowl) {
            let a = 1;
            if (bowl.food <= 0 && bowl.emptyT > 4) a = (Math.floor(bowl.emptyT * 8) & 1) ? 0.3 : 1;
            ctx.globalAlpha = a;
            drawBowl(ctx, rnd(bowl.x) - 6, rnd(GY - 5 - bowl.h), bowl.food, bowl.kind);
            ctx.globalAlpha = 1;
        }

        drawParticles();
    }

    /* ---------------------------------------------------- ana döngü */
    function update(dt) {
        cat.t += dt;
        cat.anim += dt;
        cat.nextBlink -= dt;
        if (cat.nextBlink <= 0) { cat.blink = 0.14; cat.nextBlink = rand(2.5, 6); }
        if (cat.blink > 0) cat.blink -= dt;

        updateToy(dt);
        updateBowl(dt);
        updateParticles(dt);
        UPDATE[cat.state](dt);

        // Sert sınır: kedi hiçbir koşulda şeridin dışına çıkamaz
        cat.x = clamp(cat.x, MIN, MAX);

        for (const c of clouds) {
            c.x += c.v * dt;
            if (c.x > W + 12) c.x = -14;
        }
    }

    let last = 0, inView = true;
    function frame(ts) {
        requestAnimationFrame(frame);
        if (!inView || document.hidden || !W) { last = 0; return; }
        if (!last) last = ts;
        const dt = Math.min((ts - last) / 1000, 0.05);
        last = ts;
        update(dt);
        render(ts / 1000);
    }

    /* ---------------------------------------------------- etkileşim */
    function toLogical(e) {
        const r = canvas.getBoundingClientRect();
        const k = canvas.width / r.width;
        return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
    }

    const hitToy  = p => toy && Math.abs(p.x - toy.x) <= 7 && p.y >= GY - toy.h - 12 && p.y <= GY - toy.h + 2;
    const hitBowl = p => bowl && Math.abs(p.x - bowl.x) <= 8 && p.y >= GY - 9 - bowl.h && p.y <= GY + 2;
    const hitCat  = p => Math.abs(p.x - cat.x) <= 14 && p.y >= GY - 19 && p.y <= GY + 3;

    function poke() {
        spawnHeart(cat.x + cat.dir * 2, GY - 22);
        if (isDark && cat.state === 'sleeping') { cat.zTimer = 0; return; }   // gece uyandırılmaz
        if (cat.state === 'playing' || cat.state === 'eating' || cat.state === 'waking') return;
        setState('reacting', { startle: cat.state === 'sleeping' });
    }

    // --- oyuncak sürükleme (araç çubuğundan veya sahnedeki oyuncaktan)
    let drag = null;

    function beginDrag(e, kind, fromSource) {
        const dims = kind === 'mouse' ? [12, 7] : [7, 7];
        const g = document.createElement('canvas');
        g.width = dims[0]; g.height = dims[1];
        g.className = 'wp-ghost';
        g.style.width = (dims[0] * S) + 'px';
        g.style.height = (dims[1] * S) + 'px';
        drawToyIcon(g.getContext('2d'), kind);
        document.body.appendChild(g);
        drag = { id: e.pointerId, g, kind, sx: e.clientX, sy: e.clientY, moved: false, fromSource };
        moveGhost(e);
        try { e.target.setPointerCapture(e.pointerId); } catch (_) { /* yoksay */ }
        window.addEventListener('pointermove', onDragMove);
        window.addEventListener('pointerup', onDragEnd);
        window.addEventListener('pointercancel', onDragCancel);
    }

    function moveGhost(e) {
        drag.g.style.left = e.clientX + 'px';
        drag.g.style.top = e.clientY + 'px';
    }

    function endDrag() {
        if (!drag) return;
        drag.g.remove();
        drag = null;
        window.removeEventListener('pointermove', onDragMove);
        window.removeEventListener('pointerup', onDragEnd);
        window.removeEventListener('pointercancel', onDragCancel);
    }

    function onDragMove(e) {
        if (!drag || e.pointerId !== drag.id) return;
        if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
        moveGhost(e);
    }

    function onDragEnd(e) {
        if (!drag || e.pointerId !== drag.id) return;
        const r = root.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        const wasClick = drag.fromSource && !drag.moved;
        const kind = drag.kind;
        endDrag();
        if (inside) {
            const p = toLogical(e);
            dropToy(kind, p.x, p.y);
        } else if (wasClick) {
            dropToy(kind, rand(24, Math.max(25, W - 24)), 2);   // tıklama: yukarıdan düşer
        }
        // şeridin dışında bırakılırsa oyuncak kaybolur (araç çubuğuna geri döner)
    }

    function onDragCancel(e) {
        if (!drag || e.pointerId !== drag.id) return;
        endDrag();
    }

    canvas.addEventListener('pointerdown', e => {
        const p = toLogical(e);
        if (hitToy(p)) {
            e.preventDefault();
            const kind = toy.kind;
            toy = null;                        // oyuncak ele alındı
            beginDrag(e, kind, false);
        } else if (hitBowl(p)) {
            if (cat.state !== 'eating') removeBowl();
        } else if (hitCat(p)) {
            poke();
        }
    });

    canvas.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse' || drag) return;
        const p = toLogical(e);
        canvas.style.cursor = hitToy(p) ? 'grab' : (hitCat(p) || hitBowl(p)) ? 'pointer' : 'default';
    });

    toySrcs.forEach(el => {
        const kind = el.dataset.toy;
        el.addEventListener('pointerdown', e => {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            beginDrag(e, kind, true);
        });
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dropToy(kind, rand(24, Math.max(25, W - 24)), 2);
            }
        });
    });

    if (feedBtn) feedBtn.addEventListener('click', () => feed('food'));
    if (milkBtn) milkBtn.addEventListener('click', () => feed('milk'));

    /* ---------------------------------------------------- başlatma */
    readTheme();
    new MutationObserver(() => { readTheme(); if (W) buildBackground(); })
        .observe(document.body, { attributes: true, attributeFilter: ['class'] });

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(root);
    else window.addEventListener('resize', resize);
    resize();

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(en => { inView = en[0].isIntersecting; }).observe(root);
    }

    ENTER.idle({ dur: 1.5 });
    requestAnimationFrame(frame);

    // Sadece okuma amaçlı küçük bir tanı arayüzü
    window.WhiskerPet = {
        get state() { return cat.state; },
        get x() { return cat.x; },
        bounds: () => [MIN, MAX]
    };
})();

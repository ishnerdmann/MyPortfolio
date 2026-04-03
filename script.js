/**
 * SAGA Portfolio - Cinematic 3D Experience
 */

// --- GLOBAL VARIABLES ---
let lenis, scene, camera, renderer, raycaster, mouse;
let abstractObject, particles, shootingStars = [];
let currentProgress = 0;
let mousePos = { x: 0, y: 0 };

const roles = ["PRODUCT DESIGNER", "BRAND DESIGNER"];
let currentRoleIdx = 0;
let charIdx = 0;
let isDeleting = false;
let typingSpeed = 100;

let trails = [];
const trailCount = 8;

const playSfx = () => {};

// --- INITIALIZATION ---
const init = () => {
    // 1. Smooth Scroll (Lenis)
    lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
    });

    lenis.on('scroll', (e) => {
        ScrollTrigger.update();
        const header = document.querySelector('header');
        if (e.scroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // 2. Three.js Setup
    setupThree();
    createAbstractObject();
    createParticles();
    initShootingStars();
    
    // 4. Cursor
    setupCursor();

    // 5. Scroll Animations (GSAP)
    setupScrollAnimations();

    // 6. Interaction Listeners
    window.addEventListener('resize', onWindowResize);
    
    // Initial Resize
    onWindowResize();

    // Mouse Tracking for 3D
    window.addEventListener('mousemove', (e) => {
        mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
        mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Start Animation Loop
    animate();
    
    // --- LOADER HANDLING ---
    const params = new URLSearchParams(window.location.search);
    const skipLoader = params.get('skipLoader') === 'true';

    // GREETING SEQUENCE (TYPEWRITER & ERASE STYLE)
    const greetings = ["Hello", "नमस्ते", "Olá"];
    let currentGreetingIdx = 0;
    const greetingEl = document.getElementById('loader-greeting');
    let greetingsDone = false;
    let loaderGreetingTimer = null;
    
    const typeWord = (word, callback) => {
        let i = 0;
        greetingEl.innerText = "";
        gsap.to(greetingEl, { opacity: 1, duration: 0.3 }); // Make it visible
        
        loaderGreetingTimer = setInterval(() => {
            if (i >= word.length) {
                clearInterval(loaderGreetingTimer);
                setTimeout(callback, 1200); // Wait 1.2s before erasing
                return;
            }
            greetingEl.innerText += word[i];
            i++;
        }, 180); // Slower typing (180ms per char)
    };

    const eraseWord = (callback) => {
        loaderGreetingTimer = setInterval(() => {
            let text = greetingEl.innerText;
            if (text.length === 0) {
                clearInterval(loaderGreetingTimer);
                setTimeout(callback, 400); // Brief pause before next typing
                return;
            }
            greetingEl.innerText = text.substring(0, text.length - 1);
        }, 100); // Speed of erasing
    };

    const checkFinalReveal = () => {
        if (greetingsDone && currentProgress >= 100) {
            const btnGroup = document.getElementById('btn-group');
            const systemTag = document.querySelector('.system-tag');
            if (btnGroup && btnGroup.style.display !== 'flex') {
                btnGroup.style.display = 'flex';
                gsap.from('#enter-btn', { scale: 0.8, opacity: 0, duration: 1, ease: "back.out(2)" });
                if (systemTag) systemTag.innerText = "INITIALIZATION COMPLETE";
            }
        }
    };

    const revealSite = () => {
        if (loaderGreetingTimer) clearInterval(loaderGreetingTimer);
        document.getElementById('loader').style.display = 'none';
        
        gsap.to(camera.position, { z: 10, duration: 2, ease: 'expo.out' });
        gsap.to(camera, { fov: 75, duration: 2, ease: 'expo.out', onUpdate: () => camera.updateProjectionMatrix() });

        const tl = gsap.timeline();
        tl.from('.sub-heading', { y: 20, opacity: 0, duration: 1, ease: 'power3.out' })
          .from('.main-heading', { y: 100, opacity: 0, duration: 1, ease: 'expo.out' }, '-=0.5')
          .from('.italic', { x: -20, opacity: 0, duration: 1, ease: 'power2.out' }, '-=0.8')
          .from('.scroll-hint', { y: -20, opacity: 0, duration: 1 }, '-=0.5');

        setTimeout(type, 1000);
        ScrollTrigger.refresh();
    };

    const startGreetingSequence = () => {
        if (!greetingEl) return;

        // DYNAMIC FONT SWITCH
        const currentWord = greetings[currentGreetingIdx];
        if (currentWord === "Olá") {
            greetingEl.style.fontFamily = "'Caveat', cursive";
        } else if (currentWord === "नमस्ते") {
            greetingEl.style.fontFamily = "'Kalam', cursive"; // Beautiful Hindi Handwritten
        } else {
            greetingEl.style.fontFamily = "'Momo Signature', cursive";
        }
        
        typeWord(currentWord, () => {
            // Typing finished, update progress for this milestone
            const progressPerWord = 100 / greetings.length;
            const targetProgress = Math.round((currentGreetingIdx + 1) * progressPerWord);
            
            gsap.to(window, {
                duration: 1,
                onUpdate: () => {
                    // Gradual move to target %
                    if (currentProgress < targetProgress) {
                        currentProgress++;
                        const percentEl = document.getElementById('side-percent');
                        if (percentEl) percentEl.innerText = currentProgress + '%';
                        gsap.set('#loader-bar', { width: currentProgress + '%' });
                    }
                }
            });

            eraseWord(() => {
                currentGreetingIdx++;
                if (currentGreetingIdx >= greetings.length) {
                    greetingsDone = true;
                    currentProgress = 100; // Force final
                    document.getElementById('side-percent').innerText = '100%';
                    gsap.set('#loader-bar', { width: '100%' });
                    
                    // SHOW WAVING HAND 👋
                    greetingEl.innerText = "👋";
                    greetingEl.style.fontFamily = "sans-serif";
                    greetingEl.style.fontSize = "60px";
                    gsap.fromTo(greetingEl, 
                        { rotation: -20 }, 
                        { rotation: 20, duration: 0.5, repeat: -1, yoyo: true, ease: 'power1.inOut' }
                    );
                    gsap.to(greetingEl, { opacity: 1, y: 0, duration: 0.5 });

                    checkFinalReveal();
                    
                    // AUTO REVEAL AFTER 2 SECONDS (CINEMATIC)
                    setTimeout(() => {
                        triggerParticleReveal();
                    }, 2500);

                    return;
                }
                startGreetingSequence();
            });
        });
    };

    const triggerParticleReveal = () => {
        const loader = document.getElementById('loader');
        const particleContainer = document.getElementById('loader-particles');
        const particleCount = 100;
        
        // 1. Create Fine Warp Streaks (More subtle)
        for(let i=0; i<particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'loader-particle';
            p.style.cssText = `position:absolute; width:1px; height:1px; background:rgba(255,255,255,0.6); left:50%; top:50%; z-index:10; pointer-events:none;`;
            particleContainer.appendChild(p);

            const angle = Math.random() * Math.PI * 2;
            const dist = 1500;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;

            gsap.to(p, {
                width: 150, 
                x: tx,
                y: ty,
                rotation: (angle * 180 / Math.PI), 
                opacity: 0,
                duration: 1.2,
                ease: 'power3.in',
                delay: Math.random() * 0.2
            });
        }

        // 2. PREMIUM SMOOTH REVEAL
        const tl = gsap.timeline({ onComplete: revealSite });
        
        tl.to(['.loader-content', '.loading-data-side'], { 
            opacity: 0, 
            y: -20, 
            duration: 0.8, 
            ease: 'power2.inOut' 
        })
        .to(camera.position, { 
            z: 10,  // Smoothly move to main camera pos
            duration: 2, 
            ease: 'expo.inOut' 
        }, "-=0.5")
        .to(camera, { 
            fov: 75, 
            duration: 2, 
            ease: 'expo.inOut', 
            onUpdate: () => camera.updateProjectionMatrix() 
        }, "-=2")
        .to('#loader', { 
            opacity: 0, 
            duration: 1.5, 
            ease: 'power3.inOut' 
        }, "-=1.5");
    };

    // Replace the call in startGreetingSequence
    // (Search for triggerUnfoldEntrance call in startGreetingSequence and replaced it)

    if (skipLoader) {
        revealSite();
    } else {
        document.getElementById('loader').style.display = 'flex';
        startGreetingSequence(); // Start everything synced
    }
};

// --- TYPEWRITER ---
const type = () => {
    const typewriterEl = document.getElementById('typewriter');
    if (!typewriterEl) return;
    
    const currentRole = roles[currentRoleIdx];
    let waitTime = typingSpeed;

    if (isDeleting) {
        typewriterEl.textContent = currentRole.substring(0, charIdx - 1);
        charIdx--;
        waitTime = 50;
    } else {
        typewriterEl.textContent = currentRole.substring(0, charIdx + 1);
        charIdx++;
        waitTime = 150;
    }

    if (!isDeleting && charIdx === currentRole.length) {
        isDeleting = true;
        waitTime = 1500; // Pause at end
    } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        currentRoleIdx = (currentRoleIdx + 1) % roles.length;
        waitTime = 500; // Pause before start
    }

    setTimeout(type, waitTime);
};

// --- THREE.JS SETUP ---
const setupThree = () => {
    const canvas = document.getElementById('webgl-canvas');
    scene = new THREE.Scene();
    scene.background = null; // Absolute transparency
    // scene.fog = new THREE.FogExp2(0x0d0d0d, 0.002); // Removed fog haze

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xff3e3e, 20);
    pointLight1.position.set(2, 3, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4500, 20); // VIBRANT ORANGE LIGHT
    pointLight2.position.set(-5, -2, 3);
    scene.add(pointLight2);
};

const createAbstractObject = () => {
    // A complex morphing torus knot
    const geometry = new THREE.TorusKnotGeometry(4, 1.2, 100, 16);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.9,
        roughness: 0.1,
        transmission: 0.5,
        thickness: 0.5,
        transparent: true,
        opacity: 0.8,
        wireframe: true
    });
    abstractObject = new THREE.Mesh(geometry, material);
    abstractObject.scale.set(0, 0, 0); // Start small for intro animation
    scene.add(abstractObject);
    
    // Animate abstract object in
    gsap.to(abstractObject.scale, { x: 1, y: 1, z: 1, duration: 2, delay: 2, ease: 'elastic.out(1, 0.3)' });
};

const createParticles = () => {
    const geometry = new THREE.BufferGeometry();
    const count = 10000;
    const posArray = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
        // Create a 3D Tunnel of stars
        const radius = 5 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        posArray[i] = Math.cos(theta) * radius;
        posArray[i + 1] = Math.sin(theta) * radius;
        posArray[i + 2] = (Math.random() - 0.5) * 100; // Deep Z-axis
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const material = new THREE.PointsMaterial({
        size: 0.02,
        color: 0x33ccff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
};

// --- SHOOTING STAR (COMET) ---
class ShootingStar {
    constructor() {
        this.reset();
    }

    reset() {
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 20,
            -10
        );
        this.velocity = new THREE.Vector3(
            Math.random() * 0.2 + 0.1,
            -Math.random() * 0.1,
            Math.random() * 0.1
        );
        this.alive = true;
        this.trail = [];
        this.trailMax = 20;

        // Visual representation (Small glow)
        const geo = new THREE.SphereGeometry(0.05, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.mesh = new THREE.Mesh(geo, mat);
        scene.add(this.mesh);

        // Light
        this.light = new THREE.PointLight(0x33ccff, 2, 5);
        scene.add(this.light);
    }

    update() {
        this.position.add(this.velocity);
        this.mesh.position.copy(this.position);
        this.light.position.copy(this.position);

        if (this.position.x > 25 || this.position.y < -15) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            scene.remove(this.mesh);
            scene.remove(this.light);
            this.reset();
        }
    }
}

const initShootingStars = () => {
    for (let i = 0; i < 2; i++) {
        shootingStars.push(new ShootingStar());
    }
};

// --- SCROLL ANIMATIONS ---
const setupScrollAnimations = () => {
    gsap.registerPlugin(ScrollTrigger);

    // Update Progress Bottom Right
    ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
            currentProgress = Math.round(self.progress * 100);
            document.getElementById('progress-val').innerText = `${currentProgress}%`;
        }
    });

    // 1. HERO To TRANSITION (Zoom In)
    gsap.to(camera.position, {
        z: 2,
        scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1
        }
    });

    gsap.to(abstractObject.rotation, {
        y: Math.PI * 2,
        z: Math.PI,
        scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1
        }
    });

    // 2. ABOUT SECTION REVEAL (DRIVEN BY HERO SCROLL)
    const aboutTl = gsap.timeline({
        scrollTrigger: {
            trigger: '#hero',
            start: 'center top',
            end: 'bottom top',
            scrub: 1,
            onEnter: () => {
                if (shootingStars[0]) shootingStars[0].reset();
                playSfx('whoosh');
            },
            onEnterBack: () => {
                playSfx('whoosh');
            }
        }
    });

    aboutTl.from('.about-gallery', {
        scale: 0.1,
        z: -1000,
        opacity: 0,
        rotationZ: -20,
        ease: 'power3.out'
    })
    .from('.about-text', {
        opacity: 0,
        x: -50,
        duration: 0.8
    }, '-=0.3');

    // Subtle 3D Tilt for Solar System
    window.addEventListener('mousemove', (e) => {
        const solarSys = document.querySelector('.solar-system');
        if (!solarSys) return;
        
        const xAmt = (e.clientX / window.innerWidth - 0.5) * 20;
        const yAmt = (e.clientY / window.innerHeight - 0.5) * -20;
        
        gsap.to(solarSys, {
            rotationY: xAmt,
            rotationX: yAmt,
            duration: 1.5,
            ease: 'power2.out'
        });
    });

    // 3. SELECTED WORK (RAIN STYLE HAND-DEALT STACK REVEAL)
    const workWrappers = gsap.utils.toArray('.project-card-wrapper');
    
    // Set initial state (RE-CENTERED: 58% for Stability)
    gsap.set(workWrappers, { 
        xPercent: -50, 
        yPercent: -50, 
        top: '58%', 
        left: '50%',
        opacity: 0, 
        scale: 0.6, 
        x: 400, 
        y: 200, 
        rotationZ: 45,
        filter: 'blur(30px)' 
    });

    const workTl = gsap.timeline({
        scrollTrigger: {
            trigger: '#work',
            start: 'top top',
            end: '+=400%',
            pin: true,
            scrub: 1.2
        }
    });

    // Each WRAPPER lands at its unique tilted and offset resting place
    workWrappers.forEach((wrapper, i) => {
        const card = wrapper.querySelector('.project-card');
        const targetTilt = parseFloat(wrapper.dataset.tilt) || 0;
        const xOffset = (i - 1.5) * 80; // Spread for easier hover
        
        workTl.to(wrapper, {
            opacity: 1,
            scale: 1,
            x: xOffset,
            y: 0,
            rotationZ: targetTilt,
            filter: 'blur(0px)',
            duration: 2.5,
            ease: 'expo.out',
            zIndex: i + 10
        }, i * 2.5);

        // STABLE HOVER FOCUS (Fix: 'hover stable nhi h')
        wrapper.addEventListener('mouseenter', () => {
            wrapper.classList.add('is-active'); // Force absolute front via CSS
            gsap.to(card, {
                scale: 1.1,
                rotationZ: -targetTilt, // Countervail the wrapper's tilt for perfect flatness
                y: -30,
                duration: 0.6,
                ease: 'expo.out',
                borderColor: '#fff'
            });
            gsap.to('.marquee-inner', { timeScale: 0.1, duration: 1 });
        });

        wrapper.addEventListener('mouseleave', () => {
            wrapper.classList.remove('is-active'); // Return to stack
            gsap.to(card, {
                scale: 1,
                rotationZ: 0,
                y: 0,
                duration: 0.6,
                ease: 'expo.out',
                borderColor: 'rgba(255, 255, 255, 0.4)'
            });
            gsap.to('.marquee-inner', { timeScale: 1, duration: 1 });
        });
    });

    // The Marquee Ribbon (Subtle Drift)
    workTl.to('.marquee-inner', {
        x: '-10vw',
        duration: 10,
        ease: 'none'
    }, 0);

    // 3. EXPERIENCE (DITTO SPIRAL VORTEX)
    const iitTrigger = document.getElementById('iit-delhi-trigger');
    const scatterImgs = gsap.utils.toArray('.scatter-img');

    if (iitTrigger) {
        iitTrigger.addEventListener('mouseenter', () => {
            const xpTitle = document.querySelector('.xp-main-title');
            const xpLabel = document.querySelector('.xp-label');

            // 1. CENTER CONSOLIDATION (REFINED SCALE)
            gsap.to([xpTitle, xpLabel, iitTrigger], {
                scale: 0.9,
                opacity: 0.8,
                duration: 0.8,
                ease: 'expo.out'
            });

            // 2. SMART 3D SPIRAL VORTEX (Cursor-Linked Parallax)
            scatterImgs.forEach((img, index) => {
                const angle = (index / scatterImgs.length) * Math.PI * 2 * 2; 
                const radius = 280 + (index * 40);
                const depth = -200 - (index * 450); 
                
                const tx = Math.cos(angle) * radius;
                const ty = Math.sin(angle) * radius;
                
                // Entrance animation into the SMART VORTEX
                gsap.fromTo(img, 
                    { x: 0, y: 0, z: 0, opacity: 0, scale: 0 },
                    {
                        x: tx, y: ty, z: depth,
                        opacity: 1, scale: 1,
                        duration: 1.8,
                        delay: index * 0.08,
                        ease: 'expo.out',
                        overwrite: 'auto'
                    }
                );

                // SMART INTERACTION: Cursor Parallax
                document.addEventListener('mousemove', (e) => {
                    const cx = (e.clientX - window.innerWidth / 2) * 0.15;
                    const cy = (e.clientY - window.innerHeight / 2) * 0.15;
                    gsap.to(img, {
                        x: tx + cx,
                        y: ty + cy,
                        duration: 1.2,
                        ease: 'power2.out',
                        overwrite: 'auto'
                    });
                });

                // INFINITE ORBIT REMOVED (STATIC IMAGES)
                // img.vortex = gsap.to(img, { rotation: '+=360', duration: 40, repeat: -1, ease: 'none' });
            });
        });

        iitTrigger.addEventListener('mouseleave', () => {
            const xpTitle = document.querySelector('.xp-main-title');
            const xpLabel = document.querySelector('.xp-label');

            gsap.to([xpTitle, xpLabel, iitTrigger], { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' });

            scatterImgs.forEach(img => {
                if(img.vortex) img.vortex.kill();
                gsap.to(img, { x: 0, y: 0, z: 0, opacity: 0, scale: 0, duration: 0.6, ease: 'power2.in', overwrite: 'auto' });
            });
        });
    }



    // 4. WHEN I'M NOT DESIGNING (ORBIT TO ROW TRANSITION)
    const orbitCards = gsap.utils.toArray('.nd-orbit-card');
    const orbitContainer = document.querySelector('.nd-orbit-container');
    const orbitTrack = document.querySelector('.nd-orbit-track');

    if (orbitCards.length > 0 && orbitContainer) {
        const orbitTl = gsap.timeline({
            scrollTrigger: {
                trigger: orbitContainer,
                start: "top top",
                end: "+=250%",
                pin: true,
                scrub: 1.2,
                invalidateOnRefresh: true,
            }
        });

        // UNSTACK TO TIGHT ROW ANIMATION (FAN EFFECT)
        orbitCards.forEach((card, i) => {
            const centerIndex = (orbitCards.length - 1) / 2;
            const xOffset = (i - centerIndex) * 160;
            const rotationOffset = (i - centerIndex) * 5;
            
            orbitTl.to(card, {
                x: xOffset,
                y: 0,
                rotation: rotationOffset,
                scale: 1,
                duration: 1.5,
                ease: "power2.inOut"
            }, 0);
        });

        // EXIT ANIMATION (MOVE CARDS EVEN FURTHER UP)
        orbitTl.to(orbitCards, {
            y: -800, // Increased for a stronger exit up
            autoAlpha: 0, 
            stagger: 0.05,
            duration: 1.5,
            ease: "power2.in"
        }, "+=0.3");

        // Add a subtle title reveal during unstack
        orbitTl.from('.nd-main-heading', {
            opacity: 0.5,
            y: 20,
            duration: 1
        }, 0);
    }



    // 5. DEEP DIVE (3D Environment Camera Orbit)
    gsap.to(camera.position, {
        z: 20,
        x: -10,
        scrollTrigger: {
            trigger: '#deep-dive',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1
        }
    });

    // 5. CTA (Final Reveal)
    gsap.from('.cta-heading', {
        scale: 0.8,
        opacity: 0,
        scrollTrigger: {
            trigger: '#cta',
            start: 'top 80%',
            end: 'top 30%',
            scrub: 1
        }
    });

    // 4. DESIGN PROCESS ZOOM-OUT REVEAL
    const processCards = gsap.utils.toArray('.process-card');
    
    // Create a unified reveal timeline for the section
    const processRevealTl = gsap.timeline({
        scrollTrigger: {
            trigger: '#process',
            start: 'top 75%', // Start revealing as it enters
            toggleActions: 'play none none reverse'
        }
    });

    processRevealTl.from('.process-header-v2', {
        scale: 1.3,
        opacity: 0,
        filter: 'blur(30px)',
        duration: 1.5,
        ease: 'power3.out'
    })
    .from('.sparkle', {
        scale: 0,
        rotate: 360,
        opacity: 0,
        stagger: 0.2,
        duration: 0.8,
        ease: 'back.out(2)'
    }, '-=1');

    processRevealTl.from(processCards, {
        y: 80,
        scale: 1.1,
        opacity: 0,
        stagger: 0.1,
        duration: 1.2,
        ease: 'power2.out',
        onStart: () => playSfx('whoosh')
    }, '-=0.8');
};

let whooshNative;

// --- AUDIO SYSTEM ---
const setupAudio = () => {
    if (typeof Howl === 'undefined') return;

    console.log("Initializing Audio System...");

    // User-Provided Interstellar Atmosphere
    if (ambientSound) return; // Prevent double setup

    ambientSound = new Howl({
        src: ['sound/fnx_sound-interstellar-turbulence-galactic-roar-fnx-sound-289487.mp3'], 
        loop: true,
        volume: 0,
        html5: true, // Back to true for large file streaming
        preload: true
    });

    // Epic Whoosh for transition
    whooshNative = new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_34ec33919b.mp3');
    whooshNative.preload = 'auto';
    whooshNative.volume = 0.8;

    // UI Feedback Click
    clickSound = new Howl({
        src: ['https://cdn.pixabay.com/audio/2022/03/15/audio_c8b6b23023.mp3'], 
        volume: 0.3,
        preload: true
    });

    // Auto-unlock events
    const unlockAudio = () => {
        audioUnlocked = true;
        isSoundEnabled = true; // Auto-enable on interaction
        document.querySelector('.btn-text').innerText = 'SOUND ON';
        ['click', 'touchstart', 'keydown'].forEach(evt => document.body.removeEventListener(evt, unlockAudio));
    };

    ['click', 'touchstart', 'keydown'].forEach(evt => document.body.addEventListener(evt, unlockAudio, { once: true }));
};

const toggleSound = () => {
    isSoundEnabled = !isSoundEnabled;
    const btnText = document.querySelector('.btn-text');
    audioUnlocked = true; 
    
    if (isSoundEnabled) {
        ambientSound.play();
        ambientSound.fade(0, 0.4, 2000);
        btnText.innerText = 'SOUND ON';
    } else {
        ambientSound.fade(0.4, 0, 1000);
        setTimeout(() => ambientSound.stop(), 1000);
        btnText.innerText = 'SOUND OFF';
    }
    playSfx('click', true);
};

// --- SFX REMOVED ---

// --- CURSOR ---
const setupCursor = () => {
    const cursor = document.getElementById('cursor');
    const canvas = document.getElementById('cursor-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let history = [];
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    document.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        gsap.to(cursor, { x: mx, y: my, duration: 0.05, ease: "none" });
        
        history.push({ x: mx, y: my, age: 0 });
        if(history.length > 20) history.shift();
    });

    // Render loop for tail
    gsap.ticker.add(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (history.length < 2) return;
        
        for(let i = 0; i < history.length - 1; i++) {
            let p1 = history[i];
            let p2 = history[i+1];
            p1.age += 1;
            
            let alpha = Math.max(0, 1 - (history.length - i) * 0.05); // Fade towards tail
            let lineWidth = Math.max(0.5, i * 0.4); // Tapering
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(51, 204, 255, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            ctx.shadowColor = '#33ccff';
            ctx.shadowBlur = 10;
        }
        ctx.shadowBlur = 0; 
        
        history[history.length-1].age += 1; // age the last point too
        history = history.filter(p => p.age < 15); // Fade out quickly when stopped
    });

    // Hover effect
    document.querySelectorAll('a, button, .work-item').forEach(el => {
        el.addEventListener('mouseenter', () => {
            gsap.to(cursor, { scale: 2, background: 'rgba(51, 204, 255, 0.5)', duration: 0.3 });
        });
        el.addEventListener('mouseleave', () => {
            gsap.to(cursor, { scale: 1, background: '#fff', duration: 0.3 });
        });
    });
};

// --- EVENT HANDLERS ---
const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

const animate = () => {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Rotate Abstract Object
    if (abstractObject) {
        // Base rotation
        abstractObject.rotation.x += 0.002;
        abstractObject.rotation.y += 0.003;
        
        // Mouse reaction
        abstractObject.rotation.x += mousePos.y * 0.01;
        abstractObject.rotation.y += mousePos.x * 0.01;
        
        abstractObject.scale.setScalar(1 + Math.sin(time) * 0.05 + (Math.abs(mousePos.x) * 0.1));
    }

    // Move Particles
    if (particles) {
        particles.rotation.y += 0.0012;
        particles.rotation.x += 0.0005;
    }

    // Update Shooting Stars
    shootingStars.forEach(s => s.update());

    renderer.render(scene, camera);
};

// START
window.onload = init;

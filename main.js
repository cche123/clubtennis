document.addEventListener('DOMContentLoaded', () => {
    const NAMES = [
        "Caden", "Will", "Grace", "Cam", "Amani", "Derek Y",
        "Avery", "Tyler", "Luke W", "Harnoor", "Crystal",
        "George", "Daniela", "Austin Y", "Michael L", "Derek J",
        "Rishi", "Julian", "Justin", "Kailana", "Arlina",
        "Xavier", "Teso", "Luke S", "Michael J", "Ayanna",
        "Hannah", "Austin C", "Bruce", "Leo T", "Katherine",
        "Leo A", "Mia", "Alea", "Eujong", "Christine", "Gabrianna", "Francesco", "Tina"
    ];

    const container = document.getElementById('bubbles-container');
    const bubbles = [];

    // Screen bounds
    let width = window.innerWidth;
    let height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
    });

    class Bubble {
        constructor(name, existingBubbles) {
            this.element = document.createElement('div');
            this.element.classList.add('bubble');

            // Text offset for 3D realism
            this.element.innerHTML = `<span>${name}</span>`;

            // Size based on mobile breakpoint
            const isMobileInit = window.innerWidth < 768;
            const minSize = isMobileInit ? 45 : 70;
            const sizeVariance = isMobileInit ? 25 : 40;
            
            // Random size to look like tennis balls
            const size = Math.max(minSize, Math.random() * sizeVariance + minSize); 
            this.size = size;
            this.element.style.width = `${size}px`;
            this.element.style.height = `${size}px`;

            // Spawn safely without overlapping! (skip strict checking on mobile to allow overlap)
            this.x = Math.random() * (width - size);
            this.y = Math.random() * (height - size);
            let safe = isMobileInit;
            let attempts = 0;
            while (!safe && attempts < 100) {
                safe = true;
                for (let b of existingBubbles) {
                    const cx1 = this.x + this.size / 2;
                    const cy1 = this.y + this.size / 2;
                    const cx2 = b.x + b.size / 2;
                    const cy2 = b.y + b.size / 2;
                    const distSq = (cx2 - cx1) * (cx2 - cx1) + (cy2 - cy1) * (cy2 - cy1);
                    if (distSq < Math.pow(this.size / 2 + b.size / 2, 2)) {
                        safe = false;
                        this.x = Math.random() * (width - size);
                        this.y = Math.random() * (height - size);
                        break;
                    }
                }
                attempts++;
            }

            // Random velocity, bit faster than before!
            const speedMultiplier = 1.5 + Math.random() * 2.5;
            this.vx = (Math.random() - 0.5) * speedMultiplier;
            this.vy = (Math.random() - 0.5) * speedMultiplier;

            // Track rotation
            this.rotation = Math.random() * 360;
            // Spin rate correlates to speed
            this.vRotation = (this.vx + this.vy) * 2;

            // Initial transform
            this.updateTransform();

            container.appendChild(this.element);
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.rotation += this.vRotation;

            // Bounce off edges smoothly
            if (this.x <= 0) {
                this.x = 0;
                this.vx = Math.abs(this.vx);
                this.vRotation = (this.vx + this.vy) * 2;
            } else if (this.x + this.size >= width) {
                this.x = width - this.size;
                this.vx = -Math.abs(this.vx);
                this.vRotation = (this.vx + this.vy) * 2;
            }

            if (this.y <= 0) {
                this.y = 0;
                this.vy = Math.abs(this.vy);
                this.vRotation = (this.vx + this.vy) * 2;
            } else if (this.y + this.size >= height) {
                this.y = height - this.size;
                this.vy = -Math.abs(this.vy);
                this.vRotation = (this.vx + this.vy) * 2;
            }

            this.updateTransform();
        }

        updateTransform() {
            // translate3d for smooth hardware accelerated drifting + spin rotation
            this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) rotate(${this.rotation}deg)`;

            // Counter-rotate the span text so the name is always perfectly horizontal
            const span = this.element.querySelector('span');
            if (span) {
                span.style.transform = `rotate(-${this.rotation}deg)`;
            }
        }
    }

    // Initialize bubbles
    NAMES.forEach(name => {
        const bubble = new Bubble(name, bubbles);
        bubbles.push(bubble);
    });

    // Animation loop using native GPU sync mapped to elastic collision math
    function animate() {
        
        const isMobileRuntime = window.innerWidth < 768;

        // Handle collisions perfectly so they naturally bounce instead of passing through
        if (!isMobileRuntime) {
            for(let i=0; i<bubbles.length; i++) {
                for(let j=i+1; j<bubbles.length; j++) {
                    const b1 = bubbles[i];
                    const b2 = bubbles[j];
                    
                    const cx1 = b1.x + b1.size/2;
                    const cy1 = b1.y + b1.size/2;
                    const cx2 = b2.x + b2.size/2;
                    const cy2 = b2.y + b2.size/2;
                    
                    const dx = cx2 - cx1;
                    const dy = cy2 - cy1;
                    const distSq = dx*dx + dy*dy;
                    const radSum = (b1.size/2 + b2.size/2);
                    
                    if (distSq < radSum * radSum) {
                        const distance = Math.sqrt(distSq);
                        if (distance === 0) continue; 
                        const overlap = radSum - distance;
                        
                        const nx = dx / distance;
                        const ny = dy / distance;
                        
                        // Push apart to resolve any overlapping
                        b1.x -= nx * (overlap/2.1); 
                        b1.y -= ny * (overlap/2.1);
                        b2.x += nx * (overlap/2.1);
                        b2.y += ny * (overlap/2.1);
                        
                        // Elastic collision (swap normal velocities)
                        const tx = -ny;
                        const ty = nx;
                        
                        const dpTan1 = b1.vx * tx + b1.vy * ty;
                        const dpTan2 = b2.vx * tx + b2.vy * ty;
                        
                        const dpNorm1 = b1.vx * nx + b1.vy * ny;
                        const dpNorm2 = b2.vx * nx + b2.vy * ny;
                        
                        // Ensure they are moving towards each other before applying impulse
                        if (dpNorm1 - dpNorm2 > 0) {
                            b1.vx = tx * dpTan1 + nx * dpNorm2;
                            b1.vy = ty * dpTan1 + ny * dpNorm2;
                            b2.vx = tx * dpTan2 + nx * dpNorm1;
                            b2.vy = ty * dpTan2 + ny * dpNorm1;
                            
                            // Recalculate spin rate
                            b1.vRotation = (b1.vx + b1.vy) * 2;
                            b2.vRotation = (b2.vx + b2.vy) * 2;
                        }
                    }
                }
            }
        }

        bubbles.forEach(bubble => bubble.update());
        requestAnimationFrame(animate);
    }

    // Start loop
    animate();
});

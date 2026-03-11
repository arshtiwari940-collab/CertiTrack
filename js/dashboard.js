/**
 * CERTITRACK - Dashboard Logic
 * Handles animated counters, skill charts, and learning timeline rendering
 */

document.addEventListener('DOMContentLoaded', async () => {
    const checkApp = setInterval(() => {
        if(typeof AppState !== 'undefined') {
            clearInterval(checkApp);
            AppState.onReady(() => {
                Dashboard.init();
            });
        }
    }, 100);
});

const Dashboard = {
    DEFAULTS: {
        name: 'Your Name',
        headline: 'Add your headline in Admin → Edit Profile',
        intro: 'Welcome to your personal CertiTrack dashboard.',
        image: 'https://ui-avatars.com/api/?name=Admin&background=0a0a0f&color=00f2fe&size=200'
    },

    init() {
        this.certs = AppState.getCertificates() || [];
        const profile = AppState.getProfile();
        this.renderProfile(profile || this.DEFAULTS);
        this.calculateStats();
        this.renderSkills();
        this.renderCategoryCharts();
        this.renderTimeline();
        this.initScrollAnimations();
    },

    renderProfile(profile) {
        const p = profile || this.DEFAULTS;
        const nameEl = document.getElementById('heroName');
        const headlineEl = document.getElementById('heroHeadline');
        const introEl = document.getElementById('heroIntro');
        const avatarEl = document.getElementById('heroAvatar');
        if (nameEl) nameEl.textContent = p.name;
        if (headlineEl) headlineEl.textContent = p.headline;
        if (introEl) introEl.textContent = p.intro;
        if (avatarEl && p.image) avatarEl.src = p.image;
    },

    calculateStats() {
        const totalCerts = this.certs.length;
        const totalHours = this.certs.reduce((acc, curr) => acc + (parseInt(curr.learningHours) || 0), 0);
        const platforms = AppState.getUniqueValues('platform').length;
        const skillsCount = AppState.getUniqueValues('skills').length;

        this.setCounter('total-certs', totalCerts);
        this.setCounter('learning-hours', totalHours);
        this.setCounter('platforms', platforms);
        this.setCounter('skills', skillsCount);

        this.animateCounters();
    },

    setCounter(statId, value) {
        const el = document.querySelector(`[data-stat="${statId}"] .counter`);
        if (el) el.setAttribute('data-target', value);
    },

    animateCounters() {
        const counters = document.querySelectorAll('.counter');
        const speed = 200; // The lower the slower

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const updateCount = () => {
                        const target = +counter.getAttribute('data-target');
                        const count = +counter.innerText;
                        const inc = target / speed;

                        if (count < target) {
                            counter.innerText = Math.ceil(count + inc);
                            setTimeout(updateCount, 10);
                        } else {
                            counter.innerText = target;
                        }
                    };
                    updateCount();
                    observer.unobserve(counter);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(c => observer.observe(c));
    },

    renderSkills() {
        const skillContainer = document.getElementById('top-skills-container');
        if (!skillContainer) return;

        // Calculate skill frequencies
        const skillCounts = {};
        let maxCount = 0;
        
        this.certs.forEach(cert => {
            cert.skills.forEach(skill => {
                skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                if (skillCounts[skill] > maxCount) maxCount = skillCounts[skill];
            });
        });

        // Get top 5 skills
        const topSkills = Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (topSkills.length === 0) {
            skillContainer.innerHTML = '<p class="text-muted">No skills data available.</p>';
            return;
        }

        let html = '';
        topSkills.forEach(([skill, count]) => {
            const percentage = Math.max(20, Math.round((count / maxCount) * 100)); // Minimum 20% visually
            html += `
                <div class="skill-bar-wrapper">
                    <div class="skill-info">
                        <span>${skill}</span>
                        <span style="color: var(--accent-primary)">${count} cert(s)</span>
                    </div>
                    <div class="skill-track">
                        <div class="skill-progress" data-width="${percentage}%"></div>
                    </div>
                </div>
            `;
        });

        skillContainer.innerHTML = html;

        // Animate Bars
        setTimeout(() => {
            document.querySelectorAll('.skill-progress').forEach(bar => {
                bar.style.width = bar.getAttribute('data-width');
            });
        }, 300);
    },

    renderCategoryCharts() {
        const container = document.getElementById('category-charts-container');
        if (!container) return;

        const categoryCounts = {};
        this.certs.forEach(cert => {
            const cat = cert.category || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const topCategories = Object.entries(categoryCounts).sort((a,b) => b[1]-a[1]).slice(0, 4);

        if (topCategories.length === 0) {
            container.innerHTML = '<p class="text-muted">No category data.</p>';
            return;
        }

        const totalCerts = this.certs.length;
        let html = '';

        topCategories.forEach(([category, count]) => {
            const percentage = Math.round((count / totalCerts) * 100) || 0;
            const deg = (percentage / 100) * 360;
            
            html += `
                <div class="circular-chart" style="--progress: ${deg}deg">
                    <span class="circular-chart-value">${percentage}%</span>
                    <span class="circular-chart-label">${category}</span>
                </div>
            `;
        });

        container.innerHTML = html;
        
        // Trigger reflow for animation if needed
        setTimeout(() => {
            document.querySelectorAll('.circular-chart').forEach(chart => {
                 chart.style.backgroundColor = 'transparent'; // forces repaint for conic gradient
            });
        }, 100);
    },

    renderTimeline() {
        const timeline = document.getElementById('learning-timeline');
        if (!timeline) return;

        // Sort certificates by issueDate descending
        const sortedCerts = [...this.certs].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

        if (sortedCerts.length === 0) {
            timeline.innerHTML = '<p style="text-align:center" class="text-muted">Timeline is empty.</p>';
            return;
        }

        let html = '';
        sortedCerts.forEach(cert => {
            html += `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content glass-panel">
                        <span class="timeline-date">${AppState.formatDate(cert.issueDate)}</span>
                        <h3 class="timeline-title">${cert.title}</h3>
                        <p class="timeline-org">${cert.organization} | ${cert.platform}</p>
                    </div>
                </div>
            `;
        });

        timeline.innerHTML = html;
    },

    initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        document.querySelectorAll('.timeline-item').forEach(item => {
            observer.observe(item);
        });
    }
};

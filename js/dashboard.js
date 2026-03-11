/**
 * CERTITRACK - Dashboard Logic
 * Handles animated counters, skill charts, and learning timeline rendering.
 * Supports both auto-calculated and admin-defined (manual) stats.
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
        this.renderTimeline();
        this.initScrollAnimations();
        // Load skills / category charts (may use manual or auto)
        this.loadAndRenderCharts();

        // Check auth to show Edit Stats button
        const checkAuth = setInterval(() => {
            if (window.firebaseAuth && window.firebaseOnAuthStateChanged) {
                clearInterval(checkAuth);
                window.firebaseOnAuthStateChanged(window.firebaseAuth, (user) => {
                    const editBtn = document.getElementById('inlineEditStatsBtn');
                    if (editBtn) {
                        editBtn.style.display = user ? 'block' : 'none';
                        if (user) this.initInlineStatsEditor();
                    }
                });
            }
        }, 100);
    },

    renderProfile(profile) {
        const p = profile || this.DEFAULTS;
        const nameEl     = document.getElementById('heroName');
        const headlineEl = document.getElementById('heroHeadline');
        const introEl    = document.getElementById('heroIntro');
        const avatarEl   = document.getElementById('heroAvatar');
        if (nameEl)     nameEl.textContent     = p.name;
        if (headlineEl) headlineEl.textContent = p.headline;
        if (introEl)    introEl.textContent    = p.intro;
        if (avatarEl && p.image) avatarEl.src  = p.image;
    },

    calculateStats() {
        const totalCerts  = this.certs.length;
        const totalHours  = this.certs.reduce((acc, curr) => acc + (parseInt(curr.learningHours) || 0), 0);
        // Safely count platforms – filter out empty strings
        const platforms   = [...new Set(this.certs.map(c => c.platform).filter(p => p && p.trim()))].length;
        // Safely handle missing skills arrays
        const allSkills   = this.certs.flatMap(c => Array.isArray(c.skills) ? c.skills : []);
        const skillsCount = [...new Set(allSkills)].length;

        this.setCounter('total-certs',     totalCerts);
        this.setCounter('learning-hours',  totalHours);
        this.setCounter('platforms',       platforms);
        this.setCounter('skills',          skillsCount);

        this.animateCounters();
    },

    setCounter(statId, value) {
        const el = document.querySelector(`[data-stat="${statId}"] .counter`);
        if (el) el.setAttribute('data-target', value);
    },

    animateCounters() {
        const counters = document.querySelectorAll('.counter');
        const speed = 200;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const updateCount = () => {
                        const target = +counter.getAttribute('data-target');
                        const count  = +counter.innerText;
                        const inc    = target / speed;
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

    // ── Load charts: prefer manual stats when admin has set them ──────────
    async loadAndRenderCharts() {
        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
            const snap = await getDoc(doc(window.firebaseDb, 'settings', 'stats'));

            if (snap.exists() && snap.data().useManual) {
                const data = snap.data();
                this.renderSkillsManual(data.technologies || []);
                this.renderCategoryChartsManual(data.categories || []);
            } else {
                this.renderSkills();
                this.renderCategoryCharts();
            }
        } catch (err) {
            // Firebase not available yet or no stats doc – fall back to auto
            console.warn('Stats load failed, falling back to auto:', err.message);
            this.renderSkills();
            this.renderCategoryCharts();
        }
    },

    // ── Manual Skills (admin-defined) ──────────────────────────────────────
    renderSkillsManual(technologies) {
        const skillContainer = document.getElementById('top-skills-container');
        if (!skillContainer) return;

        if (!technologies.length) {
            skillContainer.innerHTML = '<p class="text-muted">No skill data available.</p>';
            return;
        }

        const maxPct = Math.max(...technologies.map(t => t.percentage), 1);
        let html = '';
        technologies.forEach(({ name, percentage }) => {
            const width = Math.max(10, Math.round((percentage / maxPct) * 100));
            html += `
                <div class="skill-bar-wrapper">
                    <div class="skill-info">
                        <span>${name}</span>
                        <span style="color:var(--accent-primary)">${percentage}%</span>
                    </div>
                    <div class="skill-track">
                        <div class="skill-progress" data-width="${width}%"></div>
                    </div>
                </div>`;
        });
        skillContainer.innerHTML = html;
        setTimeout(() => {
            document.querySelectorAll('.skill-progress').forEach(bar => {
                bar.style.width = bar.getAttribute('data-width');
            });
        }, 300);
    },

    // ── Manual Category Charts (admin-defined) ─────────────────────────────
    renderCategoryChartsManual(categories) {
        const container = document.getElementById('category-charts-container');
        if (!container) return;

        if (!categories.length) {
            container.innerHTML = '<p class="text-muted">No category data.</p>';
            return;
        }

        let html = '';
        categories.forEach(({ name, percentage }) => {
            const deg = (Math.min(100, Math.max(0, percentage)) / 100) * 360;
            html += `
                <div class="circular-chart" style="--progress: ${deg}deg">
                    <span class="circular-chart-value">${percentage}%</span>
                    <span class="circular-chart-label">${name}</span>
                </div>`;
        });
        container.innerHTML = html;
        setTimeout(() => {
            document.querySelectorAll('.circular-chart').forEach(chart => {
                chart.style.backgroundColor = 'transparent';
            });
        }, 100);
    },

    // ── Auto Skills (calculated from certs) ────────────────────────────────
    renderSkills() {
        const skillContainer = document.getElementById('top-skills-container');
        if (!skillContainer) return;

        const skillCounts = {};
        let maxCount = 0;
        this.certs.forEach(cert => {
            const skills = Array.isArray(cert.skills) ? cert.skills : [];
            skills.forEach(skill => {
                if (!skill) return;
                skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                if (skillCounts[skill] > maxCount) maxCount = skillCounts[skill];
            });
        });

        const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (topSkills.length === 0) {
            skillContainer.innerHTML = '<p class="text-muted">No skills data available.</p>';
            return;
        }

        let html = '';
        topSkills.forEach(([skill, count]) => {
            const percentage = Math.max(20, Math.round((count / maxCount) * 100));
            html += `
                <div class="skill-bar-wrapper">
                    <div class="skill-info">
                        <span>${skill}</span>
                        <span style="color:var(--accent-primary)">${count} cert(s)</span>
                    </div>
                    <div class="skill-track">
                        <div class="skill-progress" data-width="${percentage}%"></div>
                    </div>
                </div>`;
        });
        skillContainer.innerHTML = html;
        setTimeout(() => {
            document.querySelectorAll('.skill-progress').forEach(bar => {
                bar.style.width = bar.getAttribute('data-width');
            });
        }, 300);
    },

    // ── Auto Category Charts (calculated from certs) ───────────────────────
    renderCategoryCharts() {
        const container = document.getElementById('category-charts-container');
        if (!container) return;

        const categoryCounts = {};
        this.certs.forEach(cert => {
            const cat = cert.category || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
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
                </div>`;
        });
        container.innerHTML = html;
        setTimeout(() => {
            document.querySelectorAll('.circular-chart').forEach(chart => {
                chart.style.backgroundColor = 'transparent';
            });
        }, 100);
    },

    renderTimeline() {
        const timeline = document.getElementById('learning-timeline');
        if (!timeline) return;

        const sortedCerts = [...this.certs].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
        if (sortedCerts.length === 0) {
            timeline.innerHTML = '<p style="text-align:center" class="text-muted">Timeline is empty.</p>';
            return;
        }

        let html = '';
        sortedCerts.forEach(cert => {
            // Safely handle optional platform field
            const org = [cert.organization, cert.platform].filter(x => x && x.trim()).join(' | ');
            html += `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content glass-panel">
                        <span class="timeline-date">${AppState.formatDate(cert.issueDate)}</span>
                        <h3 class="timeline-title">${cert.title}</h3>
                        <p class="timeline-org">${org}</p>
                    </div>
                </div>`;
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
        document.querySelectorAll('.timeline-item').forEach(item => observer.observe(item));
    },

    // ── Inline Stats Editor (Admin Only) ───────────────────────────────────
    initInlineStatsEditor() {
        if (this._inlineEditorInitialized) return;
        this._inlineEditorInitialized = true;

        document.getElementById('inlineEditStatsBtn')?.addEventListener('click', () => this.openInlineStatsModal());
        document.getElementById('closeInlineStatsModal')?.addEventListener('click', () => this.closeInlineStatsModal());
        
        // Close on background click
        document.getElementById('inlineStatsModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('inlineStatsModal')) this.closeInlineStatsModal();
        });

        document.getElementById('inlineAddTechBtn')?.addEventListener('click', () => {
            this.addInlineStatRow('inlineTechContainer');
            this.checkInlineRowLimits();
        });

        document.getElementById('inlineAddCatBtn')?.addEventListener('click', () => {
            this.addInlineStatRow('inlineCatContainer');
            this.checkInlineRowLimits();
        });

        document.getElementById('inlineSaveStatsBtn')?.addEventListener('click', () => this.saveInlineStats());
    },

    async openInlineStatsModal() {
        const modal = document.getElementById('inlineStatsModal');
        if (!modal) return;
        
        const techContainer = document.getElementById('inlineTechContainer');
        const catContainer = document.getElementById('inlineCatContainer');
        techContainer.innerHTML = '';
        catContainer.innerHTML = '';
        
        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
            const snap = await getDoc(doc(window.firebaseDb, 'settings', 'stats'));
            
            if (snap.exists() && snap.data().useManual) {
                const data = snap.data();
                if (data.technologies) {
                    data.technologies.forEach(t => this.addInlineStatRow('inlineTechContainer', t.name, t.percentage));
                }
                if (data.categories) {
                    data.categories.forEach(c => this.addInlineStatRow('inlineCatContainer', c.name, c.percentage));
                }
            } else {
                // Add one empty row each to start
                this.addInlineStatRow('inlineTechContainer');
                this.addInlineStatRow('inlineCatContainer');
            }
            
            this.checkInlineRowLimits();
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            const msgEl = document.getElementById('inlineStatsMsg');
            if (msgEl) msgEl.classList.add('hidden');
        } catch (err) {
            console.error('Error loading stats for editor:', err);
            alert('Failed to load stats editor.');
        }
    },

    closeInlineStatsModal() {
        const modal = document.getElementById('inlineStatsModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    },

    addInlineStatRow(containerId, name = '', pct = '') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'stat-input-row';
        row.style.display = 'flex';
        row.style.gap = '0.5rem';
        row.style.alignItems = 'center';
        row.innerHTML = `
            <input type="text" class="stat-name-input" placeholder="Name (e.g. React)" value="${name}" required style="flex:2; padding:0.5rem; border-radius:var(--radius-sm); border:1px solid var(--glass-border); background:rgba(0,0,0,0.2); color:#fff;">
            <input type="number" class="stat-pct-input" placeholder="%" value="${pct}" min="0" max="100" required style="flex:1; width:80px; padding:0.5rem; border-radius:var(--radius-sm); border:1px solid var(--glass-border); background:rgba(0,0,0,0.2); color:#fff;">
            <button type="button" class="remove-row-btn" style="background:rgba(255,50,50,0.2); color:#ff5555; border:none; border-radius:var(--radius-sm); padding:0.5rem 0.8rem; cursor:pointer;" onclick="this.parentElement.remove(); window.Dashboard.checkInlineRowLimits();">✕</button>
        `;
        container.appendChild(row);
    },

    checkInlineRowLimits() {
        const techRows = document.getElementById('inlineTechContainer')?.children.length || 0;
        const catRows = document.getElementById('inlineCatContainer')?.children.length || 0;
        
        const addTechBtn = document.getElementById('inlineAddTechBtn');
        const addCatBtn = document.getElementById('inlineAddCatBtn');
        
        if (addTechBtn) addTechBtn.style.display = techRows >= 5 ? 'none' : 'block';
        if (addCatBtn) addCatBtn.style.display = catRows >= 4 ? 'none' : 'block';
    },

    async saveInlineStats() {
        const btn = document.getElementById('inlineSaveStatsBtn');
        const msgEl = document.getElementById('inlineStatsMsg');
        
        btn.textContent = 'Saving...';
        btn.disabled = true;
        
        try {
            const getRowData = (containerId) => {
                const rows = document.getElementById(containerId).querySelectorAll('.stat-input-row');
                const data = [];
                rows.forEach(row => {
                    const name = row.querySelector('.stat-name-input').value.trim();
                    const pct = parseInt(row.querySelector('.stat-pct-input').value) || 0;
                    if (name) data.push({ name, percentage: Math.min(100, Math.max(0, pct)) });
                });
                return data;
            };

            const technologies = getRowData('inlineTechContainer');
            const categories = getRowData('inlineCatContainer');
            
            // If completely empty, we still save so it overrides auto-stats with empty arrays
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
            const statsRef = doc(window.firebaseDb, 'settings', 'stats');
            
            await setDoc(statsRef, {
                useManual: true,
                technologies,
                categories,
                updatedAt: new Date().toISOString()
            });

            if (msgEl) {
                msgEl.textContent = 'Stats updated successfully!';
                msgEl.classList.remove('hidden');
            }
            
            // Re-render immediately on the dashboard page
            this.loadAndRenderCharts();
            
            setTimeout(() => {
                this.closeInlineStatsModal();
                btn.textContent = 'Save Dashboard Stats';
                btn.disabled = false;
            }, 1000);
            
        } catch (err) {
            console.error('Save stats error:', err);
            alert('Failed to save stats: ' + err.message);
            btn.textContent = 'Save Dashboard Stats';
            btn.disabled = false;
        }
    }
};

window.Dashboard = Dashboard;

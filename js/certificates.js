/**
 * CERTITRACK - Certificates Gallery Logic
 * Handles filtering, search, dynamic rendering, and modals.
 */

document.addEventListener('DOMContentLoaded', () => {
    const checkApp = setInterval(() => {
        if(typeof AppState !== 'undefined') {
            clearInterval(checkApp);
            AppState.onReady(() => {
                CertificatesApp.init();
            });
        }
    }, 100);
});

const CertificatesApp = {
    certs: [],
    filteredCerts: [],

    init() {
        this.certs = AppState.getCertificates() || [];
        this.filteredCerts = [...this.certs];
        
        this.cacheDOM();
        this.populateFilters();
        this.bindEvents();
        this.render();
    },

    cacheDOM() {
        this.container = document.getElementById('certificatesContainer');
        this.searchInput = document.getElementById('searchInput');
        this.skillFilter = document.getElementById('skillFilter');
        this.platformFilter = document.getElementById('platformFilter');
        this.yearFilter = document.getElementById('yearFilter');
        this.categoryFilter = document.getElementById('categoryFilter');
        
        this.modal = document.getElementById('certModal');
        this.modalContent = document.getElementById('modalContent');
        this.closeModalBtn = document.getElementById('closeModalBtn');
    },

    populateFilters() {
        const populateSelect = (selectEl, values) => {
            if (!selectEl) return;
            values.forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                selectEl.appendChild(opt);
            });
        };

        populateSelect(this.skillFilter, AppState.getUniqueValues('skills'));
        populateSelect(this.platformFilter, AppState.getUniqueValues('platform'));
        populateSelect(this.yearFilter, AppState.getUniqueValues('year'));
        populateSelect(this.categoryFilter, AppState.getUniqueValues('category'));
    },

    bindEvents() {
        // Debounced Search
        let debounceTimer;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.applyFilters();
            }, 300);
        });

        // Dropdown Filters
        [this.skillFilter, this.platformFilter, this.yearFilter, this.categoryFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.applyFilters());
            }
        });

        // Modal Close
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });
        }
    },

    applyFilters() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const skill = this.skillFilter.value;
        const platform = this.platformFilter.value;
        const year = this.yearFilter.value;
        const category = this.categoryFilter.value;

        this.filteredCerts = this.certs.filter(cert => {
            // Search Match (Title, Org, Skills)
            const matchesSearch = 
                cert.title.toLowerCase().includes(searchTerm) ||
                cert.organization.toLowerCase().includes(searchTerm) ||
                cert.skills.some(s => s.toLowerCase().includes(searchTerm));

            // Select Matches
            const matchesSkill = skill === 'all' || cert.skills.includes(skill);
            const matchesPlatform = platform === 'all' || cert.platform === platform;
            const matchesYear = year === 'all' || new Date(cert.issueDate).getFullYear().toString() === year;
            const matchesCategory = category === 'all' || cert.category === category;

            return matchesSearch && matchesSkill && matchesPlatform && matchesYear && matchesCategory;
        });

        this.render();
    },

    render() {
        if (!this.container) return;

        if (this.filteredCerts.length === 0) {
            this.container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                    <h3 style="color: var(--text-muted)">No certificates found matching your criteria.</h3>
                </div>
            `;
            return;
        }

        let html = '';
        this.filteredCerts.forEach((cert, index) => {
            const delay = (index % 10) * 0.1;
            const isPdf = cert.image && cert.image.toLowerCase().endsWith('.pdf');
            // Cloudinary auto-generates a thumbnail of the first page of a PDF if you change the extension to .jpg
            const displayImage = isPdf ? cert.image.replace(/\.pdf$/i, '.jpg') : cert.image;
            
            html += `
                <div class="cert-card glass-card" style="animation-delay: ${delay}s" onclick="CertificatesApp.openModal('${cert.id}')">
                    <div class="cert-image-wrapper">
                        <img src="${displayImage}" alt="${cert.title}" class="cert-image" loading="lazy">
                        <div class="cert-overlay"></div>
                    </div>
                    <div class="cert-content">
                        <span class="cert-category">${cert.category || 'Certification'}</span>
                        <h3 class="cert-title">${cert.title}</h3>
                        <div class="cert-org">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            ${cert.organization}
                        </div>
                        <div class="cert-tags">
                            ${cert.skills.slice(0, 3).map(skill => `<span class="tag">${skill}</span>`).join('')}
                            ${cert.skills.length > 3 ? `<span class="tag">+${cert.skills.length - 3}</span>` : ''}
                        </div>
                        <div class="cert-actions">
                            <span class="view-btn">View Details →</span>
                        </div>
                    </div>
                </div>
            `;
        });

        this.container.innerHTML = html;
    },

    openModal(certId) {
        const cert = this.certs.find(c => c.id === certId);
        if (!cert) return;

        const isPdf = cert.image && cert.image.toLowerCase().endsWith('.pdf');
        const displayImage = isPdf ? 'https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg' : cert.image;

        this.modalContent.innerHTML = `
            <div class="modal-image-col" style="${isPdf ? 'background: rgba(255,255,255,0.02); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem;' : ''}">
                <img src="${displayImage}" alt="${cert.title}" style="${isPdf ? 'max-width: 150px; margin-bottom: 2rem; filter: drop-shadow(0 0 20px rgba(0,0,0,0.5));' : ''}">
                ${cert.image ? `
                    <a href="${cert.image}" target="_blank" class="verify-btn" style="margin-top: auto; width: 100%; text-align: center; border-radius: var(--radius-sm)">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        Open Original ${isPdf ? 'PDF' : 'Image'}
                    </a>
                ` : ''}
            </div>
            <div class="modal-info-col">
                <h2 class="modal-title gradient-text">${cert.title}</h2>
                <div class="modal-org">${cert.organization} | ${cert.platform}</div>
                <p class="modal-desc">${cert.courseDescription}</p>
                
                <div class="modal-meta">
                    <div class="meta-item">
                        <span class="meta-label">Issue Date</span>
                        <span class="meta-value">${AppState.formatDate(cert.issueDate)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Learning Time</span>
                        <span class="meta-value">${cert.learningHours} Hours</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Category</span>
                        <span class="meta-value">${cert.category}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Credential ID</span>
                        <span class="meta-value">${cert.credentialId || 'N/A'}</span>
                    </div>
                </div>

                <div class="modal-skills">
                    <span class="meta-label" style="display:block; margin-bottom: 0.5rem">Skills Mastered</span>
                    <div class="cert-tags">
                        ${cert.skills.map(skill => `<span class="tag" style="border-color: var(--accent-primary)">${skill}</span>`).join('')}
                    </div>
                </div>

                ${cert.verificationLink ? `
                    <a href="${cert.verificationLink}" target="_blank" class="verify-btn" style="margin-top: 1.5rem;">Verify Platform Credential</a>
                ` : ''}
            </div>
        `;

        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    },

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        // Clear content after animation
        setTimeout(() => {
            this.modalContent.innerHTML = '';
        }, 300);
    }
};

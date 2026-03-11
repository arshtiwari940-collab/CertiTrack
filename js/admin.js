/**
 * CERTITRACK - Admin Panel Logic
 * Handles Firebase Auth, certificate uploads, profile editing, editing certs, and manual dashboard stats.
 */

// ─── Category "Other" toggle (Upload form) ─────────────────────────────────
document.getElementById('category')?.addEventListener('change', (e) => {
    const customGroup = document.getElementById('customCategoryGroup');
    const customInput = document.getElementById('customCategory');
    if (e.target.value === 'Other') {
        customGroup.classList.remove('hidden');
        customInput.required = true;
    } else {
        customGroup.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';
    }
});

// ─── Category "Other" toggle (Edit modal) ──────────────────────────────────
document.getElementById('editCategory')?.addEventListener('change', (e) => {
    const customGroup = document.getElementById('editCustomCategoryGroup');
    const customInput = document.getElementById('editCustomCategory');
    if (e.target.value === 'Other') {
        customGroup.classList.remove('hidden');
        customInput.required = true;
    } else {
        customGroup.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';
    }
});

// ─── Certificate file picker – live preview (Upload) ───────────────────────
document.getElementById('certFile')?.addEventListener('change', (e) => {
    handleFilePreview(e.target.files[0], 'certFilePreview', 'certPdfLabel');
});

// ─── Certificate file picker – live preview (Edit modal) ───────────────────
document.getElementById('editCertFile')?.addEventListener('change', (e) => {
    handleFilePreview(e.target.files[0], 'editCertFilePreview', 'editCertPdfLabel');
});

function handleFilePreview(file, imgId, pdfId) {
    const previewImg = document.getElementById(imgId);
    const pdfLabel   = document.getElementById(pdfId);
    if (!file) return;
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = ev => {
            previewImg.src = ev.target.result;
            previewImg.style.display = 'block';
        };
        reader.readAsDataURL(file);
        pdfLabel.style.display = 'none';
    } else if (file.type === 'application/pdf') {
        previewImg.style.display = 'none';
        pdfLabel.style.display = 'block';
    }
}

// ─── Wait for Firebase, then boot ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const authInterval = setInterval(() => {
        if (window.firebaseSignInWithEmailAndPassword) {
            clearInterval(authInterval);
            initAdmin();
        }
    }, 100);
});

function initAdmin() {
    const authSection   = document.getElementById('authSection');
    const uploadSection = document.getElementById('uploadSection');
    const loginForm     = document.getElementById('loginForm');
    const authErrorMsg  = document.getElementById('authErrorMsg');
    const logoutBtn     = document.getElementById('logoutBtn');

    // 1. Auth State Observer
    window.firebaseOnAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
            authSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
            loadCurrentProfile();
            loadManageCerts();
            loadStatsPanel();
        } else {
            uploadSection.classList.add('hidden');
            authSection.classList.remove('hidden');
        }
    });

    // 2. Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email    = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            authErrorMsg.classList.add('hidden');
            try {
                await window.firebaseSignInWithEmailAndPassword(window.firebaseAuth, email, password);
                loginForm.reset();
            } catch (error) {
                authErrorMsg.textContent = 'Login Error: ' + error.message;
                authErrorMsg.classList.remove('hidden');
            }
        });
    }

    // 3. Handle Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await window.firebaseSignOut(window.firebaseAuth);
        });
    }

    // 4. Admin Tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    // 5. Handle Certificate Upload
    const uploadForm     = document.getElementById('uploadForm');
    const uploadBtn      = document.getElementById('uploadBtn');
    const successMsg     = document.getElementById('uploadSuccessMsg');
    const uploadErrorMsg = document.getElementById('uploadErrorMsg');

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;
            successMsg.classList.add('hidden');
            uploadErrorMsg.classList.add('hidden');

            try {
                // Resolve category
                const categorySelect = document.getElementById('category');
                const customCat      = document.getElementById('customCategory');
                const category = categorySelect.value === 'Other'
                    ? (customCat.value.trim() || 'Other')
                    : categorySelect.value;

                // Upload certificate file to Cloudinary (optional)
                let fileUrl = '';
                const certFileInput = document.getElementById('certFile');
                const certFile = certFileInput?.files[0];
                if (certFile) {
                    uploadBtn.textContent = 'Uploading file…';
                    fileUrl = await window.uploadToCloudinary(certFile, 'certitrack/certificates');
                }

                const skillsRaw = document.getElementById('skills').value.trim();
                const skillsArr = skillsRaw
                    ? skillsRaw.split(',').map(s => s.trim()).filter(s => s)
                    : [];

                const learningHoursRaw = document.getElementById('learningHours').value;
                const learningHours = learningHoursRaw ? parseInt(learningHoursRaw, 10) : null;

                const newCert = {
                    title:             document.getElementById('title').value,
                    organization:      document.getElementById('organization').value,
                    platform:          document.getElementById('platform').value || '',
                    issueDate:         document.getElementById('issueDate').value,
                    learningHours:     learningHours,
                    credentialId:      document.getElementById('credentialId').value,
                    verificationLink:  document.getElementById('verificationLink').value,
                    category,
                    skills:            skillsArr,
                    courseDescription: document.getElementById('courseDescription').value,
                    image:             fileUrl,
                    createdAt:         new Date().toISOString()
                };

                const docRef = await window.firebaseAddDoc(
                    window.firebaseCollection(window.firebaseDb, 'certificates'),
                    newCert
                );
                console.log('Certificate written:', docRef.id);
                successMsg.classList.remove('hidden');
                uploadForm.reset();

                // Reset previews
                const img = document.getElementById('certFilePreview');
                if (img) { img.style.display = 'none'; img.src = ''; }
                const pdf = document.getElementById('certPdfLabel');
                if (pdf) pdf.style.display = 'none';
                const customGroup = document.getElementById('customCategoryGroup');
                if (customGroup) customGroup.classList.add('hidden');
                setTimeout(() => successMsg.classList.add('hidden'), 3000);

                // Refresh the manage certs list
                await loadManageCerts();
            } catch (error) {
                uploadErrorMsg.textContent = 'Upload Error: ' + error.message;
                uploadErrorMsg.classList.remove('hidden');
            } finally {
                uploadBtn.textContent = 'Upload Certificate';
                uploadBtn.disabled = false;
            }
        });
    }

    // 6. Refresh button in Manage Certs tab
    document.getElementById('refreshCertsBtn')?.addEventListener('click', () => loadManageCerts());

    // 7. Edit Modal – close buttons
    document.getElementById('closeEditModalBtn')?.addEventListener('click', closeEditModal);
    document.getElementById('editCertModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('editCertModal')) closeEditModal();
    });

    // 8. Edit form – save
    const editCertForm = document.getElementById('editCertForm');
    if (editCertForm) {
        editCertForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveEditedCert();
        });
    }

    // 9. Edit form - delete button
    document.getElementById('editDeleteBtn')?.addEventListener('click', async () => {
        const certId = document.getElementById('editCertId').value;
        if (!certId) return;
        if (!confirm('Are you sure you want to permanently delete this certificate?')) return;
        try {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
            await deleteDoc(doc(window.firebaseDb, 'certificates', certId));
            closeEditModal();
            await loadManageCerts();
        } catch (err) {
            document.getElementById('editErrorMsg').textContent = 'Delete Error: ' + err.message;
            document.getElementById('editErrorMsg').classList.remove('hidden');
        }
    });

    // 10. Handle Profile Save
    const profileForm       = document.getElementById('profileForm');
    const profileSaveBtn    = document.getElementById('profileSaveBtn');
    const profileSuccessMsg = document.getElementById('profileSuccessMsg');
    const profileErrorMsg   = document.getElementById('profileErrorMsg');
    const profilePreviewImg = document.getElementById('profilePreviewImg');

    document.getElementById('profileImage')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { profilePreviewImg.src = ev.target.result; };
            reader.readAsDataURL(file);
        }
    });

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            profileSaveBtn.textContent = 'Saving...';
            profileSaveBtn.disabled = true;
            profileSuccessMsg.classList.add('hidden');
            profileErrorMsg.classList.add('hidden');
            try {
                let imageUrl = '';
                const fileInput = document.getElementById('profileImage');
                const file = fileInput?.files[0];
                if (file) {
                    profileSaveBtn.textContent = 'Uploading image...';
                    imageUrl = await window.uploadToCloudinary(file, 'certitrack/profiles');
                }

                const profileData = {
                    name:      document.getElementById('profileName').value,
                    headline:  document.getElementById('profileHeadline').value,
                    intro:     document.getElementById('profileIntro').value,
                    updatedAt: new Date().toISOString()
                };
                if (imageUrl) profileData.image = imageUrl;

                const { doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
                const profileRef = doc(window.firebaseDb, 'settings', 'profile');
                const existingSnap = await getDoc(profileRef);
                const existing = existingSnap.exists() ? existingSnap.data() : {};
                await setDoc(profileRef, { ...existing, ...profileData });

                profileSuccessMsg.classList.remove('hidden');
                setTimeout(() => profileSuccessMsg.classList.add('hidden'), 3000);
            } catch (error) {
                profileErrorMsg.textContent = 'Save Error: ' + error.message;
                profileErrorMsg.classList.remove('hidden');
            } finally {
                profileSaveBtn.textContent = 'Save Profile';
                profileSaveBtn.disabled = false;
            }
        });
    }

    // 11. Dashboard Stats panel
    initStatsPanel();
}

// ══════════════════════════════════════════════════════════════════
// MANAGE CERTIFICATES
// ══════════════════════════════════════════════════════════════════

async function loadManageCerts() {
    const listEl = document.getElementById('manageCertsList');
    if (!listEl) return;
    listEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Loading…</p>';

    try {
        const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
        const q = query(collection(window.firebaseDb, 'certificates'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        if (snap.empty) {
            listEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No certificates uploaded yet.</p>';
            return;
        }

        let html = '';
        snap.forEach(docSnap => {
            const c = docSnap.data();
            const id = docSnap.id;
            const issueDate = c.issueDate ? new Date(c.issueDate).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' }) : '—';
            const isPdf = c.image && c.image.toLowerCase().endsWith('.pdf');
            const thumb = isPdf ? c.image.replace(/\.pdf$/i, '.jpg') : (c.image || '');

            html += `
            <div class="glass-panel" style="display:flex;align-items:center;gap:1.25rem;padding:1rem;border-radius:var(--radius-sm);">
                ${thumb ? `<img src="${thumb}" alt="${c.title}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;flex-shrink:0;">` :
                          `<div style="width:70px;height:50px;border-radius:6px;background:var(--glass-bg);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">📄</div>`}
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.title}</div>
                    <div style="font-size:0.82rem;color:var(--text-muted);">${c.organization} &bull; ${issueDate} &bull; <span class="cert-category" style="font-size:0.75rem;padding:0.1rem 0.5rem;">${c.category || 'N/A'}</span></div>
                </div>
                <button onclick="openEditModal('${id}')" class="submit-btn" style="padding:0.45rem 1rem;font-size:0.82rem;margin-top:0;flex-shrink:0;">✏️ Edit Details</button>
            </div>`;
        });

        listEl.innerHTML = html;
    } catch (err) {
        listEl.innerHTML = `<p style="color:#ff0844;text-align:center;">Error: ${err.message}</p>`;
    }
}

// ── Open Edit Modal ──────────────────────────────────────────────
window.openEditModal = async function(certId) {
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
        const snap = await getDoc(doc(window.firebaseDb, 'certificates', certId));
        if (!snap.exists()) return alert('Certificate not found.');
        const c = snap.data();

        document.getElementById('editCertId').value             = certId;
        document.getElementById('editTitle').value              = c.title || '';
        document.getElementById('editOrganization').value       = c.organization || '';
        document.getElementById('editPlatform').value           = c.platform || '';
        document.getElementById('editIssueDate').value          = c.issueDate || '';
        document.getElementById('editLearningHours').value      = c.learningHours || '';
        document.getElementById('editCredentialId').value       = c.credentialId || '';
        document.getElementById('editVerificationLink').value   = c.verificationLink || '';
        document.getElementById('editCourseDescription').value  = c.courseDescription || '';
        document.getElementById('editSkills').value             = (c.skills || []).join(', ');

        // Category
        const catSelect = document.getElementById('editCategory');
        const knownCategories = ['Frontend','Backend','Cloud','AI','DevOps','Database','Cybersecurity','Mobile','Data Science'];
        if (knownCategories.includes(c.category)) {
            catSelect.value = c.category;
            document.getElementById('editCustomCategoryGroup').classList.add('hidden');
        } else {
            catSelect.value = 'Other';
            document.getElementById('editCustomCategoryGroup').classList.remove('hidden');
            document.getElementById('editCustomCategory').value = c.category || '';
        }

        // Reset file preview
        document.getElementById('editCertFile').value = '';
        document.getElementById('editCertFilePreview').style.display = 'none';
        document.getElementById('editCertPdfLabel').style.display = 'none';

        // Hide messages
        document.getElementById('editSuccessMsg').classList.add('hidden');
        document.getElementById('editErrorMsg').classList.add('hidden');

        // Show modal
        const modal = document.getElementById('editCertModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (err) {
        alert('Error loading certificate: ' + err.message);
    }
};

function closeEditModal() {
    const modal = document.getElementById('editCertModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

async function saveEditedCert() {
    const editSaveBtn   = document.getElementById('editSaveBtn');
    const editErrorMsg  = document.getElementById('editErrorMsg');
    const editSuccessMsg= document.getElementById('editSuccessMsg');
    const certId        = document.getElementById('editCertId').value;

    editSaveBtn.textContent = 'Saving...';
    editSaveBtn.disabled = true;
    editSuccessMsg.classList.add('hidden');
    editErrorMsg.classList.add('hidden');

    try {
        // Resolve category
        const catSelect = document.getElementById('editCategory');
        const customCat = document.getElementById('editCustomCategory');
        const category = catSelect.value === 'Other'
            ? (customCat.value.trim() || 'Other')
            : catSelect.value;

        // Optional file upload
        let fileUrl = null;
        const fileInput = document.getElementById('editCertFile');
        const newFile   = fileInput?.files[0];
        if (newFile) {
            editSaveBtn.textContent = 'Uploading file…';
            fileUrl = await window.uploadToCloudinary(newFile, 'certitrack/certificates');
        }

        const skillsRaw = document.getElementById('editSkills').value.trim();
        const skillsArr = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(s => s) : [];

        const learningHoursRaw = document.getElementById('editLearningHours').value;
        const learningHours = learningHoursRaw ? parseInt(learningHoursRaw, 10) : null;

        const updatedData = {
            title:             document.getElementById('editTitle').value,
            organization:      document.getElementById('editOrganization').value,
            platform:          document.getElementById('editPlatform').value || '',
            issueDate:         document.getElementById('editIssueDate').value,
            learningHours,
            credentialId:      document.getElementById('editCredentialId').value,
            verificationLink:  document.getElementById('editVerificationLink').value,
            category,
            skills:            skillsArr,
            courseDescription: document.getElementById('editCourseDescription').value,
            updatedAt:         new Date().toISOString()
        };
        if (fileUrl !== null) updatedData.image = fileUrl;

        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
        await updateDoc(doc(window.firebaseDb, 'certificates', certId), updatedData);

        editSuccessMsg.classList.remove('hidden');
        setTimeout(() => {
            editSuccessMsg.classList.add('hidden');
            closeEditModal();
        }, 1800);
        await loadManageCerts();
    } catch (err) {
        editErrorMsg.textContent = 'Update Error: ' + err.message;
        editErrorMsg.classList.remove('hidden');
    } finally {
        editSaveBtn.textContent = 'Save Changes';
        editSaveBtn.disabled = false;
    }
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD STATS (Manual Overrides)
// ══════════════════════════════════════════════════════════════════

function addRowToContainer(containerId, nameVal = '', pctVal = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'stats-input-row';
    row.style.cssText = 'display:flex;gap:0.75rem;align-items:center;margin-bottom:0.75rem;';
    row.innerHTML = `
        <input type="text" placeholder="Name" value="${nameVal}" class="stats-name-input" style="flex:1;padding:0.6rem 1rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:0.9rem;">
        <input type="number" placeholder="%" min="0" max="100" value="${pctVal}" class="stats-pct-input" style="width:80px;padding:0.6rem 0.75rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:0.9rem;">
        <button type="button" class="remove-row-btn" style="background:rgba(255,8,68,0.15);border:1px solid #ff0844;color:#ff0844;border-radius:var(--radius-sm);padding:0.45rem 0.75rem;cursor:pointer;font-size:0.9rem;">✕</button>
    `;
    row.querySelector('.remove-row-btn').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

function initStatsPanel() {
    document.getElementById('addTechRowBtn')?.addEventListener('click', () => {
        const container = document.getElementById('techRowsContainer');
        if (container && container.querySelectorAll('.stats-input-row').length < 5) {
            addRowToContainer('techRowsContainer');
        } else {
            alert('Maximum 5 technologies allowed.');
        }
    });

    document.getElementById('addCatRowBtn')?.addEventListener('click', () => {
        const container = document.getElementById('categoryRowsContainer');
        if (container && container.querySelectorAll('.stats-input-row').length < 4) {
            addRowToContainer('categoryRowsContainer');
        } else {
            alert('Maximum 4 categories allowed.');
        }
    });

    document.getElementById('saveStatsBtn')?.addEventListener('click', saveStats);
}

async function loadStatsPanel() {
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
        const snap = await getDoc(doc(window.firebaseDb, 'settings', 'stats'));
        if (!snap.exists()) return;
        const data = snap.data();

        const techContainer = document.getElementById('techRowsContainer');
        const catContainer  = document.getElementById('categoryRowsContainer');
        if (techContainer) techContainer.innerHTML = '';
        if (catContainer)  catContainer.innerHTML  = '';

        (data.technologies || []).forEach(t => addRowToContainer('techRowsContainer', t.name, t.percentage));
        (data.categories   || []).forEach(c => addRowToContainer('categoryRowsContainer', c.name, c.percentage));
    } catch (err) {
        console.warn('Could not load stats panel:', err.message);
    }
}

async function saveStats() {
    const saveBtn       = document.getElementById('saveStatsBtn');
    const successMsg    = document.getElementById('statsSuccessMsg');
    const errorMsg      = document.getElementById('statsErrorMsg');
    saveBtn.textContent = 'Saving…';
    saveBtn.disabled    = true;
    successMsg.classList.add('hidden');
    errorMsg.classList.add('hidden');

    try {
        const technologies = [];
        document.querySelectorAll('#techRowsContainer .stats-input-row').forEach(row => {
            const name = row.querySelector('.stats-name-input').value.trim();
            const pct  = parseInt(row.querySelector('.stats-pct-input').value, 10);
            if (name && !isNaN(pct)) technologies.push({ name, percentage: Math.min(100, Math.max(0, pct)) });
        });

        const categories = [];
        document.querySelectorAll('#categoryRowsContainer .stats-input-row').forEach(row => {
            const name = row.querySelector('.stats-name-input').value.trim();
            const pct  = parseInt(row.querySelector('.stats-pct-input').value, 10);
            if (name && !isNaN(pct)) categories.push({ name, percentage: Math.min(100, Math.max(0, pct)) });
        });

        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
        await setDoc(doc(window.firebaseDb, 'settings', 'stats'), {
            technologies,
            categories,
            updatedAt: new Date().toISOString(),
            useManual: true
        });

        successMsg.classList.remove('hidden');
        setTimeout(() => successMsg.classList.add('hidden'), 3000);
    } catch (err) {
        errorMsg.textContent = 'Save Error: ' + err.message;
        errorMsg.classList.remove('hidden');
    } finally {
        saveBtn.textContent = 'Save Dashboard Stats';
        saveBtn.disabled    = false;
    }
}

// ══════════════════════════════════════════════════════════════════
// PROFILE LOADER
// ══════════════════════════════════════════════════════════════════

async function loadCurrentProfile() {
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
        const profileRef  = doc(window.firebaseDb, 'settings', 'profile');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            const p = profileSnap.data();
            if (document.getElementById('profileName'))     document.getElementById('profileName').value     = p.name     || '';
            if (document.getElementById('profileHeadline')) document.getElementById('profileHeadline').value = p.headline || '';
            if (document.getElementById('profileIntro'))    document.getElementById('profileIntro').value    = p.intro    || '';
            if (p.image && document.getElementById('profilePreviewImg')) {
                document.getElementById('profilePreviewImg').src = p.image;
            }
        }
    } catch (error) {
        console.warn('Could not load profile:', error.message);
    }
}

/**
 * CERTITRACK - Admin Panel Logic
 * Handles Firebase Auth, certificate uploads, and profile editing via Firestore.
 */

// ─── Category "Other" toggle ───────────────────────────────────────────────
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

// ─── Certificate file picker – live preview ────────────────────────────────
document.getElementById('certFile')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const previewImg = document.getElementById('certFilePreview');
    const pdfLabel = document.getElementById('certPdfLabel');
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
});

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
    const authSection  = document.getElementById('authSection');
    const uploadSection = document.getElementById('uploadSection');
    const loginForm    = document.getElementById('loginForm');
    const authErrorMsg = document.getElementById('authErrorMsg');
    const logoutBtn    = document.getElementById('logoutBtn');

    // 1. Auth State Observer
    window.firebaseOnAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
            authSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
            loadCurrentProfile();
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
    const uploadForm    = document.getElementById('uploadForm');
    const uploadBtn     = document.getElementById('uploadBtn');
    const successMsg    = document.getElementById('uploadSuccessMsg');
    const uploadErrorMsg = document.getElementById('uploadErrorMsg');

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;
            successMsg.classList.add('hidden');
            uploadErrorMsg.classList.add('hidden');

            try {
                // ── Resolve category (handle "Other") ───────────────────
                const categorySelect = document.getElementById('category');
                const customCat      = document.getElementById('customCategory');
                const category = categorySelect.value === 'Other'
                    ? (customCat.value.trim() || 'Other')
                    : categorySelect.value;

                // ── Upload certificate file to Cloudinary ──────────────
                let fileUrl = '';
                const certFileInput = document.getElementById('certFile');
                const certFile = certFileInput?.files[0];

                if (certFile) {
                    uploadBtn.textContent = 'Uploading file…';
                    fileUrl = await window.uploadToCloudinary(certFile, 'certitrack/certificates');
                }

                const skillsArr = document.getElementById('skills').value
                    .split(',').map(s => s.trim()).filter(s => s);

                const newCert = {
                    title:             document.getElementById('title').value,
                    organization:      document.getElementById('organization').value,
                    platform:          document.getElementById('platform').value,
                    issueDate:         document.getElementById('issueDate').value,
                    learningHours:     parseInt(document.getElementById('learningHours').value, 10),
                    credentialId:      document.getElementById('credentialId').value,
                    verificationLink:  document.getElementById('verificationLink').value,
                    category,
                    skills:            skillsArr,
                    courseDescription: document.getElementById('courseDescription').value,
                    image:             fileUrl,   // Firebase Storage URL
                    createdAt:         new Date().toISOString()
                };

                const docRef = await window.firebaseAddDoc(
                    window.firebaseCollection(window.firebaseDb, 'certificates'),
                    newCert
                );
                console.log('Certificate written:', docRef.id);
                successMsg.classList.remove('hidden');
                uploadForm.reset();
                // Reset preview elements too
                const img = document.getElementById('certFilePreview');
                if (img) { img.style.display = 'none'; img.src = ''; }
                const pdf = document.getElementById('certPdfLabel');
                if (pdf) pdf.style.display = 'none';
                const customGroup = document.getElementById('customCategoryGroup');
                if (customGroup) customGroup.classList.add('hidden');
                setTimeout(() => successMsg.classList.add('hidden'), 3000);
            } catch (error) {
                uploadErrorMsg.textContent = 'Upload Error: ' + error.message;
                uploadErrorMsg.classList.remove('hidden');
            } finally {
                uploadBtn.textContent = 'Upload Certificate';
                uploadBtn.disabled = false;
            }
        });
    }

    // 6. Handle Profile Save
    const profileForm       = document.getElementById('profileForm');
    const profileSaveBtn    = document.getElementById('profileSaveBtn');
    const profileSuccessMsg = document.getElementById('profileSuccessMsg');
    const profileErrorMsg   = document.getElementById('profileErrorMsg');
    const profilePreviewImg = document.getElementById('profilePreviewImg');

    // Live preview of profile image when file is selected
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
}

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

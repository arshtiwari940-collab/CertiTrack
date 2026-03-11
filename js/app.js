/**
 * CERTITRACK - Core Application Logic (Firebase Variant)
 * Handles global state, Firestore listeners, and utilities.
 */

const AppState = {
    certificates: [],
    profile: null,
    onDataReadyCallbacks: [],
    isReady: false,

    init() {
        // Wait for Firebase to be injected by firebase-config.js
        const checkFirebase = setInterval(() => {
            if (window.firebaseDb && window.firebaseCollection) {
                clearInterval(checkFirebase);
                this.fetchProfile();
                this.listenToFirestore();
            }
        }, 100);
    },

    async fetchProfile() {
        try {
            // Dynamic import to get the non-exported Firestore doc/getDoc
            const { doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
            const profileRef = doc(window.firebaseDb, "settings", "profile");
            // Listen to real-time profile changes
            onSnapshot(profileRef, (snap) => {
                if (snap.exists()) {
                    this.profile = snap.data();
                    // Re-render hero if dashboard is loaded
                    if (typeof Dashboard !== 'undefined' && Dashboard.renderProfile) {
                        Dashboard.renderProfile(this.profile);
                    }
                }
            });
        } catch (err) {
            console.warn("Profile fetch failed:", err.message);
        }
    },

    listenToFirestore() {
        const certsRef = window.firebaseCollection(window.firebaseDb, "certificates");
        const q = window.firebaseQuery(certsRef, window.firebaseOrderBy("createdAt", "desc"));
        
        window.firebaseOnSnapshot(q, (snapshot) => {
            const certs = [];
            snapshot.forEach((doc) => {
                certs.push({ id: doc.id, ...doc.data() });
            });
            this.certificates = certs;

            const wasAlreadyReady = this.isReady;
            this.isReady = true;
            this.notifyReady();
            
            // On subsequent Firestore updates (new cert uploaded), re-render the data layers only
            // Avoid calling full init() to prevent event listener re-binding
            if (wasAlreadyReady) {
                if (typeof Dashboard !== 'undefined' && Dashboard.renderSkills) {
                    Dashboard.certs = certs;
                    Dashboard.calculateStats();
                    Dashboard.loadAndRenderCharts();
                    Dashboard.renderTimeline();
                }
                if (typeof CertificatesApp !== 'undefined' && CertificatesApp.render) {
                    CertificatesApp.certs = certs;
                    CertificatesApp.filteredCerts = [...certs];
                    CertificatesApp.render();
                }
            }
        });
    },

    getCertificates() {
        return this.certificates;
    },

    getProfile() {
        return this.profile;
    },

    onReady(callback) {
        if (this.isReady) {
            callback();
        } else {
            this.onDataReadyCallbacks.push(callback);
        }
    },

    notifyReady() {
        this.onDataReadyCallbacks.forEach(cb => cb());
        this.onDataReadyCallbacks = [];
    },

    // Global utility: Format Date (YYYY-MM-DD to Month YYYY)
    formatDate(dateString) {
        if(!dateString) return 'Present';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    },

    // Get all unique values for a specific key across certificates
    getUniqueValues(key) {
        const certs = this.certificates || [];
        if (key === 'skills') {
            const allSkills = certs.flatMap(c => c.skills || []);
            return [...new Set(allSkills)].sort();
        } else if (key === 'year') {
            const years = certs.map(c => c.issueDate ? new Date(c.issueDate).getFullYear() : 'N/A');
            return [...new Set(years)].sort((a,b) => b - a);
        }
        return [...new Set(certs.map(c => c[key]))].filter(x => x).sort();
    }
};

// Initialize AppState immediately
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
});

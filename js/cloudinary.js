/**
 * CERTITRACK - Cloudinary Upload Helper
 * Uses unsigned upload preset (no backend required).
 *
 * ⚠️  Fill in your details below from your Cloudinary Dashboard:
 *     Dashboard → top-left shows "Cloud Name"
 *     Settings → Upload → Upload Presets → Add Upload Preset (set to "Unsigned")
 */

const CLOUDINARY_CLOUD_NAME = 'dikcxd3nd';      // e.g. 'dxyz123abc'
const CLOUDINARY_UPLOAD_PRESET = 'certitrack_unsigned'; // e.g. 'certitrack_unsigned'

/**
 * uploadToCloudinary(file, folder)
 * Uploads a File object to Cloudinary and returns the secure_url string.
 * @param {File} file - The file to upload (image or PDF)
 * @param {string} folder - Cloudinary folder name, e.g. 'certificates' or 'profiles'
 * @returns {Promise<string>} - The public HTTPS URL of the uploaded file
 */
async function uploadToCloudinary(file, folder = 'certitrack') {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error('Cloudinary upload failed: ' + (err.error?.message || response.statusText));
    }

    const data = await response.json();
    return data.secure_url; // Full public HTTPS URL ready to save to Firestore
}

// Make available globally for admin.js (which runs as a module)
window.uploadToCloudinary = uploadToCloudinary;

const CLOUDINARY_CLOUD_NAME = 'dikcxd3nd';
const CLOUDINARY_UPLOAD_PRESET = 'certitrack_unsigned';

(async () => {
    try {
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
        
        // simple 1x1 transparent png
        const b64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

        const formData = new FormData();
        formData.append('file', b64);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log("STATUS:", response.status);
        console.log("DATA:", data);
    } catch (err) {
        console.error("ERROR:", err);
    }
})();

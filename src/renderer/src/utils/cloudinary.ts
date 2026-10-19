const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dlkky5xuo/image/upload';
const UPLOAD_PRESET = 'promedid_preset';
const FOLDER = 'promedid';

export const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', FOLDER);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error?.message || errorData.message || 'Error uploading to Cloudinary';
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error: any) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};

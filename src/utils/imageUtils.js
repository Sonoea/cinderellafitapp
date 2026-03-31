
export const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        // Handle PDF files by just converting to Data URL
        if (file.type === 'application/pdf') {
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
            return;
        }

        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const openPdfFromDataUrl = (dataUrl) => {
    try {
        const base64Content = dataUrl.split(',')[1];
        const binaryContent = atob(base64Content);
        const bytes = new Uint8Array(binaryContent.length);
        for (let i = 0; i < binaryContent.length; i++) {
            bytes[i] = binaryContent.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        // Clean up the URL after a delay to avoid memory leaks
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
        console.error("Error opening PDF:", err);
        // Fallback to direct navigation if conversion fails
        window.open(dataUrl, '_blank');
    }
};


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

export const openPdfFromDataUrl = async (dataUrl) => {
    try {
        // More robust way to convert Data URL to Blob using fetch
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        
        // Open in a new tab
        const win = window.open(url, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
            // Popup blocker might have blocked it
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.click();
        }
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
        console.error("Error opening PDF:", err);
        window.open(dataUrl, '_blank');
    }
};

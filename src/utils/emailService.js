import emailjs from '@emailjs/browser';

// ⚠️ PLEASE REPLACE THESE WITH YOUR ACTUAL EMAILJS KEYS LATER
// Get them from https://dashboard.emailjs.com/
export const EMAILJS_CONFIG = {
    SERVICE_ID: 'service_ijnva55',
    TEMPLATE_ID: 'template_mplx47v',
    PUBLIC_KEY: 'BE87LsNbpUXBN4E5d',
};

export const sendNewUserNotification = async (userData) => {
    try {
        if (EMAILJS_CONFIG.SERVICE_ID === 'YOUR_SERVICE_ID') {
            console.log("⚠️ EmailJS not configured yet. Skipping email.");
            return;
        }

        const templateParams = {
            to_name: 'Admin',
            user_email: userData.email,
            user_uid: userData.uid,
            message: `New user registered! Email: ${userData.email}`,
        };

        const result = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            templateParams,
            EMAILJS_CONFIG.PUBLIC_KEY
        );
        console.log('Notification email sent:', result.text);
    } catch (error) {
        console.error('Failed to send notification email:', error);
    }
};

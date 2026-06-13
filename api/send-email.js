export default async function handler(req, res) {
    const allowedOrigins = [
        'https://www.resortreviews.pro',
        'https://resortreviews.pro',
        'https://resort-reviews.vercel.app',
        'http://localhost:3000'
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret, X-Reset-Password');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers['x-admin-secret'];
    const isPasswordReset = req.headers['x-reset-password'] === 'true';
    if (authHeader !== process.env.ADMIN_API_SECRET && !isPasswordReset) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Simple fetch to Resend API - only sending emails
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Resort Reviews <noreply@resortreviews.pro>',
                to: [to],
                subject: subject,
                html: html
            })
        });

        const data = await response.json();
        
        // Return the response
        return res.status(response.status).json(data);
        
    } catch (error) {
        console.error('Email error:', error);
        return res.status(500).json({ error: error.message });
    }
}
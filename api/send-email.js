export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
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
                'Authorization': `Bearer re_7ZwTCynk_H3fynxGAsK76XTu25p5vJ4BL`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'ResortReviews <onboarding@resend.dev>',
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
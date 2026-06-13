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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const authHeader = req.headers['x-admin-secret'];
    if (authHeader !== process.env.ADMIN_API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { authUserId } = req.body;
    if (!authUserId) {
        return res.status(400).json({ error: 'Missing authUserId' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
            }
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: data.msg || 'Failed to delete auth user' });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

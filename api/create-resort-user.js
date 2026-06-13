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
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const authHeader = req.headers['x-admin-secret'];
    const isPasswordReset = req.headers['x-reset-password'] === 'true';
    if (authHeader !== process.env.ADMIN_API_SECRET && !isPasswordReset) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, password, resortName } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SUPABASE_URL.startsWith('http')) {
        return res.status(500).json({ error: 'SUPABASE_URL env variable is missing or invalid on the server' });
    }
    if (!SERVICE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY env variable is missing on the server' });
    }
    const adminHeaders = {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        // Try to create the auth user
        let createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: { resort_name: resortName || '' }
            })
        });
        let data = await createRes.json();

        // If the user already exists, find them and update the password instead
        if (!createRes.ok) {
            const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
                headers: adminHeaders
            });
            const listData = await listRes.json();
            const existing = (listData.users || []).find(u => u.email === email);
            if (!existing) {
                return res.status(500).json({ error: 'Could not create or find auth user: ' + (data.msg || data.message || 'unknown') });
            }
            const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
                method: 'PUT',
                headers: adminHeaders,
                body: JSON.stringify({ password: password, email_confirm: true })
            });
            data = await updateRes.json();
            if (!updateRes.ok) {
                return res.status(500).json({ error: 'Could not update auth user password' });
            }
        }

        return res.status(200).json({ userId: data.id });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

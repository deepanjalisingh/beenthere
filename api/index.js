export default async function handler(req, res) {
  // Allow requests from your website
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error: 'Database environment variables are missing in Vercel settings.'
    });
  }

  // 1. GET: Fetch approved mentors
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/mentor_profiles?select=*`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      const data = await response.json();
      return res.status(200).json({
        status: 'online',
        database: 'connected',
        mentors: data
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. POST: Submit a new mentor application (always saves as PENDING)
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const newMentor = {
        name: body.name || 'Anonymous Applicant',
        email: body.email || '',
        headline: body.headline || '',
        bio: body.bio || '',
        university_or_company: body.university_or_company || '',
        topics: body.topics || [],
        languages: body.languages || ['English'],
        approval_status: 'PENDING'
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/mentor_profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'return=representation'
        },
        body: JSON.stringify(newMentor)
      });

      const result = await response.json();
      return res.status(201).json({
        message: 'Mentor application submitted successfully with PENDING status.',
        data: result
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}



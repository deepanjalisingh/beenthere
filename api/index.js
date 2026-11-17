export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Database credentials not configured in Vercel.' });
  }

  const action = req.query.action || 'mentors';

  try {
    // 1. MENTORS ENDPOINT
    if (action === 'mentors') {
      if (req.method === 'GET') {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/mentor_profiles?select=*`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
        const data = await response.json();
        return res.status(200).json({ status: 'online', database: 'connected', mentors: data });
      }

      if (req.method === 'POST') {
        const body = req.body || {};
        const response = await fetch(`${SUPABASE_URL}/rest/v1/mentor_profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=representation'
          },
          body: JSON.stringify({
            name: body.name || 'Anonymous Applicant',
            email: body.email || '',
            headline: body.headline || '',
            bio: body.bio || '',
            university_or_company: body.university_or_company || '',
            topics: body.topics || [],
            languages: body.languages || ['English'],
            approval_status: 'PENDING'
          })
        });
        const result = await response.json();
        return res.status(201).json({ message: 'Mentor profile submitted for admin review.', data: result });
      }
    }

    // 2. BOOKINGS ENDPOINT
    if (action === 'bookings') {
      if (req.method === 'GET') {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
        const data = await response.json();
        return res.status(200).json({ bookings: data });
      }

      if (req.method === 'POST') {
        const body = req.body || {};
        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=representation'
          },
          body: JSON.stringify({
            seeker_name: body.seeker_name || 'Seeker',
            seeker_email: body.seeker_email || '',
            mentor_name: body.mentor_name || '',
            topic: body.topic || 'General Guidance',
            session_format: body.session_format || '1-on-1 Video',
            is_minor: Boolean(body.is_minor),
            guardian_name: body.guardian_name || null,
            guardian_email: body.guardian_email || null,
            status: 'Requested'
          })
        });
        const result = await response.json();
        return res.status(201).json({ message: 'Session booking requested successfully.', data: result });
      }
    }

    return res.status(400).json({ error: 'Unknown action parameter' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


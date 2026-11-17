export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Database credentials not configured in Vercel.' });
  }

  async function sendEmail({ to, subject, html, cc }) {
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY missing.');
      return { error: 'RESEND_API_KEY missing' };
    }
    try {
      const payload = {
        from: 'BEENTHERE <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html
      };
      if (cc && cc.length > 0) payload.cc = Array.isArray(cc) ? cc : [cc];

      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify(payload)
      });
      return await r.json();
    } catch (err) {
      return { error: err.message };
    }
  }

  // Instant direct test trigger: /api/index?test_email=your@email.com
  if (req.query.test_email) {
    const testResult = await sendEmail({
      to: req.query.test_email,
      subject: 'Test Email from BEENTHERE',
      html: '<h2>Success!</h2><p>Your BEENTHERE email system is working.</p>'
    });
    return res.status(200).json({ status: 'test_triggered', testResult });
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

        // Send mentor application confirmation to owner inbox
        await sendEmail({
          to: 'deepanjalisingh0999@gmail.com',
          subject: `[BEENTHERE] New Mentor Application: ${newMentor.name}`,
          html: `
            <div style="font-family: sans-serif; color: #0f172a; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2>New Mentor Application Received</h2>
              <p><strong>Name:</strong> ${newMentor.name}</p>
              <p><strong>Email:</strong> ${newMentor.email}</p>
              <p><strong>Institution / Company:</strong> ${newMentor.university_or_company}</p>
              <p><strong>Status:</strong> <span style="color: #d97706; font-weight: bold;">PENDING APPROVAL</span></p>
              <p>Please review and approve this application in your Admin Control Center.</p>
            </div>
          `
        });

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
        const bookingData = {
          seeker_name: body.seeker_name || 'Seeker',
          seeker_email: body.seeker_email || '',
          mentor_name: body.mentor_name || 'Counselor',
          topic: body.topic || 'General Guidance',
          session_format: body.session_format || '1-on-1 Video',
          is_minor: Boolean(body.is_minor),
          guardian_name: body.guardian_name || null,
          guardian_email: body.guardian_email || null,
          status: 'Requested'
        };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=representation'
          },
          body: JSON.stringify(bookingData)
        });
        const result = await response.json();

        // Deliver booking email notification directly to your owner inbox
        await sendEmail({
          to: 'deepanjalisingh0999@gmail.com',
          subject: `[BEENTHERE] New Session Booking: ${bookingData.seeker_name} with ${bookingData.mentor_name}`,
          html: `
            <div style="font-family: sans-serif; color: #0f172a; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2>New Consultation Booked</h2>
              <p><strong>Seeker:</strong> ${bookingData.seeker_name} (${bookingData.seeker_email})</p>
              <p><strong>Mentor:</strong> ${bookingData.mentor_name}</p>
              <p><strong>Topic:</strong> ${bookingData.topic}</p>
              <p><strong>Format:</strong> ${bookingData.session_format}</p>
              ${bookingData.is_minor ? `<p style="color: #047857;"><strong>Guardian Consent Verified:</strong> ${bookingData.guardian_name} (${bookingData.guardian_email})</p>` : ''}
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              <p style="font-size: 12px; color: #64748b;">BEENTHERE Guidance Marketplace</p>
            </div>
          `
        });

        return res.status(201).json({ message: 'Session booking requested successfully.', data: result });
      }
    }

    return res.status(400).json({ error: 'Unknown action parameter' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


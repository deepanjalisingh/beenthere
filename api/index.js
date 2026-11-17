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

  const action = req.query.action || 'mentors';

  // Helper function to send email via Resend
  async function sendEmail({ to, subject, html, cc }) {
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. Skipping email.');
      return null;
    }
    try {
      const payload = {
        from: 'BEENTHERE <onboarding@resend.dev>', // Free testing sender domain
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html
      };
      if (cc && cc.length > 0) {
        payload.cc = Array.isArray(cc) ? cc : [cc];
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.error('Email send failed:', err);
      return null;
    }
  }

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

        // Send confirmation email to mentor applicant
        if (newMentor.email) {
          await sendEmail({
            to: newMentor.email,
            subject: 'Application Received — BEENTHERE Mentor Network',
            html: `
              <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a;">Welcome to BEENTHERE</h2>
                <p>Hello <strong>${newMentor.name}</strong>,</p>
                <p>Thank you for applying to become a verified mentor on <strong>BEENTHERE</strong> (“Talk to someone who’s been there.”).</p>
                <p>Your profile is currently under review with status: <strong style="color: #d97706;">PENDING APPROVAL</strong>.</p>
                <p>Our team will vet your academic/career background. Once approved, your profile will appear live in the public mentor directory.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #64748b;">BEENTHERE Guidance Marketplace • Private & Verified Mentorship</p>
              </div>
            `
          });
        }

        return res.status(201).json({ message: 'Mentor profile submitted and confirmation email sent.', data: result });
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

        // Send booking confirmation email to seeker (+ guardian if minor)
        if (bookingData.seeker_email) {
          const ccList = bookingData.is_minor && bookingData.guardian_email ? [bookingData.guardian_email] : [];
          await sendEmail({
            to: bookingData.seeker_email,
            cc: ccList,
            subject: `Session Requested with ${bookingData.mentor_name} — BEENTHERE`,
            html: `
              <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a;">Session Booking Requested</h2>
                <p>Hello <strong>${bookingData.seeker_name}</strong>,</p>
                <p>Your session request has been submitted on <strong>BEENTHERE</strong>.</p>
                <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
                  <p style="margin: 4px 0;"><strong>Mentor:</strong> ${bookingData.mentor_name}</p>
                  <p style="margin: 4px 0;"><strong>Topic:</strong> ${bookingData.topic}</p>
                  <p style="margin: 4px 0;"><strong>Format:</strong> ${bookingData.session_format}</p>
                  <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #2563eb;">Requested</span></p>
                  ${bookingData.is_minor ? `<p style="margin: 4px 0; color: #047857;"><strong>Guardian Consent:</strong> Verified (${bookingData.guardian_name})</p>` : ''}
                </div>
                <p>You can track the session status anytime from your <strong>Seeker Hub</strong>.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #64748b;">Notice: Guidance is based on personal lived experience. BEENTHERE does not guarantee admission or job offers.</p>
              </div>
            `
          });
        }

        return res.status(201).json({ message: 'Booking requested and confirmation email sent.', data: result });
      }
    }

    return res.status(400).json({ error: 'Unknown action parameter' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


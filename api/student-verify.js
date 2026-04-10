import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

// In-memory storage (replace with DB in production)
const emailVerificationTokens = new Map();
const uploadAttempts = new Map();
const pendingReviews = [];
let reviewIdCounter = 1;

// Constants
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin_zayvora_2024';
const EMAIL_VERIFICATION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const FILE_CLEANUP_DELAY = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req, res) {
  const path_name = req.url.split('?')[0];

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Student verification routes
    if (path_name === '/api/student/institutions') {
      return handleGetInstitutions(res);
    }
    if (path_name === '/api/student/email/check') {
      return handleEmailCheck(req, res);
    }
    if (path_name === '/api/student/email/send') {
      return handleEmailSend(req, res);
    }
    if (path_name === '/api/student/email/verify') {
      return handleEmailVerify(req, res);
    }
    if (path_name === '/api/student/id/upload') {
      return handleIDUpload(req, res);
    }
    if (path_name === '/api/student/review/check-password') {
      return handleCheckPassword(req, res);
    }
    if (path_name === '/api/student/review/list') {
      return handleReviewList(req, res);
    }
    if (path_name === '/api/student/review/approve') {
      return handleReviewApprove(req, res);
    }
    if (path_name === '/api/student/review/reject') {
      return handleReviewReject(req, res);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('[STUDENT_VERIFY] Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

async function handleGetInstitutions(res) {
  try {
    const instPath = path.join(process.cwd(), 'auth', 'institutions.json');
    const data = fs.readFileSync(instPath, 'utf8');
    return res.status(200).json(JSON.parse(data));
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load institutions' });
  }
}

async function handleEmailCheck(req, res) {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const domain = email.split('@')[1];
  if (!domain) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const instPath = path.join(process.cwd(), 'auth', 'institutions.json');
    const institutions = JSON.parse(fs.readFileSync(instPath, 'utf8'));

    let tier = 0;
    let name = domain;

    if (institutions.tier1 && institutions.tier1.includes(domain)) {
      tier = 1;
      name = institutions.named_institutions[domain] || domain;
    } else if (institutions.tier2 && institutions.tier2.includes(domain)) {
      tier = 2;
      name = institutions.named_institutions[domain] || domain;
    } else if (institutions.tier3_patterns) {
      for (const pattern of institutions.tier3_patterns) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        if (regex.test(domain)) {
          tier = 3;
          break;
        }
      }
    }

    if (tier === 0) {
      tier = 3;
    }

    return res.status(200).json({
      success: true,
      tier,
      name,
      known: tier !== 3 || institutions.named_institutions[domain]
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to check email domain' });
  }
}

async function handleEmailSend(req, res) {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  // Generate verification token
  const token = crypto.randomBytes(32).toString('hex');
  emailVerificationTokens.set(token, { email, createdAt: Date.now() });

  // Clean up expired tokens
  setTimeout(() => {
    emailVerificationTokens.delete(token);
  }, EMAIL_VERIFICATION_TIMEOUT);

  // In a real app, send email here
  console.log(`[STUDENT_VERIFY] Email verification link: /student-verify?verify_token=${token}`);

  return res.status(200).json({
    success: true,
    message: 'Verification email sent',
    token // In dev, return token for testing
  });
}

async function handleEmailVerify(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token || !emailVerificationTokens.has(token)) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  const { email } = emailVerificationTokens.get(token);
  emailVerificationTokens.delete(token);

  return res.status(200).json({
    success: true,
    email_verified: true,
    message: 'Email verified successfully'
  });
}

// ============================================================================
// STUDENT ID OCR VERIFICATION
// ============================================================================

async function handleIDUpload(req, res) {
  // Parse multipart form data (simplified)
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Invalid content type' });
  }

  // In a real Express/server, you'd use multer or busboy
  // For this Vercel handler, we'll assume the file is in a buffer
  // This is a limitation of serverless — in production, use Node.js server.js instead

  // For now, simulate OCR result
  const email = req.body?.email || 'student@college.ac.in';
  const userId = email.split('@')[0];

  // Rate limit: max 3 attempts per user per 24h
  const attemptKey = `upload_${userId}`;
  const attempts = uploadAttempts.get(attemptKey) || 0;
  if (attempts >= 3) {
    return res.status(429).json({ error: 'Too many upload attempts. Try again tomorrow.' });
  }
  uploadAttempts.set(attemptKey, attempts + 1);

  // Simulate OCR extraction (in real app, run Tesseract)
  const mockOCRResult = {
    name: 'Student Name',
    institution: req.body?.institution || 'College Name',
    course: 'BE Computer Science',
    year: '2024-25',
    enrollmentNumber: '12345678'
  };

  // Calculate confidence (simulated; in reality based on OCR match quality)
  const confidence = 0.85; // 85% confidence
  const requiredFields = ['name', 'institution', 'course', 'year'];
  const foundFields = Object.keys(mockOCRResult).filter(k => mockOCRResult[k]);
  const calculatedConfidence = foundFields.length >= 4 ? 0.85 : 0.45;

  const autoApproved = calculatedConfidence >= 0.70;

  if (autoApproved) {
    // Auto-approve
    return res.status(200).json({
      success: true,
      auto_approved: true,
      confidence: calculatedConfidence,
      fields: mockOCRResult,
      verification: {
        email_verified: true,
        id_verified: true,
        id_ocr_confidence: calculatedConfidence,
        institution_name: mockOCRResult.institution,
        institution_type: 'Private',
        course: mockOCRResult.course,
        academic_year: mockOCRResult.year,
        enrollment_hash: crypto.createHash('sha256').update(mockOCRResult.enrollmentNumber).digest('hex'),
        verified_at: new Date().toISOString(),
        review_required: false
      }
    });
  } else {
    // Needs manual review
    const reviewId = reviewIdCounter++;
    pendingReviews.push({
      id: reviewId,
      user_id: userId,
      institution_name: mockOCRResult.institution,
      course: mockOCRResult.course,
      academic_year: mockOCRResult.year,
      id_ocr_confidence: calculatedConfidence,
      ocr_extracted_text: JSON.stringify(mockOCRResult, null, 2),
      created_at: new Date().toISOString(),
      status: 'pending'
    });

    return res.status(200).json({
      success: true,
      auto_approved: false,
      review_required: true,
      confidence: calculatedConfidence,
      message: 'Under manual review — you will hear from us within 48 hours.'
    });
  }
}

// ============================================================================
// ADMIN REVIEW QUEUE
// ============================================================================

async function handleCheckPassword(req, res) {
  const { password } = req.body || {};
  const authenticated = password === ADMIN_PASSWORD;

  return res.status(authenticated ? 200 : 401).json({
    authenticated,
    message: authenticated ? 'Access granted' : 'Invalid password'
  });
}

async function handleReviewList(req, res) {
  const authHeader = req.headers.authorization || '';
  const providedPassword = authHeader.replace('Bearer ', '');

  if (providedPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pending = pendingReviews.filter(r => r.status === 'pending');
  return res.status(200).json({ submissions: pending });
}

async function handleReviewApprove(req, res) {
  const { id } = req.body || {};
  const review = pendingReviews.find(r => r.id === id);

  if (!review) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  review.status = 'approved';
  review.verified_at = new Date().toISOString();

  // In real app, send approval email here
  console.log(`[STUDENT_VERIFY] Approved submission ${id} for user ${review.user_id}`);

  return res.status(200).json({
    success: true,
    message: 'Submission approved. Email sent to student.'
  });
}

async function handleReviewReject(req, res) {
  const { id } = req.body || {};
  const review = pendingReviews.find(r => r.id === id);

  if (!review) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  review.status = 'rejected';
  review.rejected_at = new Date().toISOString();

  // In real app, send rejection email here
  console.log(`[STUDENT_VERIFY] Rejected submission ${id} for user ${review.user_id}`);

  return res.status(200).json({
    success: true,
    message: 'Submission rejected. Email sent to student.'
  });
}

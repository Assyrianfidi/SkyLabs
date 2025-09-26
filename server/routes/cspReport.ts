import { Router, Request, Response } from 'express';
import { logError } from '../utils/errorLogger.js';

const router = Router();

// CSP violation report endpoint
router.post('/csp-report', async (req: Request, res: Response) => {
  // Log CSP violations
  if (req.body && req.body['csp-report']) {
    const report = req.body['csp-report'];
    const errorDetails = {
      documentUri: report['document-uri'],
      referrer: report.referrer,
      blockedUri: report['blocked-uri'],
      violatedDirective: report['violated-directive'],
      originalPolicy: report['original-policy']
    };
    
    await logError(
      new Error('CSP Violation Detected'),
      'CSP',
      'Security',
      '🟠 Major',
      errorDetails
    );
  }
  
  res.status(204).end();
});

export default router;

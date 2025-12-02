// Middleware to extract user email from request headers
// Frontend should send user email in X-User-Email header

function getUserEmail(req) {
    // Try to get from header (sent by frontend)
    const userEmail = req.headers['x-user-email'];
    
    if (userEmail) {
        return userEmail;
    }
    
    // Fallback: try to get from body (for onboarding)
    if (req.body && req.body.userEmail) {
        return req.body.userEmail;
    }
    
    return null;
}

/**
 * Middleware to require user email
 * Returns 401 if user email is not provided
 */
function requireUserEmail(req, res, next) {
    const userEmail = getUserEmail(req);
    
    if (!userEmail) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'User email is required. Please ensure you are logged in.',
        });
    }
    
    req.userEmail = userEmail;
    next();
}

module.exports = {
    getUserEmail,
    requireUserEmail,
};


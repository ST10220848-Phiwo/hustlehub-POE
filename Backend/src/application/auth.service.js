import { User } from '../infrastructure/db/User.js';
import { hashPassword, verifyPassword } from '../infrastructure/auth/auth/password.js';
import { signAccessToken } from '../infrastructure/auth/auth/jwt.js';
import { AppError } from '../util/AppError.js';

/**
 * This service handles user authentication, including login and password verification.
 * Admin is deliberately not included in this service,
 * as it is a separate concern and should be handled by a dedicated admin service.
 *
 */

const SELF_REGISTERABLE_ROLES = ['client', 'freelancer']; // Roles that can self-register

//Joi already rejects bad roles but the service layer 
//shouldn't rely on every caller being validated
function toSafeRoles(roles) {
    const requested = Array.isArray(roles) ? roles : [roles];
    const allowed = [...new Set(requested.filter((r) => SELF_REGISTERABLE_ROLES.includes(r)))];
    return allowed.length > 0 ? allowed : ['client']; // Default to 'client' if no valid roles
}

export function createAuthService({
    UserModel = User,
    hasher = { hashPassword, verifyPassword },
    signToken = signAccessToken,
}) {
    //Hash is compared when th email doesn't exist, so "no such user"
    //is indistinguishable from "wrong password" to avoid leaking information
    let dummyHashPromise;
    const getDummyHash = () => {
        (dummyHashPromise ??= hasher.hashPassword('timing-equaliser-not-a-password'));
    }
}
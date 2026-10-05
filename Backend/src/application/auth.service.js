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

    
    async function registerUser({name, email, password, roles}) {
        const passwordHash = await hasher.hashPassword(password);
        try {
            const user = await UserModel.create({ name, email, passwordHash, roles: toSafeRoles(roles) });
            return user.toJSON();
        } catch (err) {
            if (err?.code === 11000) {
                throw AppError.conflict('An account with this email address already exists', { email });
            }
            throw err;
        }
    }

    async function authenticateUser({ email, password }) {
        const user = await UserModel.findOne({ email }).select('passwordHash');
        //Always run bcrypt, even when the user doesn't exist 
        const passwordMatches = await hasher.verifyPassword(
            password,
            user?.passwordHash ?? (await getDummyHash())
        );

        //Identical error for unknown email, wrong password and disabled account
        if (!user || !user.isActive || !passwordMatches) {
            throw AppError.unauthorized('Invalid email or password.');
        }

        const token = signToken({ id: user._id.toString(), roles: user.roles});
        return { user: user.toJSON(), token }
    }

    return { registerUser, authenticateUser };
}

export const authService = createAuthService();
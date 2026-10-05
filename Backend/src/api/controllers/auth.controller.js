import { authService } from '../api/application/auth.service.js';
import { ACCESS_TOKEN_COOKIE, getAuthCookieOptions } from '../api/config/jwt.js';

/**
 * This module validates the body through the use of roles 
 */

export async function register(req, res, next){
    try{
        //req.body has already been validated and stripped of unknown fields 
        const user = await authService.registerUser(req.body);
        res.status(201).json({user});
    } catch(err) {
        next(err);
    }
}

export async function login(req, res, next){
    try{
        const { user, token } = await authService.authenticateUser(req.body);
        //Token delivered only as a httpOnly cookie, not in the JSON
        res.cookie(ACCESS_TOKEN_COOKIE, token, getAuthCookieOptions());
        res.status(200).json({user});
    } catch(err) {
        next(err);
    }
}

export function logout(_req, res){
    //clearCookie needs the same attributes as when the cookie was set
    const { maxAge, ...clearOptions } = getAuthCookieOptions();
    res.clearCookie( ACCESS_TOKEN_COOKIE, clearOptions);
    res.status(204).send();
}

export function me(req, res){
    res.status(200).json({ user: req.user});
}

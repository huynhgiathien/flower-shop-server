const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const { secret } = require('../config.json');
const moment = require('moment')
const RefreshToken = require('../models/refreshToken.model.js')
// const db = require('_helpers/db');

module.exports = {

    // authorize(roles = []) {
    //     // roles param can be a single role string (e.g. Role.User or 'User') 
    //     // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
    //     if (typeof roles === 'string') {
    //         roles = [roles];
    //     }

    //     return [
    //         // authenticate JWT token and attach user to request object (req.user)
    //         jwt({ secret, algorithms: ['HS256'] }),

    //         // authorize based on user role
    //         async (req, res, next) => {
    //             const account = await db.Account.findByPk(req.user.id);

    //             if (!account || (roles.length && !roles.includes(account.role))) {
    //                 // account no longer exists or role not authorized
    //                 return res.status(401).json({ message: 'Unauthorized' });
    //             }

    //             // authentication and authorization successful
    //             req.user.role = account.role;
    //             const refreshTokens = await account.getRefreshTokens();
    //             req.user.ownsToken = token => !!refreshTokens.find(x => x.token === token);
    //             next();
    //         }
    //     ];
    // },

    async signAccessToken (id, type) {
        return new Promise((resolve, reject) => {
            const payload = {
                id,
                type,
            }
            const secret = process.env.ACCESS_TOKEN_SECRET;
            const options = {
                expiresIn: "7d"
            }
    
            jwt.sign(payload, secret, options, (error, token) => {
                if (error) {
                    reject(error);
                }
                resolve(token);
            })
        })
    },
    
    verifyAccessToken (req, res, next) {
        console.log('first')
        if (!req.headers['authorization']) {
            console.log('seccond')
            next()
        }
        console.log('thirt')
        const token = req.headers['authorization']?.split(' ')[1]
        console.log('token2', token)
        if (!token) {
            return
        }
        ///Verify token
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) =>{
            console.log('this is verify')
            if(err) {
                console.log('this is error', err)
                if(err.name === 'JsonWebTokenError')
                {
                    return next(createError.Unauthorized())
                }
                return next(createError.Unauthorized(err.message));
                }
            console.log('this is payload', payload)
            req.payload = payload
            next();
        })
    },

    verifyAccessSocketToken (token) {
        ///Verify token
        return new Promise((resolve, reject) => {
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) =>{
                return resolve(payload);
            })
        })
    },
    
    async signRefreshToken (userId, type) {
        return new Promise((resolve, reject) => {
            const payload = {
                userId, type
            }
            const secret = process.env.REFRESH_TOKEN_SECRET;
            const options = {
                expiresIn: "1y"
            }
    
            jwt.sign(payload, secret, options, async (error, token) => {
                try{
                    let refresh_token =  new RefreshToken({
                        id: userId.toString(),
                        token,
                        expire: moment().add(365, 'days'), type
                    })
                    let delete_old_refresh_token = await RefreshToken.deleteMany({id: userId.toString()})
                    let save_refresh_token = await refresh_token.save()
                    resolve(token);
                }
                catch(error){
                    reject(error);
                }
            })
        })
    },
    
    async verifyRefreshToken (refreshToken) {
        return new Promise((resolve, reject) => {
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, payload)=>{
                try{
                    if(err) reject(err); //Catch invalid token
                    let rfToken = await RefreshToken.findOne({id: payload.userId})
                    if (moment(rfToken.expire).isBefore(moment())) {
                        return reject({msg: "Refresh token expired"})
                    }
                    // console.log(":::::::::::::", rfToken, refreshToken)
                    if (rfToken.token === refreshToken) {
                        return resolve(payload)
                    }
                    return reject(createError.Unauthorized()); //Check token isexist in redis db
                }
                catch(err){
                    console.log(err.message)
                    reject(createError.InternalServerError());
                }
            })
        })
    }
}
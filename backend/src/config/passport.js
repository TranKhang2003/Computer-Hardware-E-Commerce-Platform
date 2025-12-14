// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({
                    'oauthAccounts.provider': 'google',
                    'oauthAccounts.providerId': profile.id,
                });

                let isNewUser = false;

                if (!user) {
                    user = await User.findOne({ email: profile.emails[0].value });
                    if (user) {
                        user.oauthAccounts.push({
                            provider: 'google',
                            providerId: profile.id,
                        });
                        await user.save();
                    } else {
                        user = await User.create({
                            fullName: profile.displayName,
                            email: profile.emails[0].value,
                            emailVerified: true,
                            oauthAccounts: [
                                { provider: 'google', providerId: profile.id },
                            ],
                        });
                        isNewUser = true;
                    }
                }

                if (isNewUser) {
                    try {
                        await sendEmail({
                            to: user.email,
                            template: 'REGISTER_SUCCESS',
                            data: { fullName: user.fullName },
                        });
                    } catch (err) {
                        console.error('Send email error:', err);
                    }
                }

                // IMPORTANT: do NOT call serializeUser — return user directly
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

passport.use(
    new FacebookStrategy(
        {
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: process.env.FACEBOOK_CALLBACK_URL,
            profileFields: ['id', 'displayName', 'emails'],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({
                    'oauthAccounts.provider': 'facebook',
                    'oauthAccounts.providerId': profile.id,
                });

                if (!user) {
                    user = await User.findOne({ email: profile.emails?.[0]?.value });
                    if (user) {
                        user.oauthAccounts.push({
                            provider: 'facebook',
                            providerId: profile.id,
                            accessToken,
                        });
                    } else {
                        user = await User.create({
                            fullName: profile.displayName,
                            email: profile.emails?.[0]?.value,
                            emailVerified: true,
                            oauthAccounts: [
                                { provider: 'facebook', providerId: profile.id, accessToken },
                            ],
                        });
                    }
                    await user.save();
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

module.exports = passport;

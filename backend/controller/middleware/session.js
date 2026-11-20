"use strict";

import session from "express-session";

// MemoryStore reicht für den Prototypen – nach einem Neustart muss man sich neu einloggen
export default session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: "strict",
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true", // nur über HTTPS senden (beim Hosting gesetzt)
    maxAge: 1000 * 60 * 60 * 8, // ein Arbeitstag
  },
});

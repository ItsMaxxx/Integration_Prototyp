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
    secure: false, // auf true setzen, sobald HTTPS aktiv ist
    maxAge: 1000 * 60 * 60 * 8, // ein Arbeitstag
  },
});

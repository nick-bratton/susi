#!/bin/bash
forever start server.js
forever start services/ngrok.js
forever start server.js
#!/usr/bin/env nodejs
'use strict';

const _express = require('express');

const PORT = 8080;
// const TUNNEL = process.env.TUNNEL;


const Express = _express();


// Express.use(staticFileMiddleware);

// Express.use(
// 	history(
// 		{
// 			index: '/public/dist/',
// 			verbose: true,
// 			disableDotRule: true,
// 		}
// 	)
// );

// Express.use(staticFileMiddleware);

Express.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
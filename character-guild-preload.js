const querystring = require('querystring');
let parsedQs = querystring.parse(global.location.search.substring(1));
window.isLoggedIn = parsedQs.isLoggedIn;
window.guildsAndCharacters = JSON.parse(parsedQs.guildsAndCharacters);

// scripts/post-build.js
const fs = require('fs');
const path = require('path');

// Create options.html from index.html
const indexHtml = fs.readFileSync(path.join(__dirname, '../build/index.html'), 'utf8');
const optionsHtml = indexHtml
    .replace('id="root"', 'id="options-root"')
    .replace('src="/static/js/main.js"', 'src="/static/js/options.js"');

fs.writeFileSync(path.join(__dirname, '../build/options.html'), optionsHtml);

// Copy background.js and content.js to build folder
fs.copyFileSync(
    path.join(__dirname, '../public/background.js'),
    path.join(__dirname, '../build/background.js')
);

fs.copyFileSync(
    path.join(__dirname, '../public/content.js'),
    path.join(__dirname, '../build/content.js')
);

console.log('Post-build processing completed.');
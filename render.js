const path = require('path');
const fs = require('fs');
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt({ html: true });

//console.log(__dirname);

const directoryPath = path.join(__dirname, 'docs/chapters');
const destPath = path.join(__dirname, 'rendered');

try {
    fs.readdirSync(directoryPath, { withFileTypes: true })
        .filter(item => !item.isDirectory())
        .map(item => {
            const filePath = path.join(directoryPath, item.name);

            if (!item.name.endsWith('.md')) { return; }

            // console.log(item.ext);

            fs.readFile(filePath, 'utf8', (err, contents) => {
                // console.log(contents);
                const result = md.render(contents);
                //console.log(result);

                const resultWrapped = '<div class="nsw">' + result + '</div>';

                fs.writeFile(path.join(destPath, item.name) + '.html', resultWrapped, (err) => {

                    if (err) {
                        return console.error(err);
                    }

                    console.log("The file was saved!");
                });

            });

        });
}
catch (e) {
    console.error(e);
}


#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2), {
  alias: { filename: 'f', port: 'p', listen: 'l' },
  default: { filename: 'story-coverage.html', port: 6060 },
});
const chokidar = require('chokidar');
const dirTree = require('directory-tree');
const fs = require('fs');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

let broadcastTimeout;
let lastDepth;
let open;
let ws;

const readFileContents = (filename) => fs.readFileSync(
  path.resolve(`${__dirname}/${filename}`),
  { encoding: 'utf-8', flag: 'r' }
);

let config = {
  ignored: [],
};

try {
  config = require(path.resolve('./.story-scanner.json'));
} catch (err) {
  // It's fine. The file might not be created.
}

const template = readFileContents('template/index.html');

const data = {
  ignoredPaths: JSON.stringify(config.ignored),
  legend: readFileContents('template/legend.html'),
  pageTitle: `${path.basename(path.resolve('.'))} story coverage`,
  script: readFileContents('public/script.js'),
  socketPort: argv.port + 1,
  style: readFileContents('public/style.css'),
};

const print = (content, obj, depth, isFile) => {
  if (depth > lastDepth) {
    content.push('<li><ul>');
    open++;
  }
  if (depth < lastDepth) {
    content.push('</ul></li>'.repeat(lastDepth - depth));
    open = open - (lastDepth - depth);
  }
  lastDepth = depth;
  content.push(`<li data-path="${ obj.path.replace(path.resolve('.') + '/', '') }" data-file="${!!isFile}">`);
  content.push(obj.name);
  content.push('</li>');
};

const walk = (content, obj, depth = 0) => {
  print(content, obj, depth, obj.type === 'file');
  if (obj.children) {
    obj.children.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') {
        return -1;
      }
      if (a.type === 'file' && b.type === 'directory') {
        return 1;
      }
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    }).forEach(child => walk(content, child, depth + 1));
  }
};

const broadcast = (message) => {
  try {
    ws.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch (err) {
    console.log('WebSocket message not sent');
  }
};

const generateContent = () => {
  const content = [];
  argv._.forEach(argPath => {
    lastDepth = 0;
    open = 0;
    content.push('<ul>');
    walk(
      content,
      dirTree(
        path.resolve(argPath),
        { extensions: /\.(js|ts|tsx)$/, exclude: /\.(spec|test)\.(js|ts|tsx)$/ }
      )
    );
    content.push('</ul>'.repeat((open || 0) + 1));
    content.push('\n');
  });
  return content.join('');
};

const writeFile = () => {
  const stream = fs.createWriteStream(argv.filename);
  data.content = generateContent();
  stream.write(
    template.replace(/\$\{(\w*)\}/g, (match, key) => data[key])
  );
  stream.end();
  clearTimeout(broadcastTimeout);
  broadcastTimeout = setTimeout(() => broadcast('update'), 100);
};

writeFile();

if (argv.listen) {
  const watcher = chokidar.watch(argv._);
  watcher.on('add', writeFile).on('unlink', writeFile);
  watcher.on('addDir', path => watcher.add(path));
  watcher.on('unlinkDir', path => watcher.unwatch(path));

  http.createServer((req, res) => {
    const stream = fs.createReadStream(argv.filename);
    stream.on('error', err => {
      res.writeHeader(404, 'Not Found');
      res.write('404: File Not Found!');
      return res.end();
    });
    res.statusCode = 200;
    stream.pipe(res);
  }).listen(argv.port);

  ws = new WebSocket.Server({ port: argv.port + 1 });
}

const cleanup = () => {
  try {
    fs.unlinkSync(argv.filename);
  } catch {}
  process.exit();
};

process.on('SIGINT', cleanup);




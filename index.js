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

let config;

try {
  config = require(path.resolve('./.story-scanner.json'));
} catch (err) {
}

const style = readFileContents('style.css');
const script = readFileContents('script.js');

const print = (stream, obj, depth, isFile) => {
  if (depth > lastDepth) {
    stream.write('<ul>');
    open++;
  }
  if (depth < lastDepth) {
    stream.write('</ul>'.repeat(lastDepth - depth));
    open = open - (lastDepth - depth);
  }
  lastDepth = depth;
  stream.write(`<li data-path="${ obj.path.replace(path.resolve('.') + '/', '') }" data-file="${!!isFile}">`);
  stream.write(obj.name);
  stream.write('</li>');
};

const pageTitle = `${path.basename(path.resolve('.'))} story coverage`;

const walk = (stream, obj, depth = 0) => {
  print(stream, obj, depth, obj.type === 'file');
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
    }).forEach(child => walk(stream, child, depth + 1));
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

const writeFile = () => {
  const stream = fs.createWriteStream(argv.filename);
  stream.write(`<!DOCTYPE html><title>${pageTitle}</title><style>${style}</style>`);
  stream.write('<div class="content">');
  argv._.forEach(argPath => {
    lastDepth = 0;
    open = 0;
    stream.write('<ul>\n');
    walk(
      stream,
      dirTree(
        path.resolve(argPath),
        { extensions: /\.js$/, exclude: /\.spec\.js$/ }
      )
    );
    stream.write('</ul>'.repeat((open || 0) + 1));
    stream.write('\n');
  });
  stream.write('</div>');
  stream.write(`<script>const socketPort = '${argv.port + 1}';</script>`);
  stream.write(`<script>const ignoredPaths = ${JSON.stringify(config.ignored)}</script>`);
  stream.write(`<script>${script}</script>`);
  stream.end();
  clearTimeout(broadcastTimeout);
  broadcastTimeout = setTimeout(() => broadcast('update'), 100);
}

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




#!/usr/bin/env node

const dirTree = require('directory-tree');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2), {
  alias: { filename: 'f', port: 'p', listen: 'l' },
  default: { filename: 'story-coverage.html', port: 6060 },
});
const http = require('http');

let lastDepth;
let open;

const readFileContents = (filename) => fs.readFileSync(
  path.resolve(`${__dirname}/${filename}`),
  { encoding: 'utf-8', flag: 'r' }
);

const style = readFileContents('style.css');
const script = readFileContents('script.js');

const print = (obj, depth, isFile) => {
  if (depth > lastDepth) {
    stream.write('<ul>');
    open++;
  }
  if (depth < lastDepth) {
    stream.write('</ul>'.repeat(lastDepth - depth));
    open = open - (lastDepth - depth);
  }
  lastDepth = depth;
  if (isFile) {
    stream.write(`<li data-path="${ obj.path.replace(path.resolve('.'), '') }">`);
  } else {
    stream.write('<li>');
  }
  stream.write(obj.name);
  stream.write('</li>');
};

const stream = fs.createWriteStream(argv.filename);

const pageTitle = `${path.basename(path.resolve('.'))} story coverage`;

stream.once('open', fd => {
  stream.write(`<!DOCTYPE html><title>${pageTitle}</title><style>${style}</style>`);
  argv._.forEach(argPath => {
    lastDepth = 0;
    open = 0;
    stream.write('<ul>\n');
    walk(
      dirTree(
        path.resolve(argPath),
        { extensions: /\.js$/, exclude: /\.spec\.js$/ }
      )
    );
    stream.write('</ul>'.repeat((open || 0) + 1));
    stream.write('\n');
  });
  stream.write(`<script>${script}</script>`);
  stream.end();

  if (argv.listen) {
    http.createServer((req, res) => {
      const strm = fs.createReadStream(argv.filename);
      strm.on('error', err => {
        res.writeHeader(404, 'Not Found');
        res.write('404: File Not Found!');
        return res.end();
      });
      res.statusCode = 200;
      strm.pipe(res);
    }).listen(argv.port);
  }
});

const walk = (obj, depth = 0) => {
  print(obj, depth, obj.type === 'file');
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
    }).forEach(child => walk(child, depth + 1));
  }
};

const cleanup = () => {
  try {
    fs.unlinkSync(argv.filename);
  } catch {}
  process.exit();
};

process.on('SIGINT', cleanup);




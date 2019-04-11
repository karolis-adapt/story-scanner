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

stream.once('open', fd => {
  stream.write(`
<!DOCTYPE html>
<title>${path.basename(path.resolve('.'))} story coverage</title>
<style>

html { font-family: sans-serif; }

/*
.pass { background: #e6f5d0; }
.fail { background: #f4dbdf; }
.meh { background: #fff4c2; }
*/

.pass::before, .fail::before, .meh::before { border-radius: 50%; content: ""; display: inline-block; height: 0.5em; margin-right: 0.5em; margin-top: -0.2em; vertical-align: middle; width: 0.5em; }

.pass::before { background: #4d9221; }
.fail::before { background: #bb213a; }
.meh::before { background: #bbb621; }

.collapsable::before { background: transparent; border-style: solid; border-radius: 0; border-width: 7px 0 7px 12.1px; height: 0; width: 0; }

.pass.collapsable::before { border-color: transparent transparent transparent #4d9221; }
.fail.collapsable::before { border-color: transparent transparent transparent #bb213a; }
.meh.collapsable::before { border-color: transparent transparent transparent #bbb621; }

.progress { border: 1px solid; display: inline-block; height: 1em; margin: 0 3em; width: 100px; vertical-align: bottom; }
.progress__bar { display: block; height: 100%; }

.title { display: inline-block; width: 200px; }

.fail .progress { border-color: #bb213a; }
.pass .progress { border-color: #4d9221; }
.meh .progress { border-color: #bbb621; }

.fail .progress__bar { background: #bb213a; }
.pass .progress__bar { background: #4d9221; }
.meh .progress__bar { background: #bbb621; }

li { display: block; margin: 0.2em; padding: 0.2em; }

.collapsable { cursor: pointer; }
.collapsed + ul { display: none; }

</style>
`);
  argv._.forEach(argPath => {
    lastDepth = 0;
    open = 0;
    stream.write('<ul>\n');
    walk(dirTree(path.resolve(argPath), { extensions: /\.js$/, exclude: /\.spec\.js$/ }));
    stream.write('</ul>'.repeat((open || 0) + 1));
    stream.write('\n');
  });
  stream.write(`
<script>

const storyNodes = document.querySelectorAll('[data-path$=".stories.js"]');
storyNodes.forEach(node => {
  const testNode = (
    document.querySelector('[data-path="' + node.dataset.path.replace('.stories', '') + '"]')
  );
  if (testNode && node !== testNode) {
    node.classList.add('pass');
    testNode.classList.add('pass');
  }
});
document.querySelectorAll('[data-path]:not(.pass)').forEach(
  node => node.classList.add('fail')
);

storyNodes.forEach(node => {
  if (!node.classList.contains('pass')) {
    return;
  }
  node.parentNode.removeChild(node);
});

const dirNodes = document.querySelectorAll('li:not([data-path])');

dirNodes.forEach(node => {
  const ulNode = node.nextSibling;
  if (!ulNode) {
    return;
  }
  const passingNodes = ulNode.querySelectorAll('.pass');
  const failingNodes = ulNode.querySelectorAll('.fail');
  const passes = passingNodes.length;
  const fails = failingNodes.length;
  const total = passes + fails;
  const percentage = Math.floor(passes / total * 100);
  if (percentage > 99) {
    node.classList.add('pass');
  } else if (percentage > 50) {
    node.classList.add('meh');
  } else {
    node.classList.add('fail');
  }
  node.addEventListener('click', () => {
    node.classList.toggle('collapsed');
  });
  node.addEventListener('keypress', (e) => {
    if (e.which === 13) {
      node.classList.toggle('collapsed');
    }
  });
  node.classList.add('collapsable');
  node.click();
  node.setAttribute('role', 'button');
  node.setAttribute('tabindex', 0);
  node.innerHTML = '<span class="title">' + node.innerHTML + '</span> <span class="progress"><span class="progress__bar" style="width: ' + percentage + '%"></span></span><span>' + percentage + '% (' + passes + ' passing, out of ' + total + ')</span>';
});

</script>
`);
  stream.end();

  if (argv.listen) {
    fs.readFile(argv.filename, (err, html) => {
      if (err) { throw err; }
      http.createServer((req, res) => {
        res.writeHeader(200, { 'Content-Type': 'text/html' });
        res.write(html);
        res.end();
      }).listen(argv.port);
    });
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




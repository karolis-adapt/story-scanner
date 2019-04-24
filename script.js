/* global socketPort, ignoredPaths */

(function () {

  function prepareList() {

    const storyNodes = document.querySelectorAll('[data-path$=".stories.js"]');

    const ignoredNodes = (
      ignoredPaths
        .map(path => document.querySelector(`[data-path="${path}"]`))
        .filter(node => node)
    );

    ignoredNodes.forEach(node => {
      node.classList.add('ignored');
    });

    storyNodes.forEach(node => {
      const testNode = document.querySelector(
        '[data-path="' + node.dataset.path.replace('.stories', '') + '"]'
      );
      if (testNode && node !== testNode) {
        node.classList.remove('fail')
        node.classList.add('pass');
        testNode.classList.remove('fail');
        testNode.classList.add('pass');
      }
    });

    document.querySelectorAll('[data-path]:not(.pass):not(.ignored)').forEach(node => {
      node.classList.remove('pass');
      node.classList.add('fail')
    });

    storyNodes.forEach(node => {
      if (!node.classList.contains('pass')) {
        return;
      }
      node.parentNode.removeChild(node);
    });

    const dirNodes = document.querySelectorAll('li:not([data-file="true"])');

    dirNodes.forEach(node => {
      const ulNode = node.nextSibling;
      if (!ulNode) {
        return;
      }
      const passingNodes = ulNode.querySelectorAll('.pass:not([data-file="false"])');
      const failingNodes = ulNode.querySelectorAll('.fail:not([data-file="false"])');
      const ignoredNodes = ulNode.querySelectorAll('.ignored:not([data-file="false"])');
      const passes = passingNodes.length;
      const fails = failingNodes.length;
      const ignores = ignoredNodes.length;
      const total = passes + fails;
      const percentage = (
        (passes === 0 && fails === 0) ?
          100 :
          Math.floor(passes / total * 100)
      );
      node.classList.remove('pass');
      node.classList.remove('fail');
      node.classList.remove('meh');
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
      const ignoredStr = ignores ? ', [with ' + ignores + ' ignored]' : '';
      node.innerHTML = '<span class="title">' + node.innerHTML + '</span> <span class="progress"><span class="progress__bar" style="width: ' + percentage + '%"></span></span><span>' + percentage + '% (' + passes + ' passing, out of ' + total + ignoredStr + ')</span>';
    });

    const paths = (localStorage.getItem('paths') || '').split('←');
    localStorage.removeItem('paths');

    paths.forEach(path => {
      const node = document.querySelector(`[data-path="${path}"]`);
      node && node.classList.remove('collapsed');
    });

  }

  const socketUrl = `ws://${window.location.hostname}:${socketPort}`;
  let socketInterval;

  function handleSocketMessage() {
    const paths = [];
    document.querySelectorAll('.collapsable:not(.collapsed)').forEach(
      node => paths.push(node.dataset.path)
    );
    localStorage.setItem('paths', paths.join('←'));
    fetch(window.location.origin)
      .then(r => r.text())
      .then(html => {
        const tempNode = document.createElement('html');
        tempNode.innerHTML = html;
        const contentNode = document.querySelector('.content');
        contentNode.parentNode.replaceChild(
          tempNode.querySelector('.content'),
          contentNode
        );
        prepareList();
      });
  }

  function connect() {
    const socket = new WebSocket(socketUrl);
    socket.addEventListener('open', () => {
      clearInterval(socketInterval);
      console.log(`Connection to ${socketUrl} established`);
    });
    socket.addEventListener('close', () => {
      console.log(`Connection to ${socketUrl} lost`);
      clearInterval(socketInterval);
      socketInterval = setInterval(() => {
        console.log(`Trying to reconnect to ${socketUrl}...`);
        connect();
      }, 1000);
    });
    socket.addEventListener('message', handleSocketMessage);
  }

  prepareList();
  connect();

})();


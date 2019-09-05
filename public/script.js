/* global socketPort, ignoredPaths */

(function () {

  function prepareCollapsable() {
    const collapsableNodes = document.querySelectorAll('[data-file="false"]');
    collapsableNodes.forEach(node => {
      node.classList.add('collapsable');
      node.addEventListener('click', () => {
        node.classList.toggle('collapsed');
      });
      node.addEventListener('keypress', (e) => {
        if (e.which === 13) { // RETURN
          node.classList.toggle('collapsed');
        }
      });
      node.click();
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', 0);
    });
  }

  function markFileStates() {

    // Mark passing files and remove story-files.
    document.querySelectorAll('[data-path$=".stories.js"]').forEach(node => {
      const rootFileName = node.dataset.path.replace('.stories', '');
      const associatedFileNode = (
        document.querySelector(
          `[data-path="${rootFileName}"], [data-path="${rootFileName.replace('.js', '.tsx')}"]`
        )
      );
      if (!associatedFileNode) {
        return;
      }
      associatedFileNode.classList.add('pass');
      node.parentNode.removeChild(node);
    });

    // Mark ignored files.
    ignoredPaths && ignoredPaths.forEach(path => {
      const node = document.querySelector(`[data-path="${path}"]`);
      if (!node) {
        return;
      }
      node.classList.add('ignored');
    });

    // Mark files that are neither passing, nor ignored.
    document.querySelectorAll(`[data-file="true"]:not(.pass):not(.ignored)`).forEach(node => {
      node.classList.add('fail');
    });

  }

  function markDirStates() {
    document.querySelectorAll('[data-file="false"]').forEach(node => {
      const passing = node.nextSibling.querySelectorAll('[data-file="true"].pass').length;
      const failing = node.nextSibling.querySelectorAll('[data-file="true"].fail').length;
      const ignored = node.nextSibling.querySelectorAll('[data-file="true"].ignored').length;
      const total = passing + failing;
      const percentage = (
        (passing === 0 && failing === 0) ?
          100 :
          Math.floor(passing / total * 100)
      );
      if (percentage > 99) {
        node.classList.add('pass');
      } else if (percentage > 50) {
        node.classList.add('meh');
      } else {
        node.classList.add('fail');
      }
      updateDirNameWithStates(node, passing, ignored, total, percentage);
    });
  }

  function updateDirNameWithStates(node, passing, ignored, total, percentage) {
    const ignoredStr = ignored ? ', [with ' + ignored + ' ignored]' : '';
    node.innerHTML = '<span class="title">' + node.innerHTML + '</span> <span class="progress"><span class="progress__bar" style="width: ' + percentage + '%"></span></span><span>' + percentage + '% (' + passing + ' passing, out of ' + total + ignoredStr + ')</span>';
  }

  function expandItemsFromLocalStorage() {
    const paths = (localStorage.getItem('paths') || '').split('←');
    localStorage.removeItem('paths');

    paths.forEach(path => {
      const node = document.querySelector(`[data-path="${path}"]`);
      node && node.classList.remove('collapsed');
    });
  }

  function prepareList() {
    prepareCollapsable();
    markFileStates();
    markDirStates();
    expandItemsFromLocalStorage();
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


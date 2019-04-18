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

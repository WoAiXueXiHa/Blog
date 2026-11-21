type Post = { id: string; title: string; category: 'tech' | 'notes'; date: string; description: string };
const posts = JSON.parse(document.querySelector<HTMLScriptElement>('#catalog')!.textContent || '[]') as Post[];
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const gateway = $('#gateway');
const terminalView = $('#terminal-view');
const webView = $('#web-view');
const terminalPaper = $('#terminal-paper');
const terminalHistory = $('#terminal-history');
const input = $<HTMLInputElement>('#terminal-input');
const terminalPrompt = $('#terminal-prompt');
const articleContainer = $('#article-container');
const blogList = $('#blog-list');
const aboutPage = $('#about-page');
const articlePage = $('#article-page');
function makeContents(article: HTMLElement): HTMLDetailsElement | null {
  const headings = [...article.querySelectorAll<HTMLHeadingElement>('h2')];
  if (!headings.length) return null;
  const toc = document.createElement('details');
  toc.className = 'article-toc';
  toc.open = window.matchMedia('(min-width: 1101px)').matches;
  const summary = document.createElement('summary');
  summary.textContent = '本文目录';
  const list = document.createElement('ol');
  headings.forEach((heading) => {
    const item = document.createElement('li');
    const link = document.createElement('button');
    link.type = 'button';
    link.textContent = heading.textContent || '';
    link.addEventListener('click', () => {
      if (window.innerWidth < 1101) toc.open = false;
      requestAnimationFrame(() => heading.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
    });
    item.append(link);
    list.append(item);
  });
  toc.append(summary, list);
  return toc;
}
let cwd: string[] = [];
let currentMode: 'gateway' | 'terminal' | 'web' = 'gateway';
let lastWebPage: 'blog' | 'about' | 'article' = 'blog';
let commandHistory: string[] = [];
let historyPosition = 0;
const modeMap = { gateway, terminal: terminalView, web: webView };

function setMode(mode: 'gateway' | 'terminal' | 'web') {
  currentMode = mode;
  for (const [name, node] of Object.entries(modeMap)) (node as HTMLElement).hidden = name !== mode;
  document.body.classList.toggle('reading', mode === 'web' && lastWebPage === 'article');
  if (mode === 'terminal') input.focus();
  if (mode === 'gateway') requestAnimationFrame(setupTitle);
  window.scrollTo(0, 0);
  window.history.replaceState(null, '', mode === 'gateway' ? '/' : `#${mode}`);
}
document.querySelectorAll<HTMLElement>('[data-open]').forEach((node) => node.addEventListener('click', () => setMode(node.dataset.open as 'terminal' | 'web')));
document.querySelectorAll<HTMLElement>('[data-switch]').forEach((node) => node.addEventListener('click', () => setMode(node.dataset.switch as 'terminal' | 'web')));
document.querySelectorAll<HTMLElement>('[data-home]').forEach((node) => node.addEventListener('click', () => setMode('gateway')));

function webPage(page: 'blog' | 'about' | 'article') {
  lastWebPage = page;
  blogList.hidden = page !== 'blog';
  aboutPage.hidden = page !== 'about';
  articlePage.hidden = page !== 'article';
  document.querySelectorAll<HTMLElement>('[data-web-page]').forEach((node) => node.classList.toggle('active', node.dataset.webPage === page));
  document.body.classList.toggle('reading', page === 'article');
  window.scrollTo(0, 0);
}
document.querySelectorAll<HTMLElement>('[data-web-page]').forEach((node) => node.addEventListener('click', () => webPage(node.dataset.webPage as 'blog' | 'about')));
document.querySelectorAll<HTMLElement>('[data-post]').forEach((node) => node.addEventListener('click', () => {
  const post = posts.find((entry) => entry.id === node.dataset.post)!;
  const template = document.querySelector<HTMLElement>(`[data-template="${CSS.escape(post.id)}"]`)!;
  articleContainer.replaceChildren();
  const heading = document.createElement('header');
  heading.className = 'article-heading';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = `${post.category === 'tech' ? 'TECH / 技术' : 'NOTES / 随笔'}  ·  ${post.date}`;
  const title = document.createElement('h1');
  title.textContent = post.title;
  const summary = document.createElement('p');
  summary.textContent = post.description;
  heading.append(eyebrow, title, summary);
  const article = template.cloneNode(true) as HTMLElement;
  const layout = document.createElement('div');
  layout.className = 'article-reading-layout';
  layout.append(article);
  const contents = makeContents(article);
  if (contents) layout.append(contents);
  articleContainer.append(heading, layout);
  webPage('article');
}));
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
  let count = 0;
  document.querySelectorAll<HTMLElement>('.post-row').forEach((row) => { row.hidden = filter !== 'all' && row.dataset.category !== filter; if (!row.hidden) count++; });
  $('#post-count').textContent = String(count).padStart(2, '0');
  $('#empty-state').toggleAttribute('hidden', count !== 0);
}));

const themeButton = $('#terminal-theme');
function setTerminalTheme(night: boolean) {
  terminalPaper.classList.toggle('night', night);
  themeButton.textContent = night ? '☾ NIGHT' : '☀ DAY';
  themeButton.setAttribute('aria-label', night ? '切换到白昼终端主题' : '切换到黑夜终端主题');
}
setTerminalTheme(new Date().getHours() < 7 || new Date().getHours() >= 19);
themeButton.addEventListener('click', () => setTerminalTheme(!terminalPaper.classList.contains('night')));

const root = { 'README.md': 'guide', about: { 'me.md': 'about' }, blog: { tech: Object.fromEntries(posts.filter((p) => p.category === 'tech').map((p) => [`${p.id.split('/').at(-1)}.md`, p.id])), notes: Object.fromEntries(posts.filter((p) => p.category === 'notes').map((p) => [`${p.id.split('/').at(-1)}.md`, p.id])) } } as Record<string, any>;
function currentNode(): any { return cwd.reduce((node, part) => node[part], root); }
function formatPath() { return `/${['Vect', ...cwd].join('/')}`; }
function resolvePath(path: string): { node: any; parts: string[] } | null {
  const parts = path.startsWith('/') ? [] : [...cwd];
  const items = path.startsWith('/') ? path.split('/').filter(Boolean).filter((item, i) => !(i === 0 && item === 'Vect')) : path.split('/').filter(Boolean);
  for (const item of items) { if (item === '.') continue; if (item === '..') { parts.pop(); continue; } parts.push(item); }
  const node = parts.reduce((value, part) => value && typeof value === 'object' ? value[part] : undefined, root as any);
  return node === undefined ? null : { node, parts };
}
function updatePrompt() { terminalPrompt.textContent = `Vect:${cwd.length ? '~/' + cwd.join('/') : '~'}$`; }
function line(text: string, className = '') { const node = document.createElement('div'); node.className = className; node.textContent = text; return node; }
function terminalArticle(id: string) {
  const outer = document.createElement('div'); outer.className = 'term-article';
  if (id === 'guide') {
    outer.innerHTML = '<h2>README.md</h2><p>欢迎来到 Vect 的博客目录。这里只开放阅读，不执行系统命令。</p><p><code>ls</code> 列出当前目录；<code>cd blog/tech</code> 进入目录；<code>pwd</code> 显示路径；<code>tree</code> 展示全部目录；<code>cat 文件名.md</code> 阅读文章；<code>who am i</code> 查看作者介绍。</p>';
  } else if (id === 'about') {
    outer.innerHTML = '<h2>About Vect</h2><p>你好，我是 Vect。这里会放一篇由我亲自确认的自我介绍。目前这一页是原型占位内容：我在学习 Go、后端开发，也在尝试把技术笔记整理成真正值得分享的文章。</p><p>这个博客有两种入口。你可以像浏览普通网站一样阅读，也可以在网页终端里沿着目录找到文章。</p>';
  } else {
    const template = document.querySelector<HTMLElement>(`[data-template="${CSS.escape(id)}"]`);
    if (template) {
      const article = template.cloneNode(true) as HTMLElement;
      const contents = makeContents(article);
      if (contents) outer.append(contents);
      outer.append(article);
    }
  }
  return outer;
}
function treeLines(node: any, prefix = ''): string[] {
  const entries = Object.entries(node);
  return entries.flatMap(([name, value], index) => { const last = index === entries.length - 1; const row = `${prefix}${last ? '└── ' : '├── '}${name}${typeof value === 'object' ? '/' : ''}`; return typeof value === 'object' ? [row, ...treeLines(value, prefix + (last ? '    ' : '│   '))] : [row]; });
}
function execute(raw: string) {
  const entry = document.createElement('div'); entry.className = 'terminal-entry';
  const commandLine = document.createElement('div'); commandLine.className = 'entry-command'; commandLine.innerHTML = `<span>Vect:${cwd.length ? '~/' + cwd.join('/') : '~'}$</span> `;
  const commandText = document.createElement('strong'); commandText.textContent = raw; commandLine.append(commandText);
  const output = document.createElement('div'); output.className = 'entry-output';
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const [cmd, ...args] = trimmed.split(' ');
  const arg = args.join(' ');
  if (!trimmed) return;
  switch (cmd) {
    case 'help': output.append(line('可用命令：ls · cd · pwd · tree · cat · who am i · help · clear')); output.append(line('试试：ls → cd blog/tech → cat context.md')); break;
    case 'pwd': output.append(line(formatPath())); break;
    case 'ls': {
      const target = arg ? resolvePath(arg) : { node: currentNode(), parts: cwd };
      if (!target || typeof target.node !== 'object') output.append(line(`ls: 找不到目录 ${arg}`, 'entry-error'));
      else { const links = document.createElement('div'); links.className = 'term-links'; for (const [name, value] of Object.entries(target.node)) { const button = document.createElement('button'); button.type = 'button'; button.textContent = `${name}${typeof value === 'object' ? '/' : ''}`; button.addEventListener('click', () => { const path = `/Vect/${[...target.parts, name].join('/')}`; if (typeof value === 'object') execute(`cd ${path}`); else execute(`cat ${path}`); }); links.append(button); } output.append(links); } break;
    }
    case 'cd': { const target = resolvePath(arg || '/Vect'); if (!target || typeof target.node !== 'object') output.append(line(`cd: 找不到目录 ${arg}`, 'entry-error')); else { cwd = target.parts; updatePrompt(); } break; }
    case 'tree': { const pre = document.createElement('pre'); pre.textContent = `/Vect\n${treeLines(root).join('\n')}`; output.append(pre); break; }
    case 'cat': { if (!arg) output.append(line('用法：cat 文件名.md', 'entry-error')); else { const target = resolvePath(arg); if (!target || typeof target.node !== 'string') output.append(line(`cat: 找不到文件 ${arg}`, 'entry-error')); else output.append(terminalArticle(target.node)); } break; }
    case 'who': if (arg.toLowerCase() === 'am i') output.append(terminalArticle('about')); else output.append(line('未知命令。输入 help 查看可用命令。', 'entry-error')); break;
    case 'whoami': output.append(terminalArticle('about')); break;
    case 'clear': terminalHistory.replaceChildren(); break;
    default: output.append(line('未知命令。输入 help 查看可用命令。', 'entry-error'));
  }
  entry.append(commandLine, output); terminalHistory.append(entry); terminalHistory.scrollTop = terminalHistory.scrollHeight;
  $('#terminal-status').textContent = cmd === 'clear' ? 'SCREEN CLEARED' : `LAST COMMAND / ${cmd.toUpperCase()}`;
}
$('#terminal-form').addEventListener('submit', (event) => { event.preventDefault(); const value = input.value; if (value.trim()) { commandHistory.push(value); historyPosition = commandHistory.length; execute(value); input.value = ''; } input.focus(); });
function completeInput() {
  const before = input.value.slice(0, input.selectionStart ?? input.value.length);
  const after = input.value.slice(input.selectionEnd ?? input.value.length);
  if (after.trim()) return;
  const commandMatch = before.match(/^(\s*)([^\s]*)$/);
  if (commandMatch) {
    const commands = ['ls', 'cd', 'pwd', 'tree', 'cat', 'who am i', 'help', 'clear'];
    const matches = commands.filter((command) => command.startsWith(commandMatch[2]));
    if (matches.length !== 1) return;
    input.value = `${commandMatch[1]}${matches[0]} ${after}`;
    input.setSelectionRange(input.value.length - after.length, input.value.length - after.length);
    return;
  }
  const pathMatch = before.match(/^(\s*(?:ls|cd|cat)\s+)(\S*)$/);
  if (!pathMatch) return;
  const command = pathMatch[1].trim().split(/\s+/)[0];
  const typedPath = pathMatch[2];
  const slash = typedPath.lastIndexOf('/');
  const parentPath = slash < 0 ? '.' : typedPath.slice(0, slash) || '/';
  const fragment = typedPath.slice(slash + 1);
  const parent = resolvePath(parentPath);
  if (!parent || typeof parent.node !== 'object') return;
  const matches = Object.entries(parent.node).filter(([name, value]) => name.startsWith(fragment) && (command !== 'cd' || typeof value === 'object') && (command !== 'cat' || typeof value === 'string'));
  if (matches.length !== 1) return;
  const [name, value] = matches[0];
  const completed = `${typedPath.slice(0, slash + 1)}${name}${typeof value === 'object' ? '/' : ''}`;
  input.value = `${pathMatch[1]}${completed}${after}`;
  const caret = pathMatch[1].length + completed.length;
  input.setSelectionRange(caret, caret);
}
input.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') { event.preventDefault(); completeInput(); }
  if (event.key === 'ArrowUp') { event.preventDefault(); historyPosition = Math.max(0, historyPosition - 1); input.value = commandHistory[historyPosition] || ''; }
  if (event.key === 'ArrowDown') { event.preventDefault(); historyPosition = Math.min(commandHistory.length, historyPosition + 1); input.value = commandHistory[historyPosition] || ''; }
});
terminalPaper.addEventListener('click', (event) => { if (!(event.target as HTMLElement).closest('button,a,input')) input.focus(); });

const sky = $<HTMLCanvasElement>('#sky');
const context = sky.getContext('2d')!;
let stars: { x: number; y: number; r: number; a: number; speed: number }[] = [];
let pointer = { x: -1000, y: -1000 };
let shooting: { x: number; y: number; life: number } | null = null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function resizeSky() { const dpr = Math.min(devicePixelRatio, 2); sky.width = innerWidth * dpr; sky.height = innerHeight * dpr; sky.style.width = `${innerWidth}px`; sky.style.height = `${innerHeight}px`; context.setTransform(dpr, 0, 0, dpr, 0, 0); stars = Array.from({ length: Math.min(190, Math.round(innerWidth * innerHeight / 6200)) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: .45 + Math.random() * 1.3, a: .2 + Math.random() * .6, speed: .2 + Math.random() * .8 })); }
resizeSky(); addEventListener('resize', resizeSky); addEventListener('pointermove', (event) => { pointer = { x: event.clientX, y: event.clientY }; });
let frame = 0;
function drawSky() { frame++; context.clearRect(0, 0, innerWidth, innerHeight); const quiet = document.body.classList.contains('reading'); const motion = reduceMotion ? 0 : quiet ? .2 : 1; for (const star of stars) { const dx = star.x - pointer.x, dy = star.y - pointer.y, near = Math.hypot(dx, dy) < 100; if (motion) { star.x += (near ? dx / (Math.hypot(dx, dy) || 1) * .65 : .06) * motion; star.y += (near ? dy / (Math.hypot(dx, dy) || 1) * .65 : .015) * motion; if (star.x > innerWidth) star.x = 0; if (star.y > innerHeight) star.y = 0; } context.beginPath(); context.fillStyle = `rgba(228,236,255,${quiet ? star.a * .23 : star.a * (.75 + Math.sin(frame * .01 * star.speed) * .23)})`; context.arc(star.x, star.y, star.r, 0, Math.PI * 2); context.fill(); } if (!reduceMotion && !quiet && !shooting && Math.random() < .0025) shooting = { x: Math.random() * innerWidth * .8, y: Math.random() * innerHeight * .4, life: 0 }; if (shooting) { shooting.life++; const { x, y, life } = shooting; const fade = Math.max(0, 1 - life / 45); const gradient = context.createLinearGradient(x + life * 9 - 100, y + life * 4.5 - 50, x + life * 9, y + life * 4.5); gradient.addColorStop(0, 'rgba(255,255,255,0)'); gradient.addColorStop(1, `rgba(235,239,255,${fade})`); context.strokeStyle = gradient; context.lineWidth = 1.7; context.beginPath(); context.moveTo(x + life * 9 - 100, y + life * 4.5 - 50); context.lineTo(x + life * 9, y + life * 4.5); context.stroke(); if (life > 45) shooting = null; } requestAnimationFrame(drawSky); }
drawSky();

const titleCanvas = $<HTMLCanvasElement>('#particle-title');
const titleContext = titleCanvas.getContext('2d')!;
let particles: { x: number; y: number; sx: number; sy: number; tx: number; ty: number; vx: number; vy: number; phase: number }[] = [];
let titlePointer = { x: -1000, y: -1000 };
let titleStart = performance.now();
function setupTitle() {
  const rect = titleCanvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const dpr = Math.min(devicePixelRatio, 2);
  titleCanvas.width = rect.width * dpr; titleCanvas.height = rect.height * dpr;
  titleContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  const off = document.createElement('canvas'); off.width = Math.ceil(rect.width); off.height = Math.ceil(rect.height);
  const ctx = off.getContext('2d')!;
  const text = 'Hello, world!';
  ctx.font = '500 100px DM Sans, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText(text);
  const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  ctx.translate(rect.width / 2, rect.height / 2);
  ctx.scale(rect.width * .94 / inkWidth, rect.height * .9 / inkHeight);
  ctx.fillText(text, (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2, (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const data = ctx.getImageData(0, 0, off.width, off.height).data;
  const step = Math.max(2, Math.round(rect.width / 330));
  particles = [];
  for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step)
    if (data[(y * off.width + x) * 4 + 3] > 90 && Math.random() < .94)
      particles.push({ x: Math.random() * rect.width, y: Math.random() * rect.height, sx: 0, sy: 0, tx: x, ty: y, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 });
  for (const p of particles) { p.sx = p.x; p.sy = p.y; }
  titleStart = performance.now();
}
document.fonts.ready.then(setupTitle); addEventListener('resize', setupTitle);
titleCanvas.addEventListener('pointermove', (event) => { const rect = titleCanvas.getBoundingClientRect(); titlePointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }; });
titleCanvas.addEventListener('pointerleave', () => { titlePointer = { x: -1000, y: -1000 }; });
function drawTitle(now: number) {
  const rect = titleCanvas.getBoundingClientRect();
  titleContext.clearRect(0, 0, rect.width, rect.height);
  const elapsed = now - titleStart;
  const progress = reduceMotion ? 1 : Math.min(1, elapsed / 2800);
  const eased = 1 - Math.pow(1 - progress, 3);
  for (const p of particles) {
    const dx = p.x - titlePointer.x, dy = p.y - titlePointer.y, dist = Math.hypot(dx, dy);
    const force = progress === 1 && dist < 90 ? (90 - dist) / 90 * .8 : 0;
    const sway = progress === 1 && !reduceMotion ? 2.2 : 0;
    const targetX = p.tx + Math.sin(now * .005 + p.phase) * sway;
    const targetY = p.ty + Math.cos(now * .0057 + p.phase) * sway;
    if (progress < 1) { p.x = p.sx + (p.tx - p.sx) * eased; p.y = p.sy + (p.ty - p.sy) * eased; }
    else { p.vx += (targetX - p.x) * .08 + (dx / (dist || 1)) * force; p.vy += (targetY - p.y) * .08 + (dy / (dist || 1)) * force; p.vx *= .73; p.vy *= .73; p.x += p.vx; p.y += p.vy; }
    if (reduceMotion) { p.x = p.tx; p.y = p.ty; }
    titleContext.beginPath(); titleContext.fillStyle = 'rgba(226,232,245,.88)'; titleContext.arc(p.x, p.y, 1.05, 0, Math.PI * 2); titleContext.fill();
  }
  requestAnimationFrame(drawTitle);
}
drawTitle();
const typed = $('#typed');
const greeting = 'Hello, world!';
if (reduceMotion) typed.textContent = greeting;
else { let i = 0; const timer = setInterval(() => { typed.textContent = greeting.slice(0, ++i); if (i === greeting.length) clearInterval(timer); }, 95); }
if (location.hash === '#terminal') setMode('terminal'); else if (location.hash === '#web') setMode('web');

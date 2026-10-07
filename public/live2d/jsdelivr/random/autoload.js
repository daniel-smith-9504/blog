// UtDebug 鲁棒 polyfill — 使用 getter/setter 防止被 live2d.min.js 覆盖
(function() {
  var _debug = {
    error: function() { console.warn.apply(console, arguments); },
    log:   function() { console.log.apply(console, arguments); },
    warn:  function() { console.warn.apply(console, arguments); }
  };
  try {
    Object.defineProperty(window, 'UtDebug', {
      get: function() { return _debug; },
      set: function(v) {
        // 允许 live2d.min.js 写入，但合并保留 fallback 方法
        if (v && typeof v === 'object') {
          _debug.error = typeof v.error === 'function' ? v.error.bind(v) : _debug.error;
          _debug.log   = typeof v.log   === 'function' ? v.log.bind(v)   : _debug.log;
          _debug.warn  = typeof v.warn  === 'function' ? v.warn.bind(v)  : _debug.warn;
        }
      },
      configurable: true
    });
  } catch(e) {
    window.UtDebug = _debug;
  }
})();

// 全局兜底：防止 live2d 模型加载失败时 startMotion / setExpression 报 null 崩溃
window.addEventListener('error', function(e) {
  var msg = e.message || '';
  if (msg.includes('startMotion') || msg.includes('setExpression') || msg.includes('setRandomExpression')) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}, true);

// 注意：live2d_path 参数应使用绝对路径
const live2d_path = '/live2d/';

// 封装异步加载资源的方法
function loadExternalResource(url, type) {
  return new Promise((resolve, reject) => {
    let tag;
    if (type === 'css') {
      tag = document.createElement('link');
      tag.rel = 'stylesheet';
      tag.href = url;
    } else if (type === 'js') {
      tag = document.createElement('script');
      tag.src = url;
    }
    if (tag) {
      tag.onload = () => resolve(url);
      tag.onerror = () => reject(url);
      document.head.appendChild(tag);
    }
  });
}

// 设置默认模型为 za/zastavam21_2104/normal (index 20)
if (!localStorage.getItem("modelId")) {
  localStorage.setItem("modelId", "20");
  localStorage.setItem("modelTexturesId", "0");
}

// 加载 waifu.css live2d.min.js waifu-tips.js
if (screen.width >= 768) {
  Promise.all([
    loadExternalResource(live2d_path + 'css/right.css', 'css'),
    loadExternalResource(live2d_path + 'live2d.min.js', 'js'),
    loadExternalResource(live2d_path + 'jsdelivr/random/waifu-tips.js?v=4', 'js'),
  ]).then(() => {
    // 配置选项的具体用法见 README.md
    initWidget({
      waifuPath: live2d_path + 'waifu-tips.json',

      // apiPath: "https://live2d.fghrsh.net/api/",
      cdnPath: live2d_path,

      tools: [
        'hitokoto',
        'asteroids',
        'switch-model',
        'switch-texture',
        'photo',
        'info',
        'quit',
      ],
    });
  });
}

console.log(`
  く__,.ヘヽ.        /  ,ー､ 〉
           ＼ ', !-─‐-i  /  /´
           ／｀ｰ'       L/／｀ヽ､
         /   ／,   /|   ,   ,       ',
       ｲ   / /-‐/  ｉ  L_ ﾊ ヽ!   i
        ﾚ ﾍ 7ｲ｀ﾄ   ﾚ'ｧ-ﾄ､!ハ|   |
          !,/7 '0'     ´0iソ|    |
          |.从"    _     ,,,, / |./    |
          ﾚ'| i＞.､,,__  _,.イ /   .i   |
            ﾚ'| | / k_７_/ﾚ'ヽ,  ﾊ.  |
              | |/i 〈|/   i  ,.ﾍ |  i  |
             .|/ /  ｉ：    ﾍ!    ＼  |
              kヽ>､ﾊ    _,.ﾍ､    /､!
              !'〈//｀Ｔ´', ＼ ｀'7'ｰr'
              ﾚ'ヽL__|___i,___,ンﾚ|ノ
                  ﾄ-,/  |___./
                  'ｰ'    !_,.:
`);

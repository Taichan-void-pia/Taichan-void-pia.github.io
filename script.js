const areas = [
    {name: "Project-Nexus", img: "img/areaA.png", link: "https://nemonowa.github.io/"},
    {name: "LanahiroMOD", img: "img/areaB.png", link: "area2.html"},
    {name: "Home", img: "img/areaC.png", link: "area3.html"},
    {name: "IdleGame", img: "img/areaC.png", link: "page/idlegame.html"}
];

let currentArea = 0;

// 音をすぐ鳴らす処理
function playButtonSound() {
    const sound = document.getElementById('button-sound');
    sound.currentTime = 0;  // 連続押し対応
    sound.play();
}

// エリア切り替え処理
function changeArea(direction) {
    playButtonSound();

    const img = document.getElementById('area-image');
    const areaName = document.getElementById('area-name');

    // フェードアウト開始
    img.style.opacity = '0';

    setTimeout(() => {
        currentArea = (currentArea + direction + areas.length) % areas.length;

        img.src = areas[currentArea].img;
        areaName.textContent = areas[currentArea].name;

        // フェードイン
        img.style.opacity = '1';
    }, 800); // フェードアウト後に画像切替
}

// 移動ボタン押下時処理
function moveToPage() {
    playButtonSound();
    window.location.href = "page/warp.html?target="+areas[currentArea].link;
}


// 生成する光の数（必要に応じて変更）
    const numLights = 300;
    const bodyEl = document.body;

    // min～maxの間でランダムな数値を生成する関数
    function random(min, max) {
      return Math.random() * (max - min) + min;
    }

    for (let i = 0; i < numLights; i++) {
      const light = document.createElement('div');
      light.className = 'light';

      // 中心からの初期オフセットをランダムに設定（例：-600px～600px）
      const offsetX = random(-600, 600);
      const offsetY = random(-600, 600);
      light.style.setProperty('--start-x', offsetX + 'px');
      light.style.setProperty('--start-y', offsetY + 'px');

      // アニメーション開始のタイミングをランダムに（例：0～5秒）
      const delay = random(0, 5);
      light.style.animationDelay = delay + 's';

      bodyEl.appendChild(light);
    }

const areas = [
    {name: "エリア1", img: "img/areaA.jpg", link: "area1.html"},
    {name: "エリア2", img: "img/areaB.jpg", link: "area2.html"},
    {name: "エリア3", img: "img/areaC.jpg", link: "area3.html"}
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
    window.location.href = areas[currentArea].link;
}

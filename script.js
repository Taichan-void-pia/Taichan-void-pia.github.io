const areas = [
    {name: "エリア1", img: "img/areaA.jpg", link: "area1.html"},
    {name: "エリア2", img: "img/areaB.jpg", link: "area2.html"},
    {name: "エリア3", img: "img/areaC.jpg", link: "area3.html"}
];

let currentArea = 0;

function changeArea(direction) {
    const sound = document.getElementById('button-sound');
    sound.play();

    const img = document.getElementById('area-image');
    const areaName = document.getElementById('area-name');

    // フェードアウト
    img.style.opacity = '0';

    setTimeout(() => {
        currentArea = (currentArea + direction + areas.length) % areas.length;
        img.src = areas[currentArea].img;
        areaName.textContent = areas[currentArea].name;

        // フェードイン
        img.style.opacity = '1';
    }, 800); // フェードアウト後に画像切替
}

function moveToPage() {
    const sound = document.getElementById('button-sound');
    sound.play();

    const targetPage = areas[currentArea].link;
    setTimeout(() => {
        window.location.href = targetPage;
    }, 200); // 音が鳴った後で遷移
}

const areas = [
    { name: 'エリアA', image: 'img/areaA.png', link: 'areaA.html' },
    { name: 'エリアB', image: 'img/areaB.png', link: 'areaB.html' },
    { name: 'エリアC', image: 'img/areaC.png', link: 'areaC.html' }
];

let currentIndex = 0;

function updateAreaDisplay() {
    const area = areas[currentIndex];
    document.getElementById('area-image').src = area.image;
    document.getElementById('area-name').textContent = area.name;
    document.getElementById('go-button').onclick = () => goToPage(area.link);
}

function goToPage(url) {
    document.body.classList.add('fade-out');
    setTimeout(() => {
        window.location.href = url;
    }, 800);
}

// 左右ボタンのイベント
document.querySelector('.left-button').addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + areas.length) % areas.length;
    updateAreaDisplay();
});

document.querySelector('.right-button').addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % areas.length;
    updateAreaDisplay();
});

// 初期表示
updateAreaDisplay();

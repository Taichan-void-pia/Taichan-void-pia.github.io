const links = {
    top: 'system.html',       // 上端はシステム設定
    bottom: 'credits.html',   // 下端はクレジット
    left: 'world.html',       // 左端は世界観
    right: 'menu.html'        // 右端はエリアメニュー
};

// 各ボタンにクリックイベント設定
document.querySelector('.top-button').addEventListener('click', () => goToPage(links.top));
document.querySelector('.bottom-button').addEventListener('click', () => goToPage(links.bottom));
document.querySelector('.left-button').addEventListener('click', () => goToPage(links.left));
document.querySelector('.right-button').addEventListener('click', () => goToPage(links.right));

// 通常リンクにも遷移アニメーション付与（必要なら）
document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = link.getAttribute('href');
        if (target.startsWith('#') || target.startsWith('javascript')) return;

        e.preventDefault();
        goToPage(target);
    });
});

// ページ遷移処理
function goToPage(url) {
    document.body.classList.add('fade-out');
    setTimeout(() => {
        window.location.href = url;
    }, 800);
}

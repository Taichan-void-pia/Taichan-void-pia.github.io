const links = {
    top: 'system.html',
    bottom: 'credits.html',
    left: 'world.html',
    right: 'menu.html'
};

document.querySelector('.top-button').addEventListener('click', () => goToPage(links.top));
document.querySelector('.bottom-button').addEventListener('click', () => goToPage(links.bottom));
document.querySelector('.left-button').addEventListener('click', () => goToPage(links.left));
document.querySelector('.right-button').addEventListener('click', () => goToPage(links.right));

function goToPage(url) {
    document.body.classList.add('fade-out');
    setTimeout(() => {
        window.location.href = url;
    }, 800);
}

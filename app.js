document.addEventListener('DOMContentLoaded', () => {
    console.log('Afia initialized.');

    const exploreBtn = document.getElementById('exploreBtn');
    
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            alert('Welcome to Afia! More features coming soon.');
        });
    }
});

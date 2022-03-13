const signInBtn = document.querySelector('#sign-in');
const signOutBtn = document.querySelector('#sign-out');

signInBtn.addEventListener('click', async () => {
    window.location.href = '/login';
});

signOutBtn.addEventListener('click', async () => {
    window.location.href = '/logout';
});
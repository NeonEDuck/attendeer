// import { auth } from './firebase-config.js';
// import { signOut } from 'firebase/auth';

// const loginBtn = document.querySelector('#loginBtn');
// const logoutBtn = document.querySelector('#logoutBtn');

// loginBtn?.addEventListener('click', () => {
//     window.location.assign('/login');
// });

// logoutBtn?.addEventListener('click', async () => {
//     document.cookie = 'jwt=';
//     signOut(auth);
//     await fetch('/login/sessionLogout', {
//         method: 'POST',
//         credentials: 'include',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//     }).then((msg) => {
//         console.log(msg);
//     });
//     window.location.assign('/');
// });
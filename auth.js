// Simple client-side auth for demo. Do NOT use in production.
const loginBtn = document.getElementById('loginBtn');


// seed demo user if missing
if(!localStorage.getItem('tony_users')){
const demo = { 'ayush':'thakur' };
localStorage.setItem('tony_users', JSON.stringify(demo));
}


function getUsers(){ return JSON.parse(localStorage.getItem('tony_users') || '{}'); }


loginBtn?.addEventListener('click', ()=>{
const u = document.getElementById('username').value.trim();
const p = document.getElementById('password').value;
if(!u || !p){ alert('Enter username and password'); return; }
const users = getUsers();
if(users[u] && users[u] === p){
// set session
localStorage.setItem('tony_session', JSON.stringify({user:u,ts:Date.now()}));
location.href = 'main.html';
} else {
alert('Invalid credentials');
}
});

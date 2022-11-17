
document.addEventListener('DOMContentLoaded', () =>
  requestAnimationFrame(updateTime)
)

// document.onreadystatechange = () => {
//   requestAnimationFrame(updateTime)
//   setInterval(() => {
//     requestAnimationFrame(updateTime)
//   }, 100)
// }

function updateTime() {
  const now = new Date();
  document.documentElement.style.setProperty('--timer-day', "'" + now.toLocaleString('en-us', {weekday:'short'}) + "'");
  document.documentElement.style.setProperty('--timer-hours', "'" + now.getHours() + "'");
  document.documentElement.style.setProperty('--timer-minutes', "'" + now.getMinutes() + "'");
  document.documentElement.style.setProperty('--timer-seconds', "'" + now.getSeconds() + "'");
  requestAnimationFrame(updateTime);
}

const audio1 = new Audio("./idle2.mp3");
const buttons1 = document.querySelectorAll(".toggle-sidebar");

const audio2 = new Audio("./minecraftportal.mp3");
const homeButton = document.querySelector("#icon-home");

const toggleBtn = document.querySelector('.sidebar .toggle-sidebar');
const sidebar = document.querySelector('.sidebar');

toggleBtn.addEventListener('click', function () {
    sidebar.classList.toggle('hide')
})

buttons1.forEach(button => {
  button.addEventListener("click", () => {
    audio1.play();
  });
});

homeButton.addEventListener("click", () => {
  audio2.play();
});

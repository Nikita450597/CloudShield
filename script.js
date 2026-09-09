const button = document.getElementById("testBtn");
const status = document.getElementById("status");

button.addEventListener("click", () => {
    status.textContent = "CloudShield is working!";
});
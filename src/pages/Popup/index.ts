/* eslint-disable prettier/prettier */
import serverLogin from "../Content/modules/utils/auth-provider";

/* eslint-disable prettier/prettier */
console.log("popup is live");

function handleLogin(event: Event): void {
    console.log("handleLogin function triggered");
    event.preventDefault(); // Prevents the form from submitting and refreshing the page
  
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const passwordInput = document.getElementById("password") as HTMLInputElement | null;
  
    if (emailInput && passwordInput) {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
  
      console.log("Email:", email);
      console.log("Password:", password);
  
      serverLogin(email,password);
      
    } else {
      console.error("Email or password input elements not found.");
    }
}
  
  // Attach the event listener to the form
  document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm") as HTMLFormElement | null;
  
    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    } else {
      console.error("Login form not found.");
    }
  });
  
  export { handleLogin };
  
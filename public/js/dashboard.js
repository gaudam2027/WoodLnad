const navLinks = document.querySelectorAll("aside nav ul li a");
const currentPath = window.location.pathname.split('?')[0].split('#')[0].replace(/\/$/, "");

navLinks.forEach(link => {
  const href = link.getAttribute("href").replace(/\/$/, ""); // Normalize href path

  if (currentPath === href) {
    link.classList.add("text-blue-600", "bg-blue-50", "font-semibold", "border", "p-2", "rounded");
    link.classList.remove("text-gray-700");
  } else {
    link.classList.remove("text-blue-600", "bg-blue-50", "font-semibold", "border", "p-2", "rounded");
    link.classList.add("text-gray-700");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  console.log("Navigation script loaded");

  // Find the nav-placeholder element
  const navPlaceholder = document.getElementById("nav-placeholder");

  if (!navPlaceholder) {
    console.error("Error: nav-placeholder element not found");
    return;
  }

  console.log("Nav placeholder found");

  // Modified: Use nav_bar.html instead of nav_bar_content.html
  fetch("../00_Nav_Bar/nav_bar.html")
    .then((response) => {
      console.log("Fetch response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then((data) => {
      console.log("Navigation html loaded");

      // Extract the navigation bar content
      // We need to extract just the navigation bar part from the complete HTML document
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, "text/html");
      const navBar = doc.querySelector(".nav-bar");

      if (navBar) {
        console.log("Navigation bar found in HTML");
        // Insert the navigation bar content
        navPlaceholder.innerHTML = navBar.outerHTML;
        console.log("Navigation bar content inserted");

        // Highlight the current page
        highlightCurrentPage();
      } else {
        console.error("Could not find .nav-bar in the loaded HTML");
        // Provide fallback content
        navPlaceholder.innerHTML =
          '<div class="nav-bar"><div class="nav-title">London CycleNet</div></div>';
      }
    })
    .catch((error) => {
      console.error("Error loading navigation bar:", error);
      // Fallback content in case of failure
      navPlaceholder.innerHTML =
        '<div class="nav-bar"><div class="nav-title">London CycleNet</div></div>';
    });
});

// Function to highlight the current page in the navigation
function highlightCurrentPage() {
  // Get the current page path
  const currentPath = window.location.pathname;
  console.log("Current path:", currentPath);

  // Find all navigation links
  const navLinks = document.querySelectorAll(".nav-links a");
  console.log("Found nav links:", navLinks.length);

  // Check each link to see if it matches the current page
  navLinks.forEach((link) => {
    const linkPath = link.getAttribute("href");
    console.log("Checking link:", linkPath);

    // If the link href is in the current path
    if (currentPath.includes(linkPath) && linkPath !== "#") {
      console.log("Match found, highlighting:", linkPath);
      // Add visual indication
      link.style.fontWeight = "700";
      link.style.textDecoration = "underline";
    }
  });
}

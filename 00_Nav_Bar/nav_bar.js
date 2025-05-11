document.addEventListener("DOMContentLoaded", () => {
  console.log("Navigation script loaded");

  // Find the nav-placeholder element
  const navPlaceholder = document.getElementById("nav-placeholder");

  if (!navPlaceholder) {
    console.error("Error: nav-placeholder element not found");
    return;
  }

  console.log("Nav placeholder found");

  // Check if we're on the index page or a subpage
  const path = window.location.pathname;
  let navBarPath;

  // If we're on index.html or the root path
  if (path.endsWith("index.html") || path.endsWith("/") || path === "") {
    navBarPath = "./00_Nav_Bar/nav_bar.html"; // Path from root
  } else {
    navBarPath = "../00_Nav_Bar/nav_bar.html"; // Path from subpages
  }

  console.log("Using nav bar path:", navBarPath);

  fetch(navBarPath)
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
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, "text/html");
      const navBar = doc.querySelector(".nav-bar");

      if (navBar) {
        console.log("Navigation bar found in HTML");

        // Adjust links based on current path
        const links = navBar.querySelectorAll(".nav-links a");
        const isRoot =
          path.endsWith("index.html") || path.endsWith("/") || path === "";

        if (isRoot) {
          // If we're on the root page, change "../index.html" to "./index.html", etc.
          links.forEach((link) => {
            let href = link.getAttribute("href");
            if (href.startsWith("../")) {
              href = "." + href.substring(2); // Change "../" to "./"
              link.setAttribute("href", href);
            }
          });
        }
        // For subpages, keep the "../" prefix as it is

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

    // Extract the page name from the path for more reliable matching
    const currentPageName = currentPath.split("/").pop();
    const linkPageName = linkPath.split("/").pop();

    // If the current path contains the link's path or page name
    if (currentPath.includes(linkPageName)) {
      console.log("Match found, highlighting:", linkPath);
      // Add visual indication
      link.style.fontWeight = "700";
      link.style.textDecoration = "underline";
    }

    // Special case for index page
    if (
      (currentPath.endsWith("/") || currentPath.endsWith("index.html")) &&
      linkPath.includes("index.html")
    ) {
      link.style.fontWeight = "700";
      link.style.textDecoration = "underline";
    }
  });
}

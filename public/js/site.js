(function () {
  const header = document.querySelector("#masthead");
  const trigger = document.querySelector(".nav-trigger");
  const navigation = document.querySelector(".site-nav");
  const progress = document.querySelector("#scroll-progress");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function handleScroll() {
    header.classList.toggle("is-solid", window.scrollY > 45);
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = available ? (window.scrollY / available) * 100 : 0;
    progress.style.width = `${percentage}%`;
  }

  function closeMenu() {
    trigger.setAttribute("aria-expanded", "false");
    navigation.classList.remove("open");
    document.body.classList.remove("menu-shown");
  }

  trigger.addEventListener("click", () => {
    const open = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!open));
    navigation.classList.toggle("open", !open);
    document.body.classList.toggle("menu-shown", !open);
  });

  navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 840) closeMenu();
  });
  handleScroll();

  const reveals = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((element) => element.classList.add("in"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((element) => observer.observe(element));
  }

  if (!reducedMotion) {
    document.querySelectorAll('a[href^="/"]:not([target])').forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || link.pathname === window.location.pathname) {
          return;
        }
        event.preventDefault();
        document.body.classList.add("leaving");
        window.setTimeout(() => {
          window.location.href = link.href;
        }, 310);
      });
    });
  }
})();

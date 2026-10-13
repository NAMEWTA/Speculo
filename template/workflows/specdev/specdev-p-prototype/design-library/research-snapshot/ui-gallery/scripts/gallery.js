(function () {
  const root = document.documentElement;
  const body = document.body;
  const savedTheme = localStorage.getItem("ui-gallery-theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    root.classList.add("dark");
  }

  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    }
  }

  function updateThemeLabels() {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const dark = root.classList.contains("dark");
      button.setAttribute("aria-label", dark ? "切换到浅色主题" : "切换到深色主题");
      button.setAttribute("title", dark ? "浅色主题" : "深色主题");
      button.innerHTML = `<i data-lucide="${dark ? "sun" : "moon"}"></i>`;
    });
    refreshIcons();
  }

  document.addEventListener("click", (event) => {
    const themeButton = event.target.closest("[data-theme-toggle]");
    if (themeButton) {
      root.classList.toggle("dark");
      localStorage.setItem("ui-gallery-theme", root.classList.contains("dark") ? "dark" : "light");
      updateThemeLabels();
      return;
    }

    const tokenButton = event.target.closest("[data-token-toggle]");
    if (tokenButton) {
      const drawer = document.querySelector(".token-drawer");
      if (drawer) {
        const open = drawer.classList.toggle("open");
        tokenButton.setAttribute("aria-expanded", String(open));
      }
      return;
    }

    const drawerClose = event.target.closest("[data-token-close]");
    if (drawerClose) {
      document.querySelector(".token-drawer")?.classList.remove("open");
      document.querySelector("[data-token-toggle]")?.setAttribute("aria-expanded", "false");
      return;
    }

    const drawerButton = event.target.closest("[data-sidebar-toggle]");
    if (drawerButton) {
      const drawer = document.querySelector(".sidebar.drawer");
      if (drawer) {
        const open = drawer.classList.toggle("open");
        drawerButton.setAttribute("aria-expanded", String(open));
      }
      return;
    }

    const densityButton = event.target.closest("[data-density]");
    if (densityButton) {
      const density = densityButton.dataset.density;
      body.classList.remove("density-compact", "density-default", "density-comfortable");
      body.classList.add(`density-${density}`);
      document.querySelectorAll("[data-density]").forEach((button) => {
        button.classList.toggle("active", button === densityButton);
      });
      return;
    }

    const tab = event.target.closest("[data-tab-target]");
    if (tab) {
      const group = tab.closest("[data-tabs]") || document;
      group.querySelectorAll("[data-tab-target]").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tabTarget;
      document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.tabPanel !== target;
      });
      return;
    }

    const navRow = event.target.closest(".nav-row");
    if (navRow && !navRow.closest("a")) {
      navRow.parentElement?.querySelectorAll(".nav-row").forEach((row) => row.classList.remove("active"));
      navRow.classList.add("active");
    }

    const sendButton = event.target.closest("[data-send]");
    if (sendButton) {
      const composer = sendButton.closest(".composer") || document;
      const textarea = composer.querySelector("textarea");
      if (textarea && textarea.value.trim()) {
        sendButton.innerHTML = '<i data-lucide="loader-circle"></i>';
        sendButton.classList.add("is-loading");
        textarea.value = "";
        setTimeout(() => {
          sendButton.innerHTML = '<i data-lucide="arrow-up"></i>';
          sendButton.classList.remove("is-loading");
          refreshIcons();
        }, 900);
        refreshIcons();
      }
    }

    const approval = event.target.closest("[data-approval]");
    if (approval) {
      const card = approval.closest(".approval-card");
      if (card) {
        card.dataset.state = approval.dataset.approval;
        card.querySelector(".approval-actions")?.remove();
        const status = document.createElement("div");
        status.className = `approval-result ${approval.dataset.approval}`;
        status.textContent = approval.dataset.approval === "allow" ? "已允许本次操作" : "已拒绝操作";
        card.appendChild(status);
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelector(".token-drawer")?.classList.remove("open");
      document.querySelector(".sidebar.drawer")?.classList.remove("open");
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    updateThemeLabels();
    refreshIcons();
  });
})();

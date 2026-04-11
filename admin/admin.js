import { ROUTES } from "./nav.js";
import { $, el, setConnPill, setNotice, setSaveState, setTitle } from "./lib/dom.js";
import { readState, writeState } from "./lib/state.js";
import { loadCms, login as apiLogin, saveCms } from "./lib/api.js";
import { parseHash } from "./lib/router.js";
import { placeholder } from "./screens/common.js";
import { dashboardScreen } from "./screens/dashboard.js";
import { postsListScreen, postEditScreen } from "./screens/posts.js";
import { productsListScreen, productEditScreen } from "./screens/products.js";
import { pagesScreen } from "./screens/pages.js";
import { toolsScreen } from "./screens/tools.js";
import { mediaScreen } from "./screens/media.js";
import { settingsScreen } from "./screens/settings.js";

function buildNav(activeHref) {
  const nav = $("nav");
  if (!nav) return;
  nav.innerHTML = "";

  for (const r of ROUTES) {
    const a = el("a", {
      class: "wp-nav__item",
      href: r.href,
      "aria-current": r.href === activeHref ? "page" : null
    });
    if (r.disabled) {
      a.setAttribute("aria-disabled", "true");
      a.addEventListener("click", (event) => {
        event.preventDefault();
        setNotice("Mục này chỉ mô phỏng giao diện WordPress, chưa dùng cho website hiện tại.", "info");
      });
    }
    a.appendChild(el("div", { class: "wp-nav__icon", text: r.icon }));
    a.appendChild(el("div", { class: "wp-nav__text", text: r.label }));
    nav.appendChild(a);
  }
}

async function bootstrap() {
  const app = $("app");
  const btnSave = $("btn-save");
  const btnMobileMenu = $("btn-mobile-menu");
  const sidebar = document.querySelector(".wp-sidebar");
  const mobileOverlay = $("mobile-overlay");

  const apiBaseInput = $("api-base");
  const widgetKeyInput = $("widget-key");
  const adminPasswordInput = $("admin-password");
  const loginStatus = $("login-status");
  const settingsModal = $("settings-modal");

  let state = readState();
  let cmsData = {};
  let updatedAt = null;
  let dirty = false;

  apiBaseInput.value = state.apiBase;
  widgetKeyInput.value = state.widgetKey;

  const setData = (next) => {
    cmsData = next && typeof next === "object" && !Array.isArray(next) ? next : {};
    dirty = true;
    setSaveState("Chưa lưu");
  };

  const setRoute = (href) => {
    location.hash = href;
  };

  const openSettings = () => {
    settingsModal.hidden = false;
    settingsModal.setAttribute("aria-hidden", "false");
  };
  const closeSettings = () => {
    settingsModal.hidden = true;
    settingsModal.setAttribute("aria-hidden", "true");
  };

  const closeSidebar = () => {
    sidebar?.classList.remove("open");
    if (mobileOverlay) mobileOverlay.hidden = true;
  };
  const toggleSidebar = () => {
    if (!sidebar) return;
    const nextOpen = !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", nextOpen);
    if (mobileOverlay) mobileOverlay.hidden = !nextOpen;
  };

  $("btn-settings")?.addEventListener("click", openSettings);
  settingsModal?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest("[data-close=\"1\"]")) closeSettings();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSettings();
      closeSidebar();
    }
  });

  btnMobileMenu?.addEventListener("click", toggleSidebar);
  mobileOverlay?.addEventListener("click", closeSidebar);
  window.addEventListener("hashchange", closeSidebar);

  async function ensureWidgetKey() {
    if (!state.widgetKey) {
      setConnPill("bad", "Thiếu widget key");
      openSettings();
      throw new Error("Thiếu widget key");
    }
  }

  async function loadCurrent() {
    await ensureWidgetKey();
    const res = await loadCms(state);
    cmsData = res.data || {};
    updatedAt = res.updatedAt || null;
    dirty = false;
    setSaveState(updatedAt ? `Đã lưu • ${updatedAt}` : "Chưa có nội dung");
  }

  async function saveCurrent() {
    await ensureWidgetKey();
    if (!dirty) {
      setNotice("Không có thay đổi để lưu.", "info");
      return;
    }
    setNotice("Đang lưu...");
    const res = await saveCms(state, cmsData);
    updatedAt = res.updatedAt || null;
    dirty = false;
    setNotice("Đã lưu.", "ok");
    setSaveState(updatedAt ? `Đã lưu • ${updatedAt}` : "Đã lưu");
  }

  $("btn-save-settings")?.addEventListener("click", () => {
    state = writeState({
      apiBase: apiBaseInput.value,
      widgetKey: widgetKeyInput.value.trim()
    });
    apiBaseInput.value = state.apiBase;
    widgetKeyInput.value = state.widgetKey;
    loginStatus.textContent = "Đã lưu.";
    closeSettings();
  });

  $("btn-login")?.addEventListener("click", async () => {
    try {
      state = writeState({
        apiBase: apiBaseInput.value,
        widgetKey: widgetKeyInput.value.trim()
      });
      loginStatus.textContent = "Đang đăng nhập...";
      const token = await apiLogin(state, adminPasswordInput.value);
      state = writeState({ token });
      loginStatus.textContent = "Đã đăng nhập.";
      adminPasswordInput.value = "";
      closeSettings();
      await loadCurrent();
      render();
    } catch (err) {
      loginStatus.textContent = String(err?.message || err);
    }
  });

  $("btn-logout")?.addEventListener("click", () => {
    state = writeState({ token: "" });
    loginStatus.textContent = "Đã đăng xuất.";
  });

  btnSave?.addEventListener("click", async () => {
    try {
      await saveCurrent();
    } catch (err) {
      setNotice(String(err?.message || err), "error");
    }
  });

  function render() {
    if (!app) return;
    const { route, params } = parseHash();
    const activeHref = `#/${route === "dashboard" ? "" : route.split("_")[0]}`.replace(/\/$/, "");
    buildNav(activeHref || "#/");
    app.innerHTML = "";
    setNotice("");

    if (route === "dashboard") {
      setTitle("Dashboard");
      app.appendChild(dashboardScreen({ data: cmsData, updatedAt }));
      return;
    }
    if (route === "posts") {
      setTitle("Bài viết");
      app.appendChild(postsListScreen({ data: cmsData, setData, setRoute }));
      return;
    }
    if (route === "posts_edit") {
      setTitle("Sửa bài viết");
      app.appendChild(postEditScreen({ data: cmsData, postId: params.id, setData, setRoute }));
      return;
    }
    if (route === "products") {
      setTitle("Sản phẩm");
      app.appendChild(productsListScreen({ data: cmsData, setData, setRoute }));
      return;
    }
    if (route === "products_edit") {
      setTitle("Sửa sản phẩm");
      app.appendChild(productEditScreen({ data: cmsData, productId: params.id, setData, setRoute }));
      return;
    }
    if (route === "pages") {
      setTitle("Trang");
      app.appendChild(pagesScreen({ data: cmsData, setData }));
      return;
    }
    if (route === "media") {
      setTitle("Media");
      app.appendChild(mediaScreen());
      return;
    }
    if (route === "tools") {
      setTitle("Công cụ");
      app.appendChild(toolsScreen({ data: cmsData, setData }));
      return;
    }
    if (route === "settings") {
      setTitle("Cài đặt");
      app.appendChild(settingsScreen({ openSettings }));
      return;
    }

    const label = ROUTES.find((r) => r.id === route)?.label || "Mục";
    setTitle(label);
    app.appendChild(placeholder(label));
  }

  window.addEventListener("hashchange", () => render());

  try {
    if (!state.widgetKey) {
      setConnPill("bad", "Chưa cấu hình");
      openSettings();
    } else {
      await loadCurrent();
      setConnPill("ok", "Đang kết nối");
    }
  } catch (err) {
    setConnPill("bad", "Lỗi kết nối");
    setNotice(String(err?.message || err), "error");
    openSettings();
  } finally {
    render();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  setNotice(String(err?.message || err), "error");
});

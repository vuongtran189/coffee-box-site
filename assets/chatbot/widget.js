(function () {
  "use strict";

  var WIDGET_VERSION = "0.1.0";
  var STORAGE_KEY = "vibe_chatbot_state_v1";
  var MAX_LOCAL_MESSAGES = 50;

  function nowIso() {
    return new Date().toISOString();
  }

  function safeText(v) {
    return String(v == null ? "" : v);
  }

  function clamp(s, maxLen) {
    return safeText(s).trim().slice(0, maxLen);
  }

  function createEl(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") el.className = attrs[k];
        else if (k === "text") el.textContent = attrs[k];
        else el.setAttribute(k, attrs[k]);
      });
    }
    return el;
  }

  function injectCssOnce(href, id) {
    if (document.getElementById(id)) return;
    var link = createEl("link", { rel: "stylesheet", href: href, id: id });
    document.head.appendChild(link);
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_e) {}
  }

  function createId() {
    // Basic UUIDv4 fallback.
    var s = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return s;
  }

  function httpJson(url, opts) {
    return fetch(url, opts).then(function (res) {
      return res
        .json()
        .catch(function () {
          return null;
        })
        .then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
    });
  }

  function buildEmbedHelp(apiBaseUrl, widgetKey) {
    var base = apiBaseUrl.replace(/\/$/, "");
    return (
      "VÃ­ dá»¥ nhÃºng widget:\n" +
      '<script src="' +
      base +
      '/widget.js"></script>\n' +
      "<script>\n" +
      "  window.VibeChatbot.init({ apiBaseUrl: '" +
      base +
      "', widgetKey: '" +
      (widgetKey || "YOUR_WIDGET_KEY") +
      "' });\n" +
      "</script>"
    );
  }

  function init(userOptions) {
    var options = userOptions || {};
    if (!options.apiBaseUrl) {
      throw new Error("VibeChatbot.init requires { apiBaseUrl }");
    }

    if (!document.body) {
      document.addEventListener("DOMContentLoaded", function () {
        init(userOptions);
      });
      return;
    }

    if (window.__VIBE_CHATBOT_MOUNTED__) return;
    window.__VIBE_CHATBOT_MOUNTED__ = true;

    var apiBaseUrl = String(options.apiBaseUrl).replace(/\/$/, "");
    var widgetKey = options.widgetKey ? String(options.widgetKey) : "";
    var locale = options.locale ? String(options.locale) : "vi";
    var position = options.position === "left" ? "left" : "right";

    var cssUrl = options.cssUrl ? String(options.cssUrl) : apiBaseUrl + "/widget.css";
    injectCssOnce(cssUrl, "vibe-chatbot-css");

    var state =
      loadState() || {
        visitor_id: null,
        conversation_id: null,
        messages: []
      };

    function headers() {
      var h = { "Content-Type": "application/json" };
      if (widgetKey) h["x-widget-key"] = widgetKey;
      return h;
    }

    var root = createEl("div", { class: "vibe-chatbot-root vibe-chatbot-root--" + position });
    var launcher = createEl("button", {
      class: "vibe-chatbot-launcher",
      type: "button",
      "aria-label": "Má»Ÿ chat tÆ° váº¥n Vibe Coffee"
    });
    launcher.innerHTML =
      '<span class="vibe-chatbot-launcher__dot" aria-hidden="true"></span>' +
      '<span class="vibe-chatbot-launcher__label">TÆ° váº¥n</span>';

    var panel = createEl("div", { class: "vibe-chatbot-panel", role: "dialog", "aria-hidden": "true" });
    panel.innerHTML =
      '<div class="vibe-chatbot-header">' +
      '  <div class="vibe-chatbot-header__title">Vibe Coffee</div>' +
      '  <div class="vibe-chatbot-header__sub">TÆ° váº¥n nhanh</div>' +
      '  <button class="vibe-chatbot-header__close" type="button" aria-label="ÄÃ³ng">Ã—</button>' +
      "</div>" +
      '<div class="vibe-chatbot-body" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<div class="vibe-chatbot-quick"></div>' +
      '<form class="vibe-chatbot-form" autocomplete="off">' +
      '  <input class="vibe-chatbot-input" name="message" placeholder="Nháº­p cÃ¢u há»i..." />' +
      '  <button class="vibe-chatbot-send" type="submit" aria-label="Gá»­i">âž¤</button>' +
      "</form>";

    var bodyEl = panel.querySelector(".vibe-chatbot-body");
    var quickEl = panel.querySelector(".vibe-chatbot-quick");
    var inputEl = panel.querySelector(".vibe-chatbot-input");
    var closeBtn = panel.querySelector(".vibe-chatbot-header__close");

    function scrollToBottom() {
      if (!bodyEl) return;
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function renderBubble(role, text, meta) {
      var wrap = createEl("div", {
        class: "vibe-chatbot-msg vibe-chatbot-msg--" + (role === "user" ? "user" : "bot")
      });
      var bubble = createEl("div", { class: "vibe-chatbot-bubble" });
      bubble.textContent = text;
      wrap.appendChild(bubble);

      if (meta && meta.ts) {
        var time = createEl("div", { class: "vibe-chatbot-time" });
        time.textContent = meta.ts;
        wrap.appendChild(time);
      }

      bodyEl.appendChild(wrap);
      scrollToBottom();
    }

    function renderSystemNotice(text) {
      var el = createEl("div", { class: "vibe-chatbot-notice" });
      el.textContent = text;
      bodyEl.appendChild(el);
      scrollToBottom();
    }

    function renderTyping(on) {
      var id = "vibe-chatbot-typing";
      var existing = panel.querySelector("#" + id);
      if (on) {
        if (existing) return;
        var wrap = createEl("div", { class: "vibe-chatbot-msg vibe-chatbot-msg--bot", id: id });
        var bubble = createEl("div", { class: "vibe-chatbot-bubble vibe-chatbot-bubble--typing" });
        bubble.innerHTML =
          '<span class="vibe-chatbot-dot"></span><span class="vibe-chatbot-dot"></span><span class="vibe-chatbot-dot"></span>';
        wrap.appendChild(bubble);
        bodyEl.appendChild(wrap);
        scrollToBottom();
      } else {
        if (existing) existing.remove();
      }
    }

    function setQuickReplies(items) {
      quickEl.innerHTML = "";
      if (!items || !items.length) return;

      items.slice(0, 4).forEach(function (it) {
        var btn = createEl("button", { type: "button", class: "vibe-chatbot-chip" });
        btn.textContent = it.text || it.label || "";
        btn.addEventListener("click", function () {
          sendUserMessage(btn.textContent);
        });
        quickEl.appendChild(btn);
      });
    }

    function persistLocalMessage(role, text) {
      state.messages = Array.isArray(state.messages) ? state.messages : [];
      state.messages.push({ role: role, text: text, ts: nowIso() });
      if (state.messages.length > MAX_LOCAL_MESSAGES) {
        state.messages = state.messages.slice(-MAX_LOCAL_MESSAGES);
      }
      saveState(state);
    }

    function replayLocalHistory() {
      if (!state.messages || !state.messages.length) {
        renderBubble("assistant", "ChÃ o báº¡n! MÃ¬nh lÃ  trá»£ lÃ½ tÆ° váº¥n cá»§a Vibe Coffee. Báº¡n muá»‘n xem giÃ¡ hay tÆ° váº¥n chá»n vá»‹ áº¡?");
        return;
      }

      state.messages.forEach(function (m) {
        renderBubble(m.role, m.text);
      });
    }

    function openPanel() {
      panel.setAttribute("aria-hidden", "false");
      panel.style.display = "flex";
      launcher.setAttribute("aria-expanded", "true");
      setTimeout(function () {
        if (inputEl) inputEl.focus();
      }, 0);
    }

    function closePanel() {
      panel.setAttribute("aria-hidden", "true");
      panel.style.display = "none";
      launcher.setAttribute("aria-expanded", "false");
    }

    function ensureSession() {
      if (state.visitor_id && state.conversation_id) return Promise.resolve(state);

      var payload = {
        visitor_id: state.visitor_id || null,
        page_url: location.href,
        referrer: document.referrer || null,
        locale: locale
      };

      return httpJson(apiBaseUrl + "/v1/widget/init", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok || !r.body) throw new Error("init_failed");
        state.visitor_id = r.body.visitor_id || state.visitor_id || createId();
        state.conversation_id = r.body.conversation_id || state.conversation_id || null;
        saveState(state);
        setQuickReplies(r.body.quick_replies || []);
        return state;
      });
    }

    function sendUserMessage(text) {
      var message = clamp(text, 2000);
      if (!message) return;

      renderBubble("user", message);
      persistLocalMessage("user", message);
      if (inputEl) inputEl.value = "";

      renderTyping(true);

      ensureSession()
        .then(function () {
          return httpJson(apiBaseUrl + "/v1/chat", {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({
              visitor_id: state.visitor_id,
              conversation_id: state.conversation_id,
              message: { text: message },
              context: { page_url: location.href }
            })
          });
        })
        .then(function (r) {
          renderTyping(false);

          if (!r.ok) {
            renderSystemNotice("ChÆ°a gá»­i Ä‘Æ°á»£c. Báº¡n thá»­ láº¡i giÃºp mÃ¬nh nhÃ©.");
            return;
          }

          var assistantText = safeText(r.body && r.body.assistant && r.body.assistant.text);
          if (!assistantText) assistantText = "MÃ¬nh Ä‘Ã£ nháº­n Ä‘Æ°á»£c. Báº¡n cho mÃ¬nh thÃªm thÃ´ng tin Ä‘á»ƒ tÆ° váº¥n ká»¹ hÆ¡n nhÃ©?";

          renderBubble("assistant", assistantText);
          persistLocalMessage("assistant", assistantText);
        })
        .catch(function () {
          renderTyping(false);
          renderSystemNotice("Káº¿t ná»‘i cÃ³ váº¥n Ä‘á». Báº¡n thá»­ láº¡i hoáº·c gá»i hotline 0908858522 nhÃ©.");
        });
    }

    launcher.addEventListener("click", function () {
      var isOpen = panel.getAttribute("aria-hidden") === "false";
      if (isOpen) closePanel();
      else openPanel();
    });
    closeBtn.addEventListener("click", closePanel);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.getAttribute("aria-hidden") === "false") {
        closePanel();
      }
    });

    panel.querySelector(".vibe-chatbot-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = inputEl ? inputEl.value : "";
      sendUserMessage(v);
    });

    root.appendChild(launcher);
    root.appendChild(panel);
    document.body.appendChild(root);

    closePanel();
    replayLocalHistory();

    // Optionally pre-init in the background.
    if (options.preload === true) {
      ensureSession().catch(function () {});
    }

    if (options.debug === true) {
      // eslint-disable-next-line no-console
      console.log("[VibeChatbot] mounted v" + WIDGET_VERSION);
      // eslint-disable-next-line no-console
      console.log(buildEmbedHelp(apiBaseUrl, widgetKey));
    }
  }

  window.VibeChatbot = {
    init: init,
    version: WIDGET_VERSION
  };
})();


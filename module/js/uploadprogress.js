/**
 * uploadprogress.js
 * Intercepts Dolibarr file-upload forms and shows a fixed bottom-of-screen
 * progress bar. Each concurrent upload gets its own stacked row.
 * Uses XHR upload.onprogress - no PHP extension required.
 */
(function () {
    "use strict";

    if (window.__uploadProgressInit) return;
    window.__uploadProgressInit = true;

    var DEBUG = window.UPLOADPROGRESS_DEBUG || false;
    function log() {
        if (!DEBUG) return;
        var args = Array.prototype.slice.call(arguments);
        args.unshift("[UploadProgress]");
        console.log.apply(console, args);
    }

    var container = null;
    var seq = 0;

    function getContainer() {
        if (container) return container;
        container = document.createElement("div");
        container.id = "uploadprogress-container";
        container.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:99999;"
            + "background:#1c2233;color:#e8eaf6;"
            + "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;"
            + "display:none;flex-direction:column;"
            + "box-shadow:0 -3px 16px rgba(0,0,0,0.45);border-top:2px solid #3d5afe;";
        document.body.appendChild(container);
        return container;
    }

    function createRow(label) {
        var id = "upr-" + (++seq);
        var row = document.createElement("div");
        row.id = id;
        row.style.cssText = "padding:10px 18px 12px;border-top:1px solid rgba(255,255,255,0.07);";

        var hdr = document.createElement("div");
        hdr.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;";

        var nameEl = document.createElement("span");
        nameEl.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:75%;opacity:0.9;";
        nameEl.textContent = label;

        var pctEl = document.createElement("span");
        pctEl.style.cssText = "font-weight:600;font-size:12px;min-width:44px;text-align:right;";
        pctEl.textContent = "0%";

        hdr.appendChild(nameEl);
        hdr.appendChild(pctEl);

        var track = document.createElement("div");
        track.style.cssText = "background:rgba(255,255,255,0.12);border-radius:6px;height:5px;overflow:hidden;";

        var fill = document.createElement("div");
        fill.style.cssText = "height:100%;width:0%;background:#3d5afe;border-radius:6px;transition:width 0.12s ease;";

        track.appendChild(fill);
        row.appendChild(hdr);
        row.appendChild(track);

        return { id: id, row: row, fill: fill, pctEl: pctEl };
    }

    function showRow(r) {
        var c = getContainer();
        c.appendChild(r.row);
        c.style.display = "flex";
    }

    function updateRow(r, pct, done, error) {
        if (error) {
            r.fill.style.background = "#ef5350";
            r.pctEl.textContent = "Error";
            r.row.style.opacity = "0.7";
            setTimeout(function () { removeRow(r); }, 3500);
            return;
        }
        r.fill.style.width = pct + "%";
        r.pctEl.textContent = done ? "done" : pct + "%";
        if (done) {
            r.fill.style.background = "#00c853";
            setTimeout(function () { removeRow(r); }, 1400);
        }
    }

    function removeRow(r) {
        var el = document.getElementById(r.id);
        if (el) el.remove();
        var c = getContainer();
        if (!c.querySelector("[id^='upr-']")) c.style.display = "none";
    }

    function submitViaXhr(form, label) {
        var r = createRow(label);
        showRow(r);

        var xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", function (e) {
            if (e.lengthComputable) {
                var pct = Math.round((e.loaded / e.total) * 100);
                log("progress", r.id, pct + "%");
                updateRow(r, pct, false, false);
            }
        });

        xhr.addEventListener("load", function () {
            log("load", r.id, xhr.status, xhr.responseURL);
            updateRow(r, 100, true, false);
            var dest = xhr.responseURL || "";
            setTimeout(function () {
                if (dest && dest !== window.location.href) {
                    window.location.href = dest;
                } else {
                    window.location.reload();
                }
            }, 700);
        });

        xhr.addEventListener("error", function () { updateRow(r, 0, false, true); });
        xhr.addEventListener("abort", function () { updateRow(r, 0, false, true); });

        var action = form.getAttribute("action") || window.location.href;
        var method = (form.getAttribute("method") || "POST").toUpperCase();
        xhr.open(method, action, true);
        xhr.send(new FormData(form));
        log("started", label, method, action);
    }

    function labelFromInput(input) {
        var files = input.files;
        if (!files || !files.length) return null;
        return files.length === 1 ? files[0].name : files.length + " files";
    }

    function attachToForm(form) {
        if (form.__upAttached) return;
        form.__upAttached = true;

        form.addEventListener("submit", function (e) {
            var input = form.querySelector("input[type='file']");
            if (!input) return;
            var label = labelFromInput(input);
            if (!label) { log("no file selected, normal submit"); return; }
            e.preventDefault();
            log("intercepted", label);
            submitViaXhr(form, label);
        });

        log("attached", form.id || form.getAttribute("action") || "(form)");
    }

    function scanForms() {
        var forms = document.querySelectorAll("form");
        for (var i = 0; i < forms.length; i++) {
            if (forms[i].querySelector("input[type='file']")) attachToForm(forms[i]);
        }
    }

    function init() {
        scanForms();

        if (window.MutationObserver) {
            new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var added = mutations[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (node.nodeType !== 1) continue;
                        if (node.tagName === "FORM" && node.querySelector("input[type='file']")) {
                            attachToForm(node);
                        }
                        if (node.querySelectorAll) {
                            var nested = node.querySelectorAll("form");
                            for (var k = 0; k < nested.length; k++) {
                                if (nested[k].querySelector("input[type='file']")) attachToForm(nested[k]);
                            }
                        }
                    }
                }
            }).observe(document.body, { childList: true, subtree: true });
            log("MutationObserver active");
        }

        log("initialized");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());

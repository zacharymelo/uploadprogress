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
        // Colours come from the active Dolibarr theme's CSS variables (fallbacks = eldy defaults).
        container.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:99999;"
            + "background:var(--colorbackbody, #fff);color:var(--colortext, #000);"
            + "font-family:inherit;font-size:inherit;"
            + "display:none;flex-direction:column;"
            + "box-shadow:0 -2px 8px rgba(0,0,0,0.15);border-top:2px solid var(--colorbackhmenu1, #3c4664);";
        document.body.appendChild(container);
        return container;
    }

    function createRow(label) {
        var id = "upr-" + (++seq);
        var row = document.createElement("div");
        row.id = id;
        row.style.cssText = "padding:10px 18px 12px;border-top:1px solid var(--colorboxstatsborder, #e0e0e0);";

        var hdr = document.createElement("div");
        hdr.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;";

        var nameEl = document.createElement("span");
        nameEl.className = "opacitymedium";
        nameEl.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:75%;";
        nameEl.textContent = label;

        var pctEl = document.createElement("span");
        pctEl.style.cssText = "font-weight:600;min-width:44px;text-align:right;";
        pctEl.textContent = "0%";

        hdr.appendChild(nameEl);
        hdr.appendChild(pctEl);

        // Dolibarr's own progress bar classes (theme/<theme>/progress.inc.php).
        var track = document.createElement("div");
        track.className = "progress progress-sm";

        var fill = document.createElement("div");
        fill.className = "progress-bar progress-bar-primary";
        fill.style.width = "0%";

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

    function updateRow(r, pct, done, error, msg) {
        if (error) {
            r.fill.className = "progress-bar progress-bar-danger";
            r.fill.style.width = "100%";
            r.pctEl.textContent = "Error";
            r.row.style.opacity = "0.7";
            if (msg) {
                r.row.querySelector("span").textContent = msg;
            }
            setTimeout(function () { removeRow(r); }, 5000);
            return;
        }
        r.fill.style.width = pct + "%";
        r.pctEl.textContent = done ? "done" : pct + "%";
        if (done) {
            r.fill.className = "progress-bar progress-bar-success";
            setTimeout(function () { removeRow(r); }, 1400);
        }
    }

    function removeRow(r) {
        var el = document.getElementById(r.id);
        if (el) el.remove();
        var c = getContainer();
        if (!c.querySelector("[id^='upr-']")) c.style.display = "none";
    }

    // Display the page the server returned for the upload instead of requesting it again.
    // A reload/GET would lose one-time output already consumed by the XHR
    // (event messages, post-deploy prompts, etc).
    function renderResponse(html, url) {
        if (url && window.history && window.history.replaceState) {
            try { window.history.replaceState(null, "", url); } catch (e) { log("replaceState failed", e); }
        }
        // document.open() keeps the same window, so let the new page's copy of this script re-init.
        window.__uploadProgressInit = false;
        container = null;
        document.open();
        document.write(html);
        document.close();
    }

    // FormData(form) leaves out the button that submitted the form, but Dolibarr
    // keys on it: document/photo uploads only run when "sendit" is in the POST
    // (core/actions_linkedfiles.inc.php). Add it back the way a normal submit would.
    function buildFormData(form, submitter) {
        var fd = new FormData(form);
        if (submitter && submitter.name && !submitter.disabled) {
            if ((submitter.type || "").toLowerCase() === "image") {
                fd.append(submitter.name + ".x", "0");
                fd.append(submitter.name + ".y", "0");
            } else {
                fd.append(submitter.name, submitter.value || "");
            }
        }
        return fd;
    }

    function submitViaXhr(form, label, submitter) {
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

            // Treat anything outside 2xx/3xx as a server-side failure.
            // status === 0 means PHP killed the connection (e.g. post_max_size exceeded).
            if (xhr.status === 0 || xhr.status >= 400) {
                var msg = xhr.status === 0
                    ? "Upload failed — file may exceed the server size limit"
                    : "Server error (" + xhr.status + ")";
                updateRow(r, 0, false, true, msg);
                return;
            }

            updateRow(r, 100, true, false);
            var dest = xhr.responseURL || "";
            var ctype = xhr.getResponseHeader("Content-Type") || "";
            setTimeout(function () {
                if (ctype.indexOf("text/html") !== -1 && xhr.responseText) {
                    renderResponse(xhr.responseText, dest);
                } else if (dest && dest !== window.location.href) {
                    window.location.href = dest;
                } else {
                    window.location.reload();
                }
            }, 700);
        });

        xhr.addEventListener("error", function () {
            updateRow(r, 0, false, true, "Network error during upload");
        });
        xhr.addEventListener("abort", function () {
            updateRow(r, 0, false, true, "Upload cancelled");
        });

        var action = form.getAttribute("action") || window.location.href;
        var method = (form.getAttribute("method") || "POST").toUpperCase();
        xhr.open(method, action, true);
        xhr.send(buildFormData(form, submitter));
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

        // Fallback for browsers without SubmitEvent.submitter: remember the last clicked submit button.
        form.addEventListener("click", function (e) {
            var t = e.target && e.target.closest ? e.target.closest("button, input") : null;
            if (t && t.form === form && /^(submit|image)$/i.test(t.type || "")) form.__upSubmitter = t;
        }, true);

        form.addEventListener("submit", function (e) {
            var submitter = e.submitter || form.__upSubmitter || null;
            form.__upSubmitter = null;
            // A Cancel button with a file still selected should not be shown as an upload.
            if (submitter && submitter.name === "cancel") return;
            var input = form.querySelector("input[type='file']");
            if (!input) return;
            var label = labelFromInput(input);
            if (!label) { log("no file selected, normal submit"); return; }
            e.preventDefault();
            log("intercepted", label, submitter ? submitter.name : "(no submitter)");
            submitViaXhr(form, label, submitter);
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

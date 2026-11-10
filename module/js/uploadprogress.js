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

    // CKEditor writes its text back into the form's textarea from its own submit listener on the form,
    // which may not have run yet: copy it now, or the POST carries the text the page was loaded with.
    function syncEditors(form) {
        var ck = window.CKEDITOR;
        if (!ck || !ck.instances) return;
        Object.keys(ck.instances).forEach(function (name) {
            var ed = ck.instances[name];
            try {
                if (ed.element && ed.element.$ && form.contains(ed.element.$)) ed.updateElement();
            } catch (e) { log("CKEditor sync failed", name, e); }
        });
    }

    // The returned page loads CKEditor again, but ckeditor.js keeps the old global when it finds one, with its
    // instances and its "skin already loaded" state, while document.open() has dropped the skin's styles:
    // the new editor comes up broken. Remove the old copy so the page starts a fresh one.
    function resetEditors() {
        var ck = window.CKEDITOR;
        if (!ck) return;
        try {
            Object.keys(ck.instances || {}).forEach(function (name) { ck.instances[name].destroy(true); });
        } catch (e) { log("CKEditor destroy failed", e); }
        window.CKEDITOR = undefined;
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
        resetEditors();
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
        syncEditors(form);
        xhr.send(buildFormData(form, submitter));
        log("started", label, method, action);
    }

    function labelFromForm(form) {
        var names = [];
        var inputs = form.querySelectorAll("input[type='file']");
        for (var i = 0; i < inputs.length; i++) {
            var files = inputs[i].disabled ? null : inputs[i].files;
            for (var j = 0; files && j < files.length; j++) names.push(files[j].name);
        }
        if (!names.length) return null;
        return names.length === 1 ? names[0] : names.length + " files";
    }

    // One listener on the document, not on each form: submit bubbles here after the page's own submit listeners
    // on the form (CKEditor's, validation), so a submit one of them cancelled stays cancelled. Forms added later
    // (dialogs, AJAX) need no extra wiring.
    function init() {
        // Fallback for browsers without SubmitEvent.submitter: remember the last clicked submit button.
        document.addEventListener("click", function (e) {
            var t = e.target && e.target.closest ? e.target.closest("button, input") : null;
            if (t && t.form && /^(submit|image)$/i.test(t.type || "")) t.form.__upSubmitter = t;
        }, true);

        document.addEventListener("submit", function (e) {
            var form = e.target;
            if (!form || form.tagName !== "FORM") return;
            var submitter = e.submitter || form.__upSubmitter || null;
            form.__upSubmitter = null;
            if (e.defaultPrevented) { log("submit cancelled by the page"); return; }
            // A Cancel button with a file still selected should not be shown as an upload.
            if (submitter && submitter.name === "cancel") return;
            // A target other than the page itself (a new tab, an iframe) gets the normal submit
            var target = (submitter && submitter.getAttribute("formtarget")) || form.getAttribute("target") || "";
            if (target && target !== "_self") return;
            var label = labelFromForm(form);
            if (!label) { log("no file selected, normal submit"); return; }
            e.preventDefault();
            log("intercepted", label, submitter ? submitter.name : "(no submitter)");
            submitViaXhr(form, label, submitter);
        });

        log("initialized");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());

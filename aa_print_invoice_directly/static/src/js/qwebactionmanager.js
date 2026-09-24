/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { getReportUrl } from "@web/webclient/actions/reports/utils";
import { markup } from "@odoo/owl";

const WKHTMLTOPDF_LINK = '<br><br><a href="http://wkhtmltopdf.org/" target="_blank">wkhtmltopdf.org</a>';

// Cached (per page load) state of wkhtmltopdf, so the check is done only once.
let wkhtmltopdfStatusProm;
let upgradeNoticeShown = false;

// Single hidden iframe reused for every print job, and the blob url it currently holds.
let printIframe;
let printBlobUrl;

/**
 * Builds the url of the pdf report, exactly like the standard "download" flow does:
 * the user context (lang, tz, allowed_company_ids...) is merged with the action context
 * and is sent to the controller, so multi-company / multi-language reports render the
 * same content as when they are downloaded.
 */
function getPdfUrl(action, env) {
    const context = { ...env.services.user.context, ...(action.context || {}) };
    let url = getReportUrl({ ...action, context }, "pdf");
    if (!url.includes("?")) {
        url += `?context=${encodeURIComponent(JSON.stringify(context))}`;
    }
    return url;
}

/**
 * Fetches the pdf and returns it as a blob url.
 * Throws when the server did not answer with a real PDF (server error, access error...),
 * so we never send an error page to the printer.
 */
async function fetchPdfBlobUrl(url) {
    const response = await fetch(url, { credentials: "same-origin" });
    const contentType = response.headers.get("Content-Type") || "";
    if (!response.ok || !contentType.includes("application/pdf")) {
        throw new Error(`Unable to get the PDF report (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
}

/**
 * Loads the pdf in the hidden iframe and opens the browser print dialog.
 * Resolves once the print dialog has been requested.
 */
function printBlobUrlInIframe(blobUrl) {
    return new Promise((resolve, reject) => {
        if (!printIframe) {
            printIframe = document.createElement("iframe");
            printIframe.className = "pdfIframe";
            printIframe.style.display = "none";
            document.body.appendChild(printIframe);
        }
        // release the previous pdf only now: it is no longer displayed by the iframe
        const previousBlobUrl = printBlobUrl;
        printBlobUrl = blobUrl;
        // Safety net: never leave the UI blocked if the browser does not fire the load event.
        const loadTimeout = setTimeout(() => {
            printIframe.onload = null;
            reject(new Error("Timeout while loading the PDF in the print frame"));
        }, 20000);
        // a fresh handler for every job (a handler set only once would keep the first job's data)
        printIframe.onload = () => {
            clearTimeout(loadTimeout);
            printIframe.onload = null;
            setTimeout(() => {
                try {
                    printIframe.focus();
                    printIframe.contentWindow.print();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 100);
        };
        printIframe.src = blobUrl;
        if (previousBlobUrl) {
            URL.revokeObjectURL(previousBlobUrl);
        }
    });
}

async function getWkhtmltopdfStatus(env) {
    if (!wkhtmltopdfStatusProm) {
        wkhtmltopdfStatusProm = env.services.rpc("/report/check_wkhtmltopdf").catch((error) => {
            wkhtmltopdfStatusProm = undefined; // allow a retry on the next print
            throw error;
        });
    }
    return wkhtmltopdfStatusProm;
}

registry
    .category("ir.actions.report handlers")
    .add("pdf_invoice_print_handler", async function (action, options, env) {
        const printOption = action.default_print_option || "print";
        // Only PDF reports are concerned, and "download" is the standard Odoo behaviour.
        if (action.report_type !== "qweb-pdf" || printOption === "download") {
            return false;
        }

        let status;
        try {
            status = await getWkhtmltopdfStatus(env);
        } catch {
            return false; // let the standard flow deal with it
        }
        if (!["upgrade", "ok"].includes(status)) {
            // wkhtmltopdf is missing/broken or Odoo has no workers: return false so the
            // standard flow shows its own message and falls back to the HTML report.
            return false;
        }
        if (status === "upgrade" && !upgradeNoticeShown) {
            upgradeNoticeShown = true;
            env.services.notification.add(
                markup(
                    _t(
                        "You should upgrade your version of Wkhtmltopdf to at least 0.12.0 in order to get a correct display of headers and footers as well as support for table-breaking between pages."
                    ) + WKHTMLTOPDF_LINK
                ),
                { sticky: true, title: _t("Report") }
            );
        }

        const url = getPdfUrl(action, env);
        env.services.ui.block();
        try {
            if (printOption === "open") {
                window.open(url);
            } else {
                const blobUrl = await fetchPdfBlobUrl(url);
                try {
                    await printBlobUrlInIframe(blobUrl);
                } catch {
                    // the browser refused to print from the hidden frame: show the pdf instead
                    window.open(blobUrl);
                }
            }
        } catch (error) {
            console.warn(error);
            // Could not produce the PDF: return false so the standard download flow runs and
            // shows the real server error to the user instead of printing an error page.
            return false;
        } finally {
            env.services.ui.unblock();
        }

        // Same post-processing as the standard report flow.
        if (action.close_on_report_download) {
            await env.services.action.doAction(
                { type: "ir.actions.act_window_close" },
                { onClose: options.onClose }
            );
        } else if (options.onClose) {
            options.onClose();
        }
        return true;
    });

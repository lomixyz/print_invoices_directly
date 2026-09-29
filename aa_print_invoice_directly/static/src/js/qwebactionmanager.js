/** @odoo-module **/

import { registry } from "@web/core/registry";
import { getReportUrl } from "@web/webclient/actions/reports/utils";
import { user } from "@web/core/user";

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
    const context = { ...user.context, ...(action.context || {}) };
    let url = getReportUrl({ ...action, context }, "pdf");
    if (!url.includes("?")) {
        url += `?context=${encodeURIComponent(JSON.stringify(context))}`;
    }
    return url;
}

/**
 * Fetches the pdf and returns it as a blob url.
 * Throws when the server did not answer with a real PDF (server error, access error,
 * wkhtmltopdf missing/broken...), so we never send an error page to the printer - the
 * standard Odoo flow then takes over and shows the real error to the user.
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

registry
    .category("ir.actions.report handlers")
    .add("pdf_invoice_print_handler", async function (action, options, env) {
        const printOption = action.default_print_option || "print";
        // Only PDF reports are concerned, and "download" is the standard Odoo behaviour.
        if (action.report_type !== "qweb-pdf" || printOption === "download") {
            return false;
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

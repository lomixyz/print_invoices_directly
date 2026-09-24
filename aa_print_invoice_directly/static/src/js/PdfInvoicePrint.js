/** @odoo-module */

import { _t } from "@web/core/l10n/translation";
import { Dialog } from "@web/core/dialog/dialog";
import { Component } from "@odoo/owl";

export class PdfInvoicePrint extends Component {
    setup() {
        this.title = _t("Printing Loading.......");
    }
    executePdfAction(option) {
        this.props.onSelectOption(option);
    }
}

PdfInvoicePrint.template = "aa_print_invoice_directly.ButtonOptions";
PdfInvoicePrint.components = { Dialog };
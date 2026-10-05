# -*- coding: utf-8 -*-
{
    'name': 'Print Invoice Directly',
    'version': '20.0.1.0.5',
    'summary': 'Print invoices and PDF reports directly from the browser, without downloading the file first.',
    'description': """
Print Invoice Directly
======================
* Opens the browser print dialog immediately when a PDF report (invoice, ...) is clicked.
* Per-report option (Reports > Advanced tab): print directly, open in a new tab, or download (Odoo default).
* Falls back automatically to the standard Odoo behaviour if wkhtmltopdf is not available or the PDF cannot be generated.

NOTE ON THIS 20.0 BUILD: three confirmed fixes vs the 17.0 code, all
found from real errors on a live Odoo 20 install, not guessed:
1) env.services.rpc no longer exists in Odoo 20 (it must be imported
   as a standalone rpc() function from "@web/core/network/rpc").
2) the "/report/check_wkhtmltopdf" controller route itself returns a
   404 on Odoo 20 - it has been removed. The pre-flight wkhtmltopdf
   status check has been dropped entirely for this build; the module
   now simply tries to fetch the PDF report directly and falls back
   automatically to Odoo's standard download flow (showing the real
   server error) if that fetch fails for any reason.
3) env.services.user no longer exists in Odoo 20 either (it must be
   imported as a standalone "user" object from "@web/core/user").

This 20.0 build's technical module name is the same as the 17.0 build
(aa_print_invoice_directly) - matching how Odoo's own official modules
never encode the Odoo series in the technical name, only in the
manifest 'version' field. Keep the 17.0 and 20.0 builds in separate
addons paths / git branches, never installed side by side under the
same name on one database.
    """,
    'author': 'Allam Bushra',
    'category': 'Tools',
    'website': 'https://www.linkedin.com/in/lomixyz/',
    'depends': ['web'],
    'data': [
        'views/ir_actions_report.xml',
    ],
    'images': ['static/description/banner.png'],
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
    'assets': {
        'web.assets_backend': [
            'aa_print_invoice_directly/static/src/js/PdfInvoicePrint.js',
            'aa_print_invoice_directly/static/src/js/qwebactionmanager.js',
            'aa_print_invoice_directly/static/src/**/*.xml'
        ]
    }
}

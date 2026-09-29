# -*- coding: utf-8 -*-
{
    'name': 'Print Invoice Directly',
    'version': '17.0.1.1.1',
    'summary': 'Print invoices and PDF reports directly from the browser, without downloading the file first.',
    'description': """
Print Invoice Directly
======================
* Opens the browser print dialog immediately when a PDF report (invoice, ...) is clicked.
* Per-report option (Reports > Advanced tab): print directly, open in a new tab, or download (Odoo default).
* Falls back automatically to the standard Odoo behaviour if wkhtmltopdf is not available or the PDF cannot be generated.
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

# -*- coding: utf-8 -*-

from odoo import fields, models


class IrActionsReportXml(models.Model):
    _inherit = 'ir.actions.report'

    default_print_option = fields.Selection(
        selection=[
            ('print', 'Print Directly'),
            ('open', 'Open in a New Tab'),
            ('download', 'Download (Odoo default)'),
        ],
        string='Default Print Option',
        default='print',
        help="How this PDF report is handled when the user clicks on it:\n"
             "- Print Directly: the browser print dialog opens immediately, nothing is downloaded.\n"
             "- Open in a New Tab: the PDF is displayed in a new browser tab.\n"
             "- Download: standard Odoo behaviour, the PDF file is downloaded.",
    )

    def _get_readable_fields(self):
        data = super()._get_readable_fields()
        data.add('default_print_option')
        return data

    def report_action(self, docids, data=None, config=True):
        data = super().report_action(docids, data, config)
        data['id'] = self.id
        data['default_print_option'] = self.default_print_option
        return data

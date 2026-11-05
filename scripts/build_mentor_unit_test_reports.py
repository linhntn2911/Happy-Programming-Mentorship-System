#!/usr/bin/env python3
"""Rebuild the Mentor unit-test workbook and evidence document from repo sources."""

from __future__ import annotations

import re
import argparse
from copy import copy
from datetime import datetime, date
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from openpyxl import load_workbook
from openpyxl.chart import PieChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter


ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "Unit_TestCase_Mentor_HPMS.xlsx"
SOURCE_BOOK = ROOT / "Unit_TestCase_Mentor.xlsx"
ADMIN_BOOK = ROOT / "Unit_TestCase_Admin_HPMS.xlsx"
SRS = ROOT / "SRS_G3_V1.1 (3).docx"
WORD = ROOT / "Unit Test Evidence_Mentor Role_CAPSTONE PROJECT REPORT.docx"
WORD_TEMPLATE = ROOT / "Unit Test Evidence_CAPSTONE PROJECT REPORT.docx"
JAVA_TESTS = ROOT / "backend/src/test/java/com/happyprogramming"
FRONTEND_TESTS = ROOT / "frontend/src/roles/mentor"

FUNCTIONS = [
    ("MTR_APPLICATION", "Mentor_Application", "UC15", "Register as Mentor and submit CV / qualification certificates"),
    ("MTR_AVAILABILITY", "Availability_Schedule", "No dedicated UC", "Publish availability and prevent conflicting slot reservations"),
    ("MTR_PROFILE", "Profile_Management", "UC13 / UC11", "Manage profile, biography, experience, links and teaching skills"),
    ("MTR_PACKAGES", "Package_Management", "No dedicated UC", "Manage mentor service offerings and selected package price"),
    ("MTR_DASHBOARD", "Dashboard_Overview", "No dedicated UC", "View mentor request, notice, rating and earnings overview"),
    ("MTR_REQUESTS", "Request_Approval", "UC26", "View and accept or reject pending mentorship requests"),
    ("MTR_WORKSPACE", "Workspace_Management", "UC32–33", "Access active mentorship workspace, messages and files"),
    ("MTR_WALLET", "Wallet_Payout", "No dedicated UC", "Review wallet and request OTP-protected payout"),
    ("MTR_REVIEWS", "Review_Feedback", "UC28 / UC35", "View net earnings, rating summary and mentee feedback"),
]

PRECONDITIONS = {
    "Mentor_Application": "Registered active account; no pending mentor application. Active skill exists; CV/certificates must be PDF files under 10 MB.",
    "Availability_Schedule": "Authenticated active Mentor; valid future availability. Slot holds expire after 10 minutes and overlapping confirmed reservations are forbidden.",
    "Profile_Management": "Authenticated active Mentor. Teaching-skill catalog is configured and only active skills can be selected.",
    "Package_Management": "Authenticated active Mentor with service-offering records; public selection is limited to active offerings.",
    "Dashboard_Overview": "Authenticated active Mentor; repository fixtures provide mentor-scoped request, notice, rating and earnings data.",
    "Request_Approval": "Authenticated Mentor owns the request; monthly request is PENDING and within the 48-hour response window.",
    "Workspace_Management": "Authenticated member of a paid active mentorship or confirmed booking; access is scoped to workspace membership.",
    "Wallet_Payout": "Authenticated Mentor; verified earnings respect the seven-day hold; bank destination and valid OTP are required for withdrawal.",
    "Review_Feedback": "Authenticated Mentor with active profile; reviews are eligible/published and feedback is limited to completed bookings.",
}

SRS_RULES = {
    "Mentor_Application": "UC15: active registered account and no pending application; required biography/experience/skills; PDF under 10 MB; application becomes PENDING and enters Staff review queue.",
    "Availability_Schedule": "SRS booking rules: validate Mentor availability, prevent overlapping bookings, reserve selected slots temporarily for 10 minutes, release expired/replaced holds, and recheck before confirmation.",
    "Profile_Management": "UC13: active authenticated Mentor edits profile; bio length 50–1,000 characters and avatar JPG/PNG under 5 MB. UC11: only active Staff-approved skills; at least one skill must remain selected.",
    "Package_Management": "SRS UC20 allows a Mentee to select an available package. Mentor package administration is an implemented feature; selection must preserve the chosen active offering and its price snapshot.",
    "Dashboard_Overview": "SRS Mentor overview: real-time net earnings, pending escrow, average rating, incoming requests and 48-hour response SLA. Dashboard itself has no dedicated UC number.",
    "Request_Approval": "UC26: only PENDING owned requests may be accepted/rejected within 48 hours; decision notifies Mentee. Acceptance unlocks payment only; it does not activate mentorship or create escrow before verified payment.",
    "Workspace_Management": "SRS UC32–33: workspace/session access follows confirmed paid booking. Only authorized Mentee/Mentor members access messages, files and meeting links.",
    "Wallet_Payout": "No dedicated Mentor wallet/payout UC in supplied SRS. Project rules: verified mentor earnings are held seven days; only available unreserved balance can be requested; OTP and saved destination are required. Admin executes payout externally.",
    "Review_Feedback": "UC28: show net revenue after commission, pending escrow and mentee feedback. UC35: Mentor views received ratings/comments. Only completed bookings can be rated; refunded/cancelled trial sessions are excluded from net earnings.",
}


def set_cell(cell, value, *, bold=False, color="000000", fill="FFFFFF", size=10,
             align="left", valign="center", wrap=True, font="Tahoma", border=True):
    cell.value = value
    cell.font = Font(name=font, size=size, bold=bold, color=color)
    cell.fill = PatternFill("solid", fgColor=fill)
    cell.alignment = Alignment(horizontal=align, vertical=valign, wrap_text=wrap)
    side = Side(style="thin", color="B7B7B7")
    cell.border = Border(left=side, right=side, top=side, bottom=side) if border else Border()


def apply_admin_detail_style(target, template):
    """Apply the reference sheet's formatting to a Mentor function sheet."""
    max_row, max_col = target.max_row, target.max_column
    for r in range(1, max_row + 1):
        for c in range(1, max_col + 1):
            dst = target.cell(r, c)
            src = template.cell(min(r, template.max_row), min(c, template.max_column))
            if src.has_style:
                dst.font = copy(src.font)
                dst.fill = copy(src.fill)
                dst.border = copy(src.border)
                dst.alignment = copy(src.alignment)
                dst.protection = copy(src.protection)
            if src.number_format:
                dst.number_format = src.number_format
    for col in range(1, max_col + 1):
        letter = get_column_letter(col)
        if col == 1:
            target.column_dimensions[letter].width = 15
        elif col == 2:
            target.column_dimensions[letter].width = 65
        else:
            target.column_dimensions[letter].width = 20
    for row in range(1, max_row + 1):
        for col in range(1, max_col + 1):
            cell = target.cell(row, col)
            # openpyxl style ids copied from a different workbook are normalized by save;
            # the style named in the source reference is Arial, but this template requires Tahoma.
            try:
                font = target.parent._fonts[cell._style.fontId]
                color = font.color.rgb if font.color and font.color.type == "rgb" else "FF000000"
                cell.font = Font(name="Tahoma", size=font.sz or 10, bold=font.bold,
                                 italic=font.italic, color=color, underline=font.underline)
            except (AttributeError, IndexError):
                cell.font = Font(name="Tahoma", size=10)
    target.freeze_panes = "F10"
    target.sheet_view.showGridLines = False
    target.sheet_properties.pageSetUpPr.fitToPage = True
    target.page_setup.fitToWidth = 1
    target.page_setup.fitToHeight = 0
    target.page_margins.left = 0.25
    target.page_margins.right = 0.25
    target.sheet_view.zoomScale = 85
    # The matrix is intentionally readable on screen; do not inherit the narrow
    # sample widths for test IDs from the Admin template.
    for row in target.iter_rows(min_col=2, max_col=max_col):
        for cell in row:
            if cell.column == 2:
                cell.alignment = copy(cell.alignment)
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            elif cell.column >= 6:
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    navy = "FF000080"
    for row in range(1, target.max_row + 1):
        cell = target.cell(row, 1)
        if cell.value in ("Condition", "Confirm", "Result"):
            cell.fill = PatternFill("solid", fgColor=navy)
            cell.font = Font(name="Tahoma", size=10, bold=True, color="FFFFFFFF")
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def case_line(case):
    return str(case["description"])


def rebuild_sheet(ws, admin_template, code, use_case, title):
    # Preserve source case labels/types and any previously recorded execution evidence.
    old_cases = []
    confirm_row = next((r for r in range(10, ws.max_row + 1) if ws.cell(r, 1).value == "Confirm"), None)
    result_row = next((r for r in range(10, ws.max_row + 1) if ws.cell(r, 1).value == "Result"), None)
    if confirm_row is None:
        raise ValueError(f"{ws.title}: missing Confirm section")
    for r in range(12, confirm_row):
        label = ws.cell(r, 2).value
        if isinstance(label, str) and re.match(r"MTC\d+", label):
            case_index = len(old_cases)
            old_cases.append({
                "label": label,
                "type": ws.cell(result_row, 6 + case_index).value if result_row else "N",
                "status": ws.cell(result_row + 1, 6 + case_index).value if result_row else None,
                "date": ws.cell(result_row + 2, 6 + case_index).value if result_row else None,
                "defect": ws.cell(result_row + 3, 6 + case_index).value if result_row else None,
                "expected": ws.cell(confirm_row + 1 + case_index, 2).value,
            })
    original_cases = [dict(case) for case in old_cases]
    if not old_cases:
        raise ValueError(f"{ws.title}: no MTC cases found")
    count = len(old_cases)
    cond_start, confirm_start = 12, 13 + count
    result_start = confirm_start + count + 2
    max_col = max(15, 5 + count)
    ws.delete_rows(1, ws.max_row)
    # Function identity and summary block follows Admin_Access's cell layout.
    set_cell(ws["A2"], "Function Code", bold=True)
    set_cell(ws["C2"], code, bold=True, align="center")
    set_cell(ws["F2"], "Function Name", bold=True)
    set_cell(ws["L2"], f"=FunctionList!D{11 + FUNCTIONS.index((code, ws.title, use_case, title))}", align="center")
    set_cell(ws["A3"], "Created By", bold=True)
    set_cell(ws["C3"], "Nguyen Bao Trung", align="center")
    set_cell(ws["F3"], "Executed By", bold=True)
    set_cell(ws["A4"], "Lines of code", bold=True)
    set_cell(ws["C4"], None, align="center")
    set_cell(ws["F4"], "Lack of test cases", bold=True)
    set_cell(ws["L4"], '=IF(ISNUMBER(FunctionList!E6),MAX(0,ROUNDUP(C4*FunctionList!E6/1000,0)-O7),"N/A")', align="center")
    set_cell(ws["A5"], "Test requirement", bold=True)
    set_cell(ws["C5"], f"{title} [{use_case}]", align="left")
    set_cell(ws["A6"], "Passed", bold=True, align="center")
    set_cell(ws["C6"], "Failed", bold=True, align="center")
    set_cell(ws["F6"], "Untested", bold=True, align="center")
    set_cell(ws["L6"], "N / A / B", bold=True, align="center")
    set_cell(ws["O6"], "Total Test Cases", bold=True, align="center")
    last = get_column_letter(5 + count)
    set_cell(ws["A7"], f'=COUNTIF(F{result_start+1}:{last}{result_start+1},"P")', align="center")
    set_cell(ws["C7"], f'=COUNTIF(F{result_start+1}:{last}{result_start+1},"F")', align="center")
    set_cell(ws["F7"], f"=O7-A7-C7", align="center")
    set_cell(ws["L7"], f'=COUNTIF(F{result_start}:{last}{result_start},"N")', align="center")
    set_cell(ws["M7"], f'=COUNTIF(F{result_start}:{last}{result_start},"A")', align="center")
    set_cell(ws["N7"], f'=COUNTIF(F{result_start}:{last}{result_start},"B")', align="center")
    set_cell(ws["O7"], f"=COUNTA(F9:{last}9)", align="center")
    # UTCID columns and diagonal condition matrix.
    for i in range(count):
        col = 6 + i
        set_cell(ws.cell(9, col), f"UTCID{i+1:02d}", bold=True, color="FFFFFF", fill="FF000080", align="center")
    for c, value in [(1, "Condition"), (2, "Precondition")]:
        set_cell(ws.cell(10, c), value, bold=True, color="FFFFFF" if c == 1 else "000000",
                 fill="FF000080" if c == 1 else "FFFFFF", align="center" if c == 1 else "left")
    pre = PRECONDITIONS[ws.title]
    for c in range(1, max_col + 1):
        set_cell(ws.cell(11, c), pre if c == 2 else ("O" if c >= 6 else None),
                 align="center" if c >= 6 else "left")
    for i, item in enumerate(old_cases):
        r = cond_start + i
        # Keep each case as a separate concise condition; strip duplicate type annotation only.
        label = re.sub(r"^MTC\d+\s*\([^)]*\)\s*[—-]\s*", "", item["label"])
        case_id = re.match(r"MTC\d+", item["label"]).group()
        set_cell(ws.cell(r, 2), f"{case_id}: {label}")
        for c in range(1, max_col + 1):
            if c >= 6:
                set_cell(ws.cell(r, c), "O" if c == 6 + i else None, align="center")
    set_cell(ws.cell(confirm_start, 1), "Confirm", bold=True, color="FFFFFF", fill="FF000080", align="center")
    set_cell(ws.cell(confirm_start, 2), "Expected results", bold=True)
    for i, item in enumerate(original_cases):
        r = confirm_start + 1 + i
        # Retain concrete expected behavior in original source matrix; normalize the prefix.
        old_expected = item.get("expected")
        expected = str(old_expected or "").strip()
        while re.match(r"^Expected outcome is verified:\s*", expected, flags=re.I):
            expected = re.sub(r"^Expected outcome is verified:\s*", "", expected, flags=re.I)
        expected = re.sub(r"^(Test passes|Skipped)\s*[—-]\s*", "", expected, flags=re.I).rstrip(".")
        label = re.sub(r"^MTC\d+\s*\([^)]*\)\s*[—-]\s*", "", item["label"])
        expected = f"Expected outcome is verified: {expected}." if expected else f"Assertions verify: {label}."
        set_cell(ws.cell(r, 2), expected)
        for c in range(1, max_col + 1):
            if c >= 6:
                set_cell(ws.cell(r, c), "O" if c == 6 + i else None, align="center")
    set_cell(ws.cell(result_start, 1), "Result", bold=True, color="FFFFFF", fill="FF000080", align="center")
    set_cell(ws.cell(result_start, 2), "Type (N / A / B)", bold=True)
    set_cell(ws.cell(result_start + 1, 2), "Passed / Failed", bold=True)
    set_cell(ws.cell(result_start + 2, 2), "Executed Date", bold=True)
    set_cell(ws.cell(result_start + 3, 2), "Defect ID", bold=True)
    for i, item in enumerate(old_cases):
        c = 6 + i
        case_type = item["type"] if item["type"] in ("N", "A", "B") else "N"
        # Only preserve a recorded execution state when it was attached to this case column.
        raw_status = item["status"] if item["status"] in ("P", "F", "U") else None
        status = raw_status
        set_cell(ws.cell(result_start, c), case_type, align="center")
        set_cell(ws.cell(result_start + 1, c), status, align="center")
        set_cell(ws.cell(result_start + 2, c), item["date"] if status else None, align="center")
        set_cell(ws.cell(result_start + 3, c), item["defect"] if status == "F" else None, align="center")
    # Fit rows, style from reference, then enforce the mandated navy vertical labels.
    ws.row_dimensions[11].height = 42
    for r in range(cond_start, cond_start + count):
        ws.row_dimensions[r].height = 30
    for r in range(confirm_start + 1, confirm_start + 1 + count):
        ws.row_dimensions[r].height = 30
    ws.row_dimensions[5].height = 32
    apply_admin_detail_style(ws, admin_template)
    # The reference contains sample values as well as styles; restore every Mentor-specific value.
    for i, item in enumerate(old_cases):
        col = 6 + i
        ws.cell(9, col).value = f"UTCID{i+1:02d}"
        ws.cell(result_start, col).value = item["type"] if item["type"] in ("N", "A", "B") else "N"
        status = item["status"] if item["status"] in ("P", "F", "U") else None
        ws.cell(result_start + 1, col).value = status
        ws.cell(result_start + 2, col).value = item["date"] if status else None
        ws.cell(result_start + 3, col).value = item["defect"] if status == "F" else None
    for i, item in enumerate(original_cases):
        row = confirm_start + 1 + i
        expected = str(item.get("expected") or "").strip()
        while re.match(r"^Expected outcome is verified:\s*", expected, flags=re.I):
            expected = re.sub(r"^Expected outcome is verified:\s*", "", expected, flags=re.I)
        expected = re.sub(r"^(Test passes|Skipped)\s*[—-]\s*", "", expected, flags=re.I).rstrip(".")
        label = re.sub(r"^MTC\d+\s*\([^)]*\)\s*[—-]\s*", "", item["label"])
        ws.cell(row, 2).value = f"Expected outcome is verified: {expected}." if expected else f"Assertions verify: {label}."
    for r, label in [(10, "Condition"), (confirm_start, "Confirm"), (result_start, "Result")]:
        set_cell(ws.cell(r, 1), label, bold=True, color="FFFFFF", fill="FF000080",
                 align="center", valign="center")
    for r in [10, confirm_start, result_start]:
        for c in range(2, max_col + 1):
            cell = ws.cell(r, c)
            if cell.value is None:
                cell.fill = PatternFill("solid", fgColor="FFFFFF")
    ws.auto_filter.ref = f"F9:{last}{result_start+3}"
    return {"count": count, "result_row": result_start, "last_col": last}


def add_hyperlink(cell, sheet):
    cell.hyperlink = f"#'{sheet}'!A1"
    cell.style = "Hyperlink"
    cell.font = Font(name="Tahoma", size=10, color="0000FF", underline="single")


def clone_sheet_from_reference(wb, source, name):
    """Replace a sheet with a cell-for-cell copy of the Admin reference sheet."""
    old_index = wb.sheetnames.index(name) if name in wb.sheetnames else len(wb.worksheets)
    if name in wb.sheetnames:
        del wb[name]
    dst = wb.create_sheet(name, old_index)
    for merged in source.merged_cells.ranges:
        dst.merge_cells(str(merged))
    for row in source.iter_rows():
        for src in row:
            cell = dst.cell(src.row, src.column)
            if cell.__class__.__name__ == "MergedCell":
                continue
            cell.value = src.value
            if src.has_style:
                cell.font = copy(src.font)
                cell.fill = copy(src.fill)
                cell.border = copy(src.border)
                cell.alignment = copy(src.alignment)
                cell.protection = copy(src.protection)
            cell.number_format = src.number_format
            if src.hyperlink:
                cell._hyperlink = copy(src.hyperlink)
        
    for key, src_dim in source.column_dimensions.items():
        dst_dim = dst.column_dimensions[key]
        for attr in ("width", "hidden", "bestFit", "outlineLevel", "collapsed", "style"):
            try:
                setattr(dst_dim, attr, copy(getattr(src_dim, attr)))
            except (AttributeError, TypeError):
                pass
    for key, src_dim in source.row_dimensions.items():
        dst_dim = dst.row_dimensions[key]
        for attr in ("height", "hidden", "outlineLevel", "collapsed", "style"):
            try:
                setattr(dst_dim, attr, copy(getattr(src_dim, attr)))
            except (AttributeError, TypeError):
                pass
    dst.sheet_view.showGridLines = source.sheet_view.showGridLines
    dst.sheet_view.zoomScale = source.sheet_view.zoomScale
    dst.freeze_panes = source.freeze_panes
    dst.sheet_format = copy(source.sheet_format)
    dst.sheet_properties = copy(source.sheet_properties)
    dst.page_margins = copy(source.page_margins)
    dst.page_setup = copy(source.page_setup)
    dst.print_options = copy(source.print_options)
    if source.print_area:
        dst.print_area = source.print_area
    if source.print_title_rows:
        dst.print_title_rows = source.print_title_rows
    if source.print_title_cols:
        dst.print_title_cols = source.print_title_cols
    return dst


def format_cover(wb, admin_wb):
    ws = clone_sheet_from_reference(wb, admin_wb["Cover"], "Cover")
    # The requested Mentor document code replaces the sample's Admin metadata.
    for merged in list(ws.merged_cells.ranges):
        if str(merged) == "B2:F2":
            ws.unmerge_cells(str(merged))
    ws.merge_cells("A2:I3")
    title = ws["A2"]
    title.value = "UNIT TEST CASE"
    title.font = Font(name="Tahoma", size=16, bold=True, color="FF000000")
    title.alignment = Alignment(horizontal="center", vertical="center")
    edge = Side(style="thin", color="FF000000")
    for row in ws.iter_rows(min_row=2, max_row=3, min_col=1, max_col=9):
        for cell in row:
            cell.border = Border(
                left=edge if cell.column == 1 else Side(style=None),
                right=edge if cell.column == 9 else Side(style=None),
                top=edge if cell.row == 2 else Side(style=None),
                bottom=edge if cell.row == 3 else Side(style=None),
            )
    ws.row_dimensions[2].height = 24
    ws.row_dimensions[3].height = 24
    ws["B4"] = "HappyProgramming Mentorship System"
    ws["B5"] = "HPMS"
    ws["B6"] = "HPMS_MENTOR_UTC_v1.0"
    ws["F4"] = "Nguyen Bao Trung"
    ws["F6"] = date.today()
    ws["F6"].number_format = "dd/mm/yyyy"
    ws["F7"] = "1.0"
    ws["E7"] = "Version"
    ws["A10"] = "Record of change"
    headers = ["Effective Date", "Version", "Change Item", "*A,D,M", "Change description", "Reference"]
    for col, value in enumerate(headers, 1):
        cell = ws.cell(11, col)
        cell.value = value
        cell.fill = PatternFill("solid", fgColor="FF000080")
        cell.font = Font(name="Tahoma", size=10, bold=True, color="FFFFFFFF")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    values = [date.today(), "1.0", "Mentor unit test template", "M",
              "Recreated the Mentor report using the Admin workbook layout.",
              "Unit_TestCase_Admin_HPMS.xlsx / Mentor unit test sources"]
    for col, value in enumerate(values, 1):
        ws.cell(12, col).value = value
        ws.cell(12, col).font = Font(name="Tahoma", size=10, color="FF000000")
        ws.cell(12, col).alignment = Alignment(vertical="center", wrap_text=True)
        ws.cell(12, col).number_format = "dd/mm/yyyy" if col == 1 else "General"
    dotted = Side(style="dotted", color="FF000000")
    for row in range(11, 13):
        for col in range(1, 7):
            cell = ws.cell(row, col)
            cell.border = Border(left=dotted, right=dotted, top=dotted, bottom=dotted)
    ws.sheet_view.showGridLines = False
    return ws


def rebuild_report(wb, reference_report, stats):
    ref = reference_report["Test Report"]
    ws = clone_sheet_from_reference(wb, ref, "Test Report")
    # Keep the two reference pie charts and their native chart formatting.
    for chart in list(ws._charts):
        ws._charts.remove(chart)
    # Admin's 15-function table left legacy hyperlinks in column B below row 21.
    # Remove them so Mentor's 9-function report has no hidden/stale function entries.
    for r in range(22, 28):
        ws.cell(r, 2).value = None
        ws.cell(r, 2).hyperlink = None
    for r in range(12, 28):
        for c in range(1, 10):
            ws.cell(r, c).value = None
    # Remove the Admin template's excess function/metric residue; Mentor uses rows 12–21.
    for r in range(22, 28):
        for c in range(1, 10):
            ws.cell(r, c).value = None
    ws["B4"] = "HappyProgramming Mentorship System"
    ws["B6"] = "HPMS_MENTOR_UTC_v1.0"
    ws["F4"] = "Nguyen Bao Trung"
    ws["F6"] = date.today()
    ws["F6"].number_format = "dd/mm/yyyy"
    ws["B7"] = "Untested cases remain blank. Result totals reflect recorded P/F/U execution states; U is included in Untested."
    ws["A11"] = "No"; ws["B11"] = "Function code"; ws["C11"] = "Passed"; ws["D11"] = "Failed"
    ws["E11"] = "Untested"; ws["F11"] = "N"; ws["G11"] = "A"; ws["H11"] = "B"; ws["I11"] = "Total Test Cases"
    for idx, (code, sheet, uc, title) in enumerate(FUNCTIONS, start=12):
        n = idx - 11
        ws.cell(idx, 1, n)
        ws.cell(idx, 2, f"=FunctionList!E{n+10}")
        add_hyperlink(ws.cell(idx, 2), sheet)
        ws.cell(idx, 3, f"='{sheet}'!A7")
        ws.cell(idx, 4, f"='{sheet}'!C7")
        ws.cell(idx, 5, f"='{sheet}'!F7")
        ws.cell(idx, 6, f"='{sheet}'!L7")
        ws.cell(idx, 7, f"='{sheet}'!M7")
        ws.cell(idx, 8, f"='{sheet}'!N7")
        ws.cell(idx, 9, f"='{sheet}'!O7")
    for c in range(3, 10):
        letter = get_column_letter(c)
        ws.cell(21, c, f"=SUM({letter}12:{letter}20)")
    ws["B21"] = "Sub total"
    ws["B29"] = "Test coverage"
    ws["B30"] = "Test successful coverage"
    ws["B31"] = "Normal case"
    ws["B32"] = "Abnormal case"
    ws["B33"] = "Boundary case"
    ws["D29"] = "=IF(I21=0,0,SUM(C21:D21)/I21)"
    ws["D30"] = "=IF(I21=0,0,C21/I21)"
    ws["D31"] = "=IF(I21=0,0,F21/I21)"
    ws["D32"] = "=IF(I21=0,0,G21/I21)"
    ws["D33"] = "=IF(I21=0,0,H21/I21)"
    for r, label in [(29, "Test coverage"), (30, "Test successful coverage"), (31, "Normal case"), (32, "Abnormal case"), (33, "Boundary case")]:
        ws.cell(r, 2).value = label
        ws.cell(r, 4).number_format = "0.0%"
    for r, result, formula in [(37, "Passed", "=C21"), (38, "Failed", "=D21"), (39, "Untested", "=E21")]:
        ws.cell(r, 15, result); ws.cell(r, 16, formula)
    for r, result, formula in [(43, "N", "=F21"), (44, "A", "=G21"), (45, "B", "=H21")]:
        ws.cell(r, 15, result); ws.cell(r, 16, formula)
    ws["O36"] = "Result"; ws["P36"] = "Count"
    ws["O42"] = "Test Type"; ws["P42"] = "Count"
    for r in range(37, 40):
        ws.cell(r, 15).value = ["Passed", "Failed", "Untested"][r - 37]
        ws.cell(r, 16).value = ["=C21", "=D21", "=E21"][r - 37]
    for r in range(43, 46):
        ws.cell(r, 15).value = ["N", "A", "B"][r - 43]
        ws.cell(r, 16).value = ["=F21", "=G21", "=H21"][r - 43]
    for r in list(range(12, 22)):
        for c in range(2, 10):
            cell = ws.cell(r, c)
            if c == 2 and r < 21:
                add_hyperlink(cell, FUNCTIONS[r-12][1])
            if cell.value is not None:
                cell.font = Font(name="Tahoma", size=10, color="FF000000")
    # Restore the expected presentation metadata after copying the Admin layout.
    ws["A2"] = "UNIT TEST REPORT"
    ws["A4"] = "Project Name"; ws["B4"] = "HappyProgramming Mentorship System"
    ws["D4"] = "Creator"; ws["F4"] = "Nguyen Bao Trung"
    ws["A5"] = "Project Code"; ws["B5"] = "HPMS"
    ws["D5"] = "Reviewer/Approver"
    # Use one document-code cell at B6 (unmerge the Admin sample's B6:C6).
    if "B6:C6" in {str(m) for m in ws.merged_cells.ranges}:
        ws.unmerge_cells("B6:C6")
    ws["A6"] = "Document Code"; ws["B6"] = "HPMS_MENTOR_UTC_v1.0"
    ws["D6"] = "Issue Date"; ws["F6"] = date.today()
    ws["F6"].number_format = "dd/mm/yyyy"
    ws["A7"] = "Notes"
    ws["A11"] = "No"; ws["B11"] = "Function code"; ws["C11"] = "Passed"; ws["D11"] = "Failed"
    ws["E11"] = "Untested"; ws["F11"] = "N"; ws["G11"] = "A"; ws["H11"] = "B"; ws["I11"] = "Total Test Cases"
    for r in range(23, 28):
        ws.cell(r, 2).value = None
    # Restore the template's summary-table and metric presentation after values change.
    for r in range(12, 21):
        for c in range(1, 10):
            cell = ws.cell(r, c)
            if cell.value is not None:
                cell.font = Font(name="Tahoma", size=10, color="FF000000")
                cell.alignment = Alignment(horizontal="center" if c != 2 else "left", vertical="center", wrap_text=True)
    for r in range(12, 27):
        ws.row_dimensions[r].hidden = False
        ws.row_dimensions[r].height = max(ws.row_dimensions[r].height or 0, 20)
    for r in range(1, 36):
        ws.row_dimensions[r].hidden = False
        ws.row_dimensions[r].height = max(ws.row_dimensions[r].height or 0, 20)
    ws.row_dimensions[7].height = max(ws.row_dimensions[7].height or 0, 30)
    ws.row_dimensions[11].height = max(ws.row_dimensions[11].height or 0, 24)
    for col, width in {"A": 15, "B": 39, "C": 11, "D": 11, "E": 12,
                       "F": 8, "G": 8, "H": 8, "I": 19, "O": 15, "P": 12}.items():
        ws.column_dimensions[col].width = width
    ws._charts.clear()
    pie1 = PieChart(); pie1.title = "Passed Percent"; pie1.height = 7.5; pie1.width = 15
    pie1.add_data(Reference(ws, min_col=16, min_row=36, max_row=39), titles_from_data=True)
    pie1.set_categories(Reference(ws, min_col=15, min_row=37, max_row=39))
    pie1.dataLabels = DataLabelList(); pie1.dataLabels.showPercent = True; pie1.dataLabels.showLeaderLines = True
    ws.add_chart(pie1, "B36")
    pie2 = PieChart(); pie2.title = "Test Type"; pie2.height = 7.5; pie2.width = 15
    pie2.add_data(Reference(ws, min_col=16, min_row=42, max_row=45), titles_from_data=True)
    pie2.set_categories(Reference(ws, min_col=15, min_row=43, max_row=45))
    pie2.dataLabels = DataLabelList(); pie2.dataLabels.showPercent = True; pie2.dataLabels.showLeaderLines = True
    ws.add_chart(pie2, "F36")
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "A11"
    return ws


def find_case_locations(ws):
    cases = []
    confirm = next(r for r in range(1, ws.max_row + 1) if ws.cell(r, 1).value == "Confirm")
    result = next(r for r in range(confirm + 1, ws.max_row + 1) if ws.cell(r, 1).value == "Result")
    for i, r in enumerate(range(12, confirm)):
        text = ws.cell(r, 2).value
        m = re.match(r"(MTC\d+):\s*(.*)", str(text or ""))
        if not m:
            continue
        cases.append({
            "id": m.group(1), "description": m.group(2),
            "type": ws.cell(result, 6 + i).value,
            "status": ws.cell(result + 1, 6 + i).value,
            "expected": ws.cell(confirm + 1 + i, 2).value,
        })
    return cases


def source_locations(cases):
    # Map methods using the original workbook's MTC labels, then resolve each exact signature in source.
    old = load_workbook(BOOK, data_only=False)
    # (This function is called before saving, so the in-memory workbook remains authoritative.)


def locate_method(text, sheet_name):
    words = [x for x in re.findall(r"[a-z0-9]+", text.lower()) if len(x) > 3]
    candidates = list(JAVA_TESTS.rglob("*.java")) + list(FRONTEND_TESTS.glob("*.test.js"))
    original = text.strip().lower()
    if sheet_name:
        family = {
            "Mentor_Application": ("MentorApplicationControllerTest.java",),
            "Availability_Schedule": ("MentorAvailability", "mentorAvailabilityService.test.js", "MentorWorkspacePage.test.js"),
            "Profile_Management": ("MentorControllerTest.java", "MentorProfileControllerTest.java", "MentorPersistenceMappingTest.java", "MentorServiceTest.java", "MentorSkillRepositoryTest.java", "MentorProfileTransactionIntegrationTest.java", "MentorProfilePage.test.js"),
            "Package_Management": ("MentorPlanControllerTest.java", "MentorshipPackageSelectionTest.java", "MentorWorkspacePage.test.js"),
            "Dashboard_Overview": ("MentorDashboardControllerTest.java", "MentorDashboardRepositoryQueryTest.java", "MentorDashboardServiceTest.java", "MentorDashboardPage.test.js", "mentorDashboardService.test.js"),
            "Request_Approval": ("MentorDashboardControllerTest.java", "MentorshipRequestControllerOneOffTest.java", "MentorshipRequestControllerTest.java", "MentorDashboardRepositoryQueryTest.java", "MentorDashboardServiceTest.java", "MentorDashboardTransactionIntegrationTest.java", "MentorshipRequestCancellationTest.java", "MentorRequestsPage.test.js", "mentorDashboardService.test.js"),
            "Workspace_Management": ("MentorshipWorkspaceControllerTest.java", "MentorshipWorkspaceRepositoryIntegrationTest.java", "MentorshipWorkspaceServiceTest.java", "MentorWorkspacePage.test.js"),
            "Wallet_Payout": ("MentorWalletControllerTest.java", "MentorPayoutOtpIntegrationTest.java", "MentorWalletServiceTest.java", "MentorWalletPage.test.js", "mentorWalletService.test.js"),
            "Review_Feedback": ("MentorReviewControllerTest.java", "MentorDashboardRepositoryQueryTest.java", "MentorDashboardServiceTest.java", "MentorReviewServiceTest.java", "MentorWalletPage.test.js", "mentorReviewService.test.js"),
        }
        allowed = family.get(sheet_name, ())
        preferred = [p for p in candidates if any(a.lower() in p.name.lower() for a in allowed)]
        if preferred: candidates = preferred
    scored = []
    for path in candidates:
        lines = path.read_text(encoding="utf-8").splitlines()
        for i, line in enumerate(lines):
            if path.suffix == ".java":
                if "@Test" not in line:
                    continue
                tail = "\n".join(lines[i:min(len(lines), i + 12)])
                match = re.search(r"\b(?:void|public\s+void)\s+(\w+)\s*\(", tail)
            else:
                if re.match(r"\s*test\s*\(", line) is None:
                    continue
                tail = "\n".join(lines[i:min(len(lines), i + 5)])
                match = re.search(r"test\s*\(\s*(['\"])(.*?)\1", tail)
            if not match:
                continue
            name = match.group(1) if path.suffix == ".java" else match.group(2)
            norm = re.sub(r"[^a-z0-9]", "", name.lower())
            score = sum(1 for w in words if w in norm)
            if path.suffix == ".js":
                score = sum(1 for w in words if w in name.lower())
            if name.lower() == original:
                score += 20
            if score:
                scored.append((score, path, i, name, lines))
    if not scored:
        return None
    # Strongly prefer the language/file family expected for each Mentor feature and exact test names.
    scored.sort(key=lambda x: (x[0], x[3].lower() == original, len(x[3])), reverse=True)
    best = scored[0]
    # Narrow known same-vocabulary collisions using the case's precise behavior.
    score, path, start, name, lines = best
    if sheet_name == "Request_Approval" and "decision accepts only validated decision values" in original:
        target = "requestDecisionAcceptsOnlyValidatedDecisionValues"
        p = JAVA_TESTS / "controller/MentorDashboardControllerTest.java"
        lines = p.read_text(encoding="utf-8").splitlines()
        start = next(i for i, line in enumerate(lines) if target in line)
        path = p
        name = target
    if sheet_name == "Request_Approval" and original == "cancels an application":
        path = JAVA_TESTS / "controller/MentorshipRequestControllerTest.java"
        lines = path.read_text(encoding="utf-8").splitlines()
        name = "cancelsAnApplication"
        start = next(i for i, line in enumerate(lines) if re.search(r"\b" + name + r"\s*\(", line))
    if score < min(2, len(words)):
        return None
    if path.suffix == ".java":
        # Find the nearest method opening brace and count its balanced block.
        method_line = next((j for j in range(start, min(len(lines), start + 12)) if re.search(r"\b" + re.escape(name) + r"\s*\(", lines[j])), start)
        brace_line = next((j for j in range(method_line, min(len(lines), method_line + 5)) if "{" in lines[j]), method_line)
        depth, end = 0, brace_line
        started = False
        for j in range(brace_line, len(lines)):
            depth += lines[j].count("{") - lines[j].count("}")
            started = started or "{" in lines[j]
            if started and depth <= 0:
                end = j; break
        return {"path": path.relative_to(ROOT).as_posix(), "method": f"void {name}()", "start": method_line + 1, "end": end + 1}
    end = start
    depth = 0
    started = False
    for j in range(start, len(lines)):
        depth += lines[j].count("{") - lines[j].count("}")
        started = started or "{" in lines[j]
        if started and depth <= 0:
            end = j
            break
    return {"path": path.relative_to(ROOT).as_posix(), "method": f"test('{name}')", "start": start + 1, "end": end + 1}


def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(qn("w:fill"), fill); tc_pr.append(shd)


def set_cell_text(cell, text, bold=False, color="000000", size=9):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(str(text)); run.bold = bold; run.font.name = "Tahoma"; run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def build_word(case_groups):
    # Use supplied cover's section/page setup, then replace body with a readable evidence layout.
    doc = Document(WORD_TEMPLATE)
    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width = Inches(11)
    section.page_height = Inches(8.5)
    section.left_margin = Inches(0.55)
    section.right_margin = Inches(0.55)
    section.top_margin = Inches(0.55)
    section.bottom_margin = Inches(0.55)
    body = doc._element.body
    sect = body.sectPr
    for child in list(body):
        if child is not sect:
            body.remove(child)
    # Cover matching the sample's centered project title and date structure.
    for _ in range(3): doc.add_paragraph()
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("CAPSTONE PROJECT REPORT"); r.bold = True; r.font.name = "Tahoma"; r.font.size = Pt(24)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Unit_Test - Mentor Role"); r.bold = True; r.font.name = "Tahoma"; r.font.size = Pt(20)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("HappyProgramming Mentorship System"); r.font.name = "Tahoma"; r.font.size = Pt(14)
    for _ in range(8): doc.add_paragraph()
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("– Hanoi, October 2026 –"); r.italic = True; r.font.name = "Tahoma"; r.font.size = Pt(12)
    doc.add_page_break()
    h = doc.add_heading("Unit Test Evidence - Mentor Role", 0)
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph("Source of requirements: SRS_G3_V1.1 (3).docx. Test names and source line ranges are resolved from the current repository source.")
    doc.add_paragraph("Status legend: P = recorded passed; F = recorded failed; U = skipped/untested. Blank status means the workbook had no execution result for that case. Paste IDE screenshots in the labelled evidence boxes.")
    doc.add_heading("Requirement traceability", level=1)
    for code, sheet, uc, title in FUNCTIONS:
        p = doc.add_paragraph()
        p.add_run("• ")
        p.add_run(f"{code} — {uc}: ").bold = True
        p.add_run(SRS_RULES[sheet])
    doc.add_paragraph("SRS numbering correction: request decisions are UC26, not UC22. The supplied SRS has no UC19 for Mentor wallet/payout; wallet rules are traced to project payment/settlement requirements. UC11 covers teaching skills; UC13 covers profile and biography.")
    for n, (code, sheet, uc, title) in enumerate(FUNCTIONS, 1):
        doc.add_page_break()
        doc.add_heading(f"{n}. {code} — {sheet}", level=1)
        doc.add_paragraph(f"Requirement: {title} | SRS trace: {uc}")
        doc.add_paragraph(f"Precondition: {PRECONDITIONS[sheet]}")
        doc.add_paragraph(f"SRS business conditions: {SRS_RULES[sheet]}")
        table = doc.add_table(rows=1, cols=7)
        table.style = "Table Grid"
        headers = ["Test Case", "Type", "Condition", "Expected / Confirmation", "Recorded Result", "Code location", "IDE screenshot evidence"]
        for c, label in enumerate(headers):
            set_cell_text(table.rows[0].cells[c], label, bold=True, color="FFFFFF", size=8)
            shade(table.rows[0].cells[c], "000080")
        for item in case_groups[sheet]:
            row = table.add_row().cells
            location = item.get("location")
            code_map = "Not resolved from source; review required"
            if location:
                code_map = f"{location['path']}\n{location['method']}\nLines {location['start']}–{location['end']}"
            status = item.get("status") or "Untested (blank in source workbook)"
            if status == "U": status = "Skipped / not executed"
            vals = [item["id"], item["type"], item["description"], item["expected"], status, code_map,
                    f"[PASTE IDE SCREENSHOT HERE]\n{item['id']} — {location['method'] if location else 'method unresolved'}"]
            for c, value in enumerate(vals):
                set_cell_text(row[c], value, size=7 if c in (2, 3, 5, 6) else 8)
                if c == 6: shade(row[c], "F3EEFA")
        widths = [0.65, 0.45, 1.55, 1.55, 0.75, 2.05, 1.45]
        for row in table.rows:
            for cell, width in zip(row.cells, widths): cell.width = Inches(width)
    doc.save(WORD)


def main(excel_only=False):
    # Always read immutable input evidence, never the previous generated output.
    wb = load_workbook(SOURCE_BOOK)
    ref_wb = load_workbook(ADMIN_BOOK)
    template = ref_wb["Admin_Access"]
    evidence_source = Document(WORD)
    # Fold the original per-test-function workbook into the nine requested business functions.
    source_cases = {}
    for source_sheet in wb.worksheets:
        for col in range(6, source_sheet.max_column + 1):
            case_id = source_sheet.cell(9, col).value
            if not isinstance(case_id, str) or not re.fullmatch(r"MTC\d+", case_id):
                continue
            description = ""
            for row in range(12, source_sheet.max_row + 1):
                value = source_sheet.cell(row, 4).value
                if isinstance(value, str) and value.strip():
                    # The diagonal case row follows the test ID's position within this sheet.
                    if source_sheet.cell(row, col).value == "O":
                        description = value.strip()
                        break
            result_row = next((r for r in range(1, source_sheet.max_row + 1) if source_sheet.cell(r, 1).value == "Result"), 54)
            source_cases[case_id] = {
                "description": description,
                "type": source_sheet.cell(result_row, col).value,
                "status": source_sheet.cell(result_row + 1, col).value,
                "date": source_sheet.cell(result_row + 2, col).value,
                "defect": source_sheet.cell(result_row + 3, col).value,
            }
    # Word's existing business-function grouping is the authoritative case-to-function map.
    doc_case_rows = {}
    case_tables = [table for table in evidence_source.tables if table.rows and table.rows[0].cells[0].text.strip() in ("Test Case ID", "Test Case")]
    for table in case_tables:
        header = table.rows[0].cells[0].text.strip()
        for row in table.rows[1:]:
            cells = [c.text.strip() for c in row.cells]
            if header == "Test Case ID":
                doc_case_rows[cells[0]] = {"use_case": cells[1], "description": cells[2], "expected": cells[3],
                                           "status": cells[5], "code_map": cells[6], "screenshot": cells[7]}
            else:
                expected = cells[3]
                while re.match(r"^Expected outcome is verified:\s*", expected, flags=re.I):
                    expected = re.sub(r"^Expected outcome is verified:\s*", "", expected, flags=re.I)
                doc_case_rows[cells[0]] = {"use_case": "", "description": cells[2], "expected": expected,
                                           "status": cells[4], "code_map": cells[5], "screenshot": cells[6]}
    case_groups = {}
    # Keep the source workbook's cover/list/guideline and report sheet, remove per-test sheets.
    wanted = {"Guidleline", "Cover", "FunctionList", "Test Report"}
    for sheet_name in list(wb.sheetnames):
        if sheet_name not in wanted:
            del wb[sheet_name]
    # Clone the physical Cover from the Admin template before applying Mentor metadata.
    format_cover(wb, ref_wb)
    for code, sheet, uc, title in FUNCTIONS:
        ws = wb.create_sheet(sheet)
        cases = []
        table_idx = ["Mentor_Application", "Availability_Schedule", "Profile_Management", "Package_Management", "Dashboard_Overview", "Request_Approval", "Workspace_Management", "Wallet_Payout", "Review_Feedback"].index(sheet)
        if len(case_tables) < len(FUNCTIONS):
            raise ValueError("Evidence source does not contain all nine function case tables")
        table = case_tables[table_idx]
        for row in table.rows[1:]:
            cells = [c.text.strip() for c in row.cells]
            case_id = cells[0]
            src = source_cases.get(case_id, {})
            evidence = doc_case_rows.get(case_id, {})
            case_type = src.get("type") if src.get("type") in ("N", "A", "B") else "N"
            status = src.get("status")
            word_status = str(evidence.get("status", "")).upper()
            status = "U" if status == "S" or word_status.startswith("SKIP") else status
            status = status if status in ("P", "F", "U") else None
            desc = evidence.get("description") or src.get("description") or case_id
            expected = evidence.get("expected") or f"Verify expected behavior: {desc}."
            cases.append({"id": case_id, "label": f"{case_id} ({ {'N':'Normal','A':'Abnormal','B':'Boundary'}[case_type] }) — {desc}",
                          "description": desc, "expected": expected, "type": case_type, "status": status,
                          "date": src.get("date"), "defect": src.get("defect"), "code_map": evidence.get("code_map")})
        if not cases:
            raise ValueError(f"No evidence cases found for {sheet}")
        count = len(cases)
        # Seed the existing sheet-builder with a compact source matrix.
        confirm_seed = 12 + count
        result_seed = confirm_seed + count + 2
        set_cell(ws.cell(confirm_seed, 1), "Confirm"); set_cell(ws.cell(confirm_seed, 2), "Expected results")
        for i, case in enumerate(cases):
            col = 6 + i
            set_cell(ws.cell(9, col), case["id"])
            set_cell(ws.cell(12 + i, 2), case["label"])
            set_cell(ws.cell(confirm_seed + 1 + i, 2), case["expected"])
            set_cell(ws.cell(result_seed, col), case["type"])
            set_cell(ws.cell(result_seed + 1, col), case["status"])
            set_cell(ws.cell(result_seed + 2, col), case["date"] if case["status"] else None)
            set_cell(ws.cell(result_seed + 3, col), case["defect"] if case["status"] == "F" else None)
        set_cell(ws.cell(result_seed, 1), "Result")
        # Keep the original exact IDs and expectations through the sheet builder's normalization.
        case_groups[sheet] = cases
        stats[sheet] = rebuild_sheet(ws, template, code, uc, title)
    report = rebuild_report(wb, ref_wb, stats)
    # Update FunctionList metadata and exact requirement mappings.
    fl = wb["FunctionList"]
    for i, (code, sheet, uc, title) in enumerate(FUNCTIONS, start=11):
        fl.cell(i, 2, title)
        fl.cell(i, 3, sheet)
        fl.cell(i, 4, "See the per-case source map in the evidence document")
        fl.cell(i, 5, code)
        fl.cell(i, 6, sheet)
        fl.cell(i, 7, f"SRS trace: {uc}. {SRS_RULES[sheet]}")
        fl.cell(i, 8, PRECONDITIONS[sheet])
    for sheet, cases in case_groups.items():
        for item in cases:
            item["location"] = locate_method(item["description"], sheet)
    wb.calculation.fullCalcOnLoad = True
    wb.calculation.forceFullCalc = True
    wb.calculation.calcMode = "auto"
    wb.save(BOOK)
    if not excel_only:
        build_word(case_groups)
    total = sum(len(x) for x in case_groups.values())
    mapped = sum(1 for cases in case_groups.values() for x in cases if x.get("location"))
    print(f"Workbook updated: {BOOK.name}; {len(FUNCTIONS)} functions; {total} cases; {mapped} source methods resolved.")
    if not excel_only:
        print(f"Evidence updated: {WORD.name}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rebuild Mentor unit-test reports from repository sources.")
    parser.add_argument("--excel-only", action="store_true", help="Update only the Mentor Excel workbook.")
    args = parser.parse_args()
    stats = {}
    main(excel_only=args.excel_only)

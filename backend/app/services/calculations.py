"""Shared money-math helpers for the Invoice and Quotation engines.

Everything returns Decimal(quantize to 2dp) so both engines store/compare exact
currency values. Never trust client-supplied totals; always recompute here.
"""
from decimal import Decimal, ROUND_HALF_UP

MONEY = Decimal("0.01")


def to_decimal(value) -> Decimal:
    """Coerce int/float/str/Decimal to Decimal; None -> 0."""
    return Decimal(str(value or 0))


def round_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def compute_line_total(quantity, unit_price) -> Decimal:
    """line_total = round(quantity * unit_price, 2)"""
    return round_money(to_decimal(quantity) * to_decimal(unit_price))


def compute_totals(line_totals, tax_percent=0, discount_percent=0) -> dict:
    """Given a list of line-item totals, return subtotal / discounts / tax /
    grand total. discount_percent applies to the subtotal; tax applies to the
    discounted subtotal.
    """
    tax_percent = to_decimal(tax_percent)
    discount_percent = to_decimal(discount_percent)

    subtotal = round_money(sum((to_decimal(t) for t in line_totals), Decimal("0")))

    discount_amount = round_money(subtotal * discount_percent / Decimal("100"))
    taxable = round_money(subtotal - discount_amount)
    tax_amount = round_money(taxable * tax_percent / Decimal("100"))
    total_amount = round_money(taxable + tax_amount)

    return {
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
    }
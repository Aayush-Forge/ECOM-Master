import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { ClubbingRuleType } from '../generated/prisma/enums.js';

export interface CartLineItemInput {
  id: string;
  productId: string;
  quantity: number;
  product: {
    categoryId: string;
    basePrice: Prisma.Decimal;
    salePrice: Prisma.Decimal | null;
  };
}

export interface ActiveClubbingRuleInput {
  name: string;
  type: ClubbingRuleType;
  requiredQuantity: number;
  fixedPrice: Prisma.Decimal | null;
  percentageOff: Prisma.Decimal | null;
  applicableCategoryId: string | null;
  productIds: string[];
}

export interface CartLineItemResult {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  lineSubtotal: string;
  appliedClubbingRule: string | null;
  discount: string;
}

export interface CartCalculationResult {
  items: CartLineItemResult[];
  subtotal: string;
  discountTotal: string;
  taxableAmount: string;
  taxTotal: string;
  grandTotal: string;
}

interface WorkingLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  lineSubtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  appliedClubbingRule: string | null;
}

@Injectable()
export class CartPricingService {
  calculate(
    items: CartLineItemInput[],
    activeRules: ActiveClubbingRuleInput[],
  ): CartCalculationResult {
    const ZERO = new Prisma.Decimal(0);

    const lines: WorkingLine[] = items.map((item) => {
      const unitPrice = item.product.salePrice ?? item.product.basePrice;
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        lineSubtotal: unitPrice.times(item.quantity),
        discount: ZERO,
        appliedClubbingRule: null,
      };
    });

    const subtotal = lines.reduce(
      (sum, line) => sum.plus(line.lineSubtotal),
      ZERO,
    );

    // A product's lines are only ever discounted by one rule per cart
    // calculation, so overlapping rules never double-discount the same units.
    const consumedProductIds = new Set<string>();

    for (const rule of activeRules) {
      const applicableProductIds = new Set(rule.productIds);
      if (rule.applicableCategoryId) {
        for (const item of items) {
          if (item.product.categoryId === rule.applicableCategoryId) {
            applicableProductIds.add(item.productId);
          }
        }
      }
      this.applyRule(rule, applicableProductIds, lines, consumedProductIds);
    }

    const discountTotal = lines.reduce(
      (sum, line) => sum.plus(line.discount),
      ZERO,
    );
    const taxableAmount = subtotal.minus(discountTotal);
    // No tax rate/config exists anywhere in the schema or project yet, so
    // this stays a dedicated, isolated step returning zero until one is
    // defined — see the "not implemented" note in the task write-up.
    const taxTotal = this.calculateTax();
    const grandTotal = taxableAmount.plus(taxTotal);

    return {
      items: lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice.toFixed(2),
        lineSubtotal: line.lineSubtotal.toFixed(2),
        appliedClubbingRule: line.appliedClubbingRule,
        discount: line.discount.toDecimalPlaces(2).toFixed(2),
      })),
      subtotal: subtotal.toFixed(2),
      discountTotal: discountTotal.toDecimalPlaces(2).toFixed(2),
      taxableAmount: taxableAmount.toDecimalPlaces(2).toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      grandTotal: grandTotal.toDecimalPlaces(2).toFixed(2),
    };
  }

  private calculateTax(): Prisma.Decimal {
    return new Prisma.Decimal(0);
  }

  private applyRule(
    rule: ActiveClubbingRuleInput,
    applicableProductIds: Set<string>,
    lines: WorkingLine[],
    consumedProductIds: Set<string>,
  ): void {
    const ZERO = new Prisma.Decimal(0);

    const qualifyingLines = lines.filter(
      (line) =>
        applicableProductIds.has(line.productId) &&
        !consumedProductIds.has(line.productId),
    );

    if (qualifyingLines.length === 0) {
      return;
    }

    const qualifyingQty = qualifyingLines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    );
    if (qualifyingQty < rule.requiredQuantity) {
      return;
    }

    const qualifyingSubtotal = qualifyingLines.reduce(
      (sum, line) => sum.plus(line.lineSubtotal),
      ZERO,
    );

    const bundles = Math.floor(qualifyingQty / rule.requiredQuantity);
    const bundledQty = bundles * rule.requiredQuantity;
    const avgUnitPrice = qualifyingSubtotal.div(qualifyingQty);
    const originalBundledAmount = avgUnitPrice.times(bundledQty);

    let newBundledAmount: Prisma.Decimal | null = null;
    if (rule.type === ClubbingRuleType.FIXED_PRICE_BUNDLE && rule.fixedPrice) {
      newBundledAmount = rule.fixedPrice.times(bundles);
    } else if (
      rule.type === ClubbingRuleType.PERCENTAGE_OFF_BUNDLE &&
      rule.percentageOff
    ) {
      newBundledAmount = originalBundledAmount.times(
        new Prisma.Decimal(100).minus(rule.percentageOff).div(100),
      );
    }

    if (newBundledAmount === null) {
      return;
    }

    const ruleDiscount = Prisma.Decimal.max(
      ZERO,
      originalBundledAmount.minus(newBundledAmount),
    );
    if (ruleDiscount.lessThanOrEqualTo(0)) {
      return;
    }

    for (const line of qualifyingLines) {
      const share = line.lineSubtotal.div(qualifyingSubtotal);
      line.discount = line.discount.plus(ruleDiscount.times(share));
      line.appliedClubbingRule = rule.name;
      consumedProductIds.add(line.productId);
    }
  }
}

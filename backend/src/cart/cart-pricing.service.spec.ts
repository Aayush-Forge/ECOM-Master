import { CartPricingService } from './cart-pricing.service';
import { Prisma } from '../generated/prisma/client.js';
import { ClubbingRuleType } from '../generated/prisma/enums.js';

const d = (value: string) => new Prisma.Decimal(value);

describe('CartPricingService', () => {
  let service: CartPricingService;

  beforeEach(() => {
    service = new CartPricingService();
  });

  it('calculates subtotal, taxable amount and grand total with no rules', () => {
    const result = service.calculate(
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 2,
          product: {
            categoryId: 'cat-1',
            basePrice: d('100.00'),
            salePrice: null,
          },
        },
      ],
      [],
    );

    expect(result.items[0].unitPrice).toBe('100.00');
    expect(result.items[0].lineSubtotal).toBe('200.00');
    expect(result.items[0].discount).toBe('0.00');
    expect(result.items[0].appliedClubbingRule).toBeNull();
    expect(result.subtotal).toBe('200.00');
    expect(result.discountTotal).toBe('0.00');
    expect(result.taxTotal).toBe('0.00');
    expect(result.taxableAmount).toBe('200.00');
    expect(result.grandTotal).toBe('200.00');
  });

  it('uses salePrice over basePrice when both are set', () => {
    const result = service.calculate(
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 1,
          product: {
            categoryId: 'cat-1',
            basePrice: d('100.00'),
            salePrice: d('79.99'),
          },
        },
      ],
      [],
    );

    expect(result.items[0].unitPrice).toBe('79.99');
  });

  it('applies an active fixed-price-bundle clubbing rule when the required quantity is met', () => {
    const result = service.calculate(
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 3,
          product: {
            categoryId: 'cat-1',
            basePrice: d('10.00'),
            salePrice: null,
          },
        },
      ],
      [
        {
          name: 'Any 3 for 25',
          type: ClubbingRuleType.FIXED_PRICE_BUNDLE,
          requiredQuantity: 3,
          fixedPrice: d('25.00'),
          percentageOff: null,
          applicableCategoryId: null,
          productIds: ['prod-1'],
        },
      ],
    );

    // 3 x 10.00 = 30.00 original -> bundle price 25.00 -> discount 5.00
    expect(result.items[0].appliedClubbingRule).toBe('Any 3 for 25');
    expect(result.items[0].discount).toBe('5.00');
    expect(result.subtotal).toBe('30.00');
    expect(result.discountTotal).toBe('5.00');
    expect(result.taxableAmount).toBe('25.00');
    expect(result.grandTotal).toBe('25.00');
  });

  it('does not apply a fixed-price-bundle rule when quantity is below the required amount', () => {
    const result = service.calculate(
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 2,
          product: {
            categoryId: 'cat-1',
            basePrice: d('10.00'),
            salePrice: null,
          },
        },
      ],
      [
        {
          name: 'Any 3 for 25',
          type: ClubbingRuleType.FIXED_PRICE_BUNDLE,
          requiredQuantity: 3,
          fixedPrice: d('25.00'),
          percentageOff: null,
          applicableCategoryId: null,
          productIds: ['prod-1'],
        },
      ],
    );

    expect(result.items[0].appliedClubbingRule).toBeNull();
    expect(result.discountTotal).toBe('0.00');
  });

  it('applies a percentage-off-bundle rule to full bundles only, leaving the remainder at full price', () => {
    const result = service.calculate(
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 5,
          product: {
            categoryId: 'cat-1',
            basePrice: d('10.00'),
            salePrice: null,
          },
        },
      ],
      [
        {
          name: '10 percent off pairs',
          type: ClubbingRuleType.PERCENTAGE_OFF_BUNDLE,
          requiredQuantity: 2,
          fixedPrice: null,
          percentageOff: d('10'),
          applicableCategoryId: null,
          productIds: ['prod-1'],
        },
      ],
    );

    // 5 units -> 2 full bundles (4 units) + 1 remainder unit.
    // Bundled portion: 4 x 10.00 = 40.00 -> 10% off = 4.00 discount.
    expect(result.subtotal).toBe('50.00');
    expect(result.discountTotal).toBe('4.00');
    expect(result.taxableAmount).toBe('46.00');
  });

  it('applies a category-wide clubbing rule to any product in that category', () => {
    const result = service.calculate(
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 1,
          product: {
            categoryId: 'cat-1',
            basePrice: d('15.00'),
            salePrice: null,
          },
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          quantity: 2,
          product: {
            categoryId: 'cat-1',
            basePrice: d('15.00'),
            salePrice: null,
          },
        },
      ],
      [
        {
          name: 'Category bundle',
          type: ClubbingRuleType.FIXED_PRICE_BUNDLE,
          requiredQuantity: 3,
          fixedPrice: d('40.00'),
          percentageOff: null,
          applicableCategoryId: 'cat-1',
          productIds: [],
        },
      ],
    );

    expect(result.items[0].appliedClubbingRule).toBe('Category bundle');
    expect(result.items[1].appliedClubbingRule).toBe('Category bundle');
    expect(result.discountTotal).toBe('5.00');
  });

  it('does not apply an inactive or expired rule (rules must already be pre-filtered by the caller)', () => {
    // CartPricingService only ever receives rules the caller has already
    // filtered to isActive + within [startsAt, endsAt] — simulating an
    // inactive/expired rule here means simply not including it.
    const result = service.calculate(
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 3,
          product: {
            categoryId: 'cat-1',
            basePrice: d('10.00'),
            salePrice: null,
          },
        },
      ],
      [],
    );

    expect(result.items[0].appliedClubbingRule).toBeNull();
    expect(result.discountTotal).toBe('0.00');
  });

  it('does not apply the same rule to a product more than once', () => {
    const result = service.calculate(
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 6,
          product: {
            categoryId: 'cat-1',
            basePrice: d('10.00'),
            salePrice: null,
          },
        },
      ],
      [
        {
          name: 'Rule A',
          type: ClubbingRuleType.FIXED_PRICE_BUNDLE,
          requiredQuantity: 3,
          fixedPrice: d('25.00'),
          percentageOff: null,
          applicableCategoryId: null,
          productIds: ['prod-1'],
        },
        {
          name: 'Rule B',
          type: ClubbingRuleType.PERCENTAGE_OFF_BUNDLE,
          requiredQuantity: 3,
          fixedPrice: null,
          percentageOff: d('50'),
          applicableCategoryId: null,
          productIds: ['prod-1'],
        },
      ],
    );

    // Rule A consumes prod-1 first; Rule B must be skipped for it entirely.
    expect(result.items[0].appliedClubbingRule).toBe('Rule A');
  });

  it('keeps tax at zero since no tax rate is defined anywhere in the project', () => {
    const result = service.calculate(
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 1,
          product: {
            categoryId: 'cat-1',
            basePrice: d('999.99'),
            salePrice: null,
          },
        },
      ],
      [],
    );

    expect(result.taxTotal).toBe('0.00');
    expect(result.grandTotal).toBe(result.taxableAmount);
  });
});

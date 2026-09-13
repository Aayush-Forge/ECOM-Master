import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCartDto } from './create-cart.dto';
import { UpdateCartDto } from './update-cart.dto';

describe('CreateCartDto', () => {
  it('accepts a valid payload', async () => {
    const dto = plainToInstance(CreateCartDto, {
      productId: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 1,
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a non-UUID productId', async () => {
    const dto = plainToInstance(CreateCartDto, {
      productId: 'not-a-uuid',
      quantity: 1,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'productId')).toBe(true);
  });

  it.each([0, -1, 1.5])('rejects an invalid quantity: %p', async (quantity) => {
    const dto = plainToInstance(CreateCartDto, {
      productId: '123e4567-e89b-12d3-a456-426614174000',
      quantity,
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'quantity')).toBe(true);
  });
});

describe('UpdateCartDto', () => {
  it.each([0, -1, 1.5])('rejects an invalid quantity: %p', async (quantity) => {
    const dto = plainToInstance(UpdateCartDto, { quantity });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'quantity')).toBe(true);
  });

  it('accepts a valid quantity', async () => {
    const dto = plainToInstance(UpdateCartDto, { quantity: 3 });

    expect(await validate(dto)).toHaveLength(0);
  });
});

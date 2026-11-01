import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from './pagination-query.dto';

describe('PaginationQueryDto validation', () => {
  it('passes on valid page and limit', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '1', limit: '20' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.getEffectivePage()).toBe(1);
    expect(dto.getEffectiveLimit()).toBe(20);
    expect(dto.getSkip()).toBe(0);
  });

  it('fails on page=0', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '0' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const pageError = errors.find((e) => e.property === 'page');
    expect(pageError?.constraints).toHaveProperty('min');
  });

  it('fails on page=-1', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '-1' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const pageError = errors.find((e) => e.property === 'page');
    expect(pageError?.constraints).toHaveProperty('min');
  });

  it('fails on page=abc', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: 'abc' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const pageError = errors.find((e) => e.property === 'page');
    expect(pageError?.constraints).toHaveProperty('isInt');
  });

  it('fails on limit=0', async () => {
    const dto = plainToInstance(PaginationQueryDto, { limit: '0' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const limitError = errors.find((e) => e.property === 'limit');
    expect(limitError?.constraints).toHaveProperty('min');
  });

  it('fails on limit=100000', async () => {
    const dto = plainToInstance(PaginationQueryDto, { limit: '100000' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const limitError = errors.find((e) => e.property === 'limit');
    expect(limitError?.constraints).toHaveProperty('max');
  });

  it('fails on per_page=0 or per_page=100000', async () => {
    const dtoZero = plainToInstance(PaginationQueryDto, { per_page: '0' });
    const errorsZero = await validate(dtoZero);
    expect(errorsZero.some((e) => e.property === 'per_page')).toBe(true);

    const dtoHuge = plainToInstance(PaginationQueryDto, { per_page: '100000' });
    const errorsHuge = await validate(dtoHuge);
    expect(errorsHuge.some((e) => e.property === 'per_page')).toBe(true);
  });
});

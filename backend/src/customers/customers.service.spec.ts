import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prismaService = {
      $queryRaw: jest.fn(),
      order: {
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new CustomersService(prismaService);
  });

  describe('escapeLike & search handling in getCustomers', () => {
    it('returns empty list without throwing when no matching customers', async () => {
      prismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getCustomers('NonExistentTerm', 1, 20);

      expect(result).toEqual({
        data: [],
        meta: {
          total: 0,
          page: 1,
          perPage: 20,
          totalPages: 0,
        },
      });
      expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('handles wildcard escaping correctly so % and _ are not treated as open wildcards', async () => {
      prismaService.$queryRaw.mockResolvedValueOnce([
        {
          phone_key: '9876543210',
          latest_name: 'Escaped User',
          latest_phone: '9876543210',
          latest_email: 'test@example.com',
          total_count: 1,
        },
      ]);

      const result = await service.getCustomers('100%_promo', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].phoneKey).toBe('9876543210');
      expect(result.meta.total).toBe(1);
    });

    it('groups by phone_key and returns data in proper envelope', async () => {
      prismaService.$queryRaw.mockResolvedValueOnce([
        {
          phone_key: '9238859999',
          latest_name: 'Customer One',
          latest_phone: '+919238859999',
          latest_email: 'c1@example.com',
          total_count: 2,
        },
        {
          phone_key: '9876543210',
          latest_name: 'Customer Two',
          latest_phone: '9876543210',
          latest_email: null,
          total_count: 2,
        },
      ]);

      const result = await service.getCustomers(undefined, 1, 10);

      expect(result.data).toEqual([
        { phoneKey: '9238859999', name: 'Customer One', phone: '+919238859999' },
        { phoneKey: '9876543210', name: 'Customer Two', phone: '9876543210' },
      ]);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        perPage: 10,
        totalPages: 1,
      });
    });
  });

  describe('getCustomerByPhoneKey', () => {
    it('throws BadRequestException if phoneKey is not digits only', async () => {
      await expect(service.getCustomerByPhoneKey('abc')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getCustomerByPhoneKey('+9198765')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when customer phone key does not exist', async () => {
      prismaService.$queryRaw.mockResolvedValueOnce([]);

      await expect(service.getCustomerByPhoneKey('9876543210')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns customer summary and matching orders in getAllOrders shape', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([
          {
            phone_key: '9876543210',
            latest_name: 'Latest Name',
            latest_phone: '+919876543210',
            latest_email: 'cust@example.com',
            total_count: 1,
          },
        ])
        .mockResolvedValueOnce([
          { order_id: 'ord-1' },
          { order_id: 'ord-2' },
        ]);

      (prismaService.order.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'ord-1', orderNumber: 'ORD-1' },
        { id: 'ord-2', orderNumber: 'ORD-2' },
      ]);

      const result = await service.getCustomerByPhoneKey('9876543210', 1, 20);

      expect(result.customer).toEqual({
        phoneKey: '9876543210',
        name: 'Latest Name',
        phone: '+919876543210',
        email: 'cust@example.com',
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });
});

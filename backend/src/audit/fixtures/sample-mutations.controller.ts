import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { AuditLog } from '../decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../interceptors/audit-log.interceptor';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ROLES } from '../../auth/roles.constants';

/**
 * =========================================================================
 * TEST / DEMO FIXTURE CONTROLLER ONLY
 * =========================================================================
 * This controller serves as an integration and testing fixture to prove the
 * `@AuditLog` interceptor and decorator wiring across all critical mutation
 * types.
 *
 * It is NOT the production business logic implementation for Products,
 * Orders, or Discounts.
 *
 * NOTE: JwtAuthGuard + RolesGuard are applied globally via APP_GUARD.
 * No explicit @UseGuards() is needed.
 * =========================================================================
 */
@Controller('test-mutations')
@UseInterceptors(AuditLogInterceptor)
export class SampleMutationsFixtureController {
  // 1. Product Mutations
  @Post('products')
  @Roles(ROLES.EDITOR)
  @AuditLog('product.created')
  createProduct(@Body() body: any) {
    return {
      id: body.id || 'prod_new_01',
      title: body.title || 'New Product',
      basePrice: body.basePrice || 499,
      status: 'active',
    };
  }

  @Put('products/:id/price')
  @Roles(ROLES.EDITOR)
  @AuditLog('product.price_updated')
  updateProductPrice(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    // Attach simulated before entity to request context
    req.beforeValue = {
      id,
      title: 'Premium Sandalwood Agarbatti',
      basePrice: 499,
      salePrice: 449,
    };

    return {
      id,
      title: 'Premium Sandalwood Agarbatti',
      basePrice: body.basePrice,
      salePrice: body.salePrice || body.basePrice,
    };
  }

  @Delete('products/:id')
  @Roles(ROLES.ADMIN)
  @AuditLog('product.deleted')
  deleteProduct(@Param('id') id: string, @Req() req: any) {
    req.beforeValue = { id, title: 'Discontinued Item', basePrice: 299 };
    return { success: true, deletedId: id };
  }

  // 2. Order Status Transitions
  @Patch('orders/:id/status')
  @Roles(ROLES.READ_ONLY)
  @AuditLog('order.status_changed')
  updateOrderStatus(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    req.beforeValue = { id, status: 'pending', paymentStatus: 'paid' };
    return {
      id,
      status: body.status || 'processing',
      paymentStatus: 'paid',
    };
  }

  // 3. Refund Issuance
  @Post('orders/:id/refund')
  @Roles(ROLES.EDITOR)
  @AuditLog('refund.issued')
  issueRefund(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    req.beforeValue = { id, paymentStatus: 'paid', refundedAmount: 0 };
    return {
      id,
      paymentStatus: 'refunded',
      refundedAmount: body.amount || 599,
      reason: body.reason || 'Customer request',
    };
  }

  // 4. Discount Mutations
  @Post('discounts')
  @Roles(ROLES.EDITOR)
  @AuditLog('discount.created')
  createDiscount(@Body() body: any) {
    return {
      id: body.id || 'disc_new_01',
      name: body.name || 'Festival Discount',
      percentageOff: body.percentageOff || 10,
    };
  }

  @Put('discounts/:id')
  @Roles(ROLES.EDITOR)
  @AuditLog('discount.updated')
  updateDiscount(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    req.beforeValue = { id, name: 'Festival Discount', percentageOff: 10 };
    return {
      id,
      name: body.name,
      percentageOff: body.percentageOff,
    };
  }

  @Delete('discounts/:id')
  @Roles(ROLES.EDITOR)
  @AuditLog('discount.deleted')
  deleteDiscount(@Param('id') id: string, @Req() req: any) {
    req.beforeValue = { id, name: 'Old Discount', percentageOff: 15 };
    return { success: true, deletedId: id };
  }

  // 5. User Role Changes
  @Patch('users/:id/role')
  @Roles(ROLES.ADMIN)
  @AuditLog('user.role_changed')
  updateUserRole(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    req.beforeValue = { id, role: 'customer' };
    return {
      id,
      role: body.role || 'editor',
    };
  }

  // 6. Inventory Changes
  @Patch('inventory/:productId')
  @Roles(ROLES.EDITOR)
  @AuditLog('inventory.updated')
  updateInventory(
    @Param('productId') productId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    req.beforeValue = { productId, stockQuantity: 20 };
    return {
      productId,
      stockQuantity: body.stockQuantity || 50,
    };
  }
}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsProcessor } from './payments.processor';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'payments' })],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsProcessor, AuthGuard, PrismaService],
})
export class PaymentsModule {}

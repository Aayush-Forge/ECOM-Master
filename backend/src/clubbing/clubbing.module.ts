import { Module } from '@nestjs/common';
import { ClubbingController } from './clubbing.controller';
import { ClubbingService } from './clubbing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClubbingController],
  providers: [ClubbingService],
  exports: [ClubbingService],
})
export class ClubbingModule {}
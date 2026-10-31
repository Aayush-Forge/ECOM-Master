import {
  Controller,
  Get,
  Header,
  Query,
  Res,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingQueryDto } from './dto/accounting-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { Public } from '../auth/decorators/public.decorator';

@Controller('admin/accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Roles(ROLES.ADMIN)
  @Get('summary')
  getSummary(@Query() query: AccountingQueryDto) {
    return this.accountingService.getFinancialSummary(query);
  }

  @Roles(ROLES.ADMIN)
  @Get('daily-breakdown')
  getDailyBreakdown(@Query() query: AccountingQueryDto) {
    return this.accountingService.getDailyBreakdown(query);
  }

  @Roles(ROLES.ADMIN)
  @Get('orders')
  getLedgerOrders(@Query() query: AccountingQueryDto) {
    return this.accountingService.getLedgerOrders(query);
  }

  @Roles(ROLES.ADMIN)
  @Get('export-csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="sridattam-financial-ledger.csv"')
  async exportCsv(@Query() query: AccountingQueryDto, @Res() res: any) {
    const csvData = await this.accountingService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sridattam-financial-ledger.csv"');
    return res.status(200).send(csvData);
  }
}

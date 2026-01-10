import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/models/user.model';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  getMonthlyReport(
    @GetUser() user: User,
    @Query() filters: ReportFilterDto,
  ) {
    return this.reportsService.getMonthlyReport(user.id, filters);
  }

  @Get('by-category')
  getByCategory(@GetUser() user: User, @Query() filters: ReportFilterDto) {
    return this.reportsService.getByCategory(user.id, filters);
  }

  @Get('trends')
  getTrends(@GetUser() user: User, @Query() filters: ReportFilterDto) {
    return this.reportsService.getTrends(user.id, filters);
  }
}


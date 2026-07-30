import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/models/user.model';
import { MsiService } from './msi.service';
import { MsiGroupStatus, MsiGroupSummary, YearlyProjectionResponse } from './dto/msi.dto';

@Controller('msi')
@UseGuards(JwtAuthGuard)
export class MsiController {
  constructor(private readonly msiService: MsiService) {}

  @Get('groups')
  getGroups(
    @GetUser() user: User,
    @Query('cardId') cardId?: string,
    @Query('status') status?: MsiGroupStatus,
  ): Promise<MsiGroupSummary[]> {
    return this.msiService.getMsiGroups(user.id, { cardId, status });
  }

  @Get('projection/:year')
  getYearlyProjection(
    @Param('year', ParseIntPipe) year: number,
    @GetUser() user: User,
  ): Promise<YearlyProjectionResponse> {
    return this.msiService.getYearlyProjection(user.id, year);
  }
}

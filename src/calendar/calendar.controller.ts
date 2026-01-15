import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { MonthlyCalendarResponse, YearlyProjectionResponse } from './dto/calendar.dto';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('month/:year/:month')
  async getMonthlyCalendar(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Request() req: { user: { id: string } },
  ): Promise<MonthlyCalendarResponse> {
    return this.calendarService.getMonthlyCalendar(req.user.id, year, month);
  }

  @Get('year/:year')
  async getYearlyProjection(
    @Param('year', ParseIntPipe) year: number,
    @Request() req: { user: { id: string } },
  ): Promise<YearlyProjectionResponse> {
    return this.calendarService.getYearlyProjection(req.user.id, year);
  }
}

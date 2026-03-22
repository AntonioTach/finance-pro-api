import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/models/user.model';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Post()
  create(@GetUser() user: User, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user.id, dto);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.budgetsService.findAll(user.id);
  }

  @Get('dashboard')
  getDashboard(@GetUser() user: User) {
    return this.budgetsService.getDashboard(user.id);
  }

  @Get('suggestions')
  getSuggestions(@GetUser() user: User) {
    return this.budgetsService.getSuggestions(user.id);
  }

  @Get('alerts')
  getAlerts(@GetUser() user: User) {
    return this.budgetsService.getAlerts(user.id);
  }

  @Patch('alerts/read-all')
  markAllAlertsRead(@GetUser() user: User) {
    return this.budgetsService.markAllAlertsRead(user.id);
  }

  @Patch('alerts/:alertId/read')
  markAlertRead(@Param('alertId') alertId: string, @GetUser() user: User) {
    return this.budgetsService.markAlertRead(alertId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.budgetsService.findOne(id, user.id);
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string, @GetUser() user: User) {
    return this.budgetsService.getProgress(id, user.id);
  }

  @Get(':id/transactions')
  getPeriodTransactions(@Param('id') id: string, @GetUser() user: User) {
    return this.budgetsService.getPeriodTransactions(id, user.id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @GetUser() user: User) {
    return this.budgetsService.getHistory(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.budgetsService.remove(id, user.id);
  }
}

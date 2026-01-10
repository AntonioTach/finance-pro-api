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
import { CardsService } from './cards.service';
import { CardSummaryService } from './card-summary.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/models/user.model';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly cardSummaryService: CardSummaryService,
  ) {}

  @Post()
  create(@GetUser() user: User, @Body() createCardDto: CreateCardDto) {
    return this.cardsService.create(user.id, createCardDto);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.cardsService.findAll(user.id);
  }

  @Get('summary')
  getSummary(@GetUser() user: User) {
    return this.cardSummaryService.getAllCardsSummary(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.cardsService.findOne(id, user.id);
  }

  @Get(':id/summary')
  getCardSummary(@Param('id') id: string, @GetUser() user: User) {
    return this.cardSummaryService.getCardSummary(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() updateCardDto: UpdateCardDto,
  ) {
    return this.cardsService.update(id, user.id, updateCardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.cardsService.remove(id, user.id);
  }
}

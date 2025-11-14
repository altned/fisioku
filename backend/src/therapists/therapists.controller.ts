import { Controller, Get, Query } from '@nestjs/common';
import { ListTherapistsQueryDto } from './dto/list-therapists-query.dto';
import { TherapistsService } from './therapists.service';

@Controller({
  path: 'therapists',
  version: '1',
})
export class TherapistsController {
  constructor(private readonly therapistsService: TherapistsService) {}

  @Get()
  list(@Query() query: ListTherapistsQueryDto) {
    return this.therapistsService.list(query);
  }
}

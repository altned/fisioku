import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should return health payload', () => {
    const response = appController.getStatus();
    expect(response.status).toBe('ok');
    expect(response.timestamp).toBeDefined();
  });
});

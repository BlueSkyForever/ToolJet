import { Body, Controller, Param, Post, UnauthorizedException } from '@nestjs/common';
import { OauthService } from '../services/oauth/oauth.service';

@Controller('oauth')
export class OauthController {
  constructor(private oauthService: OauthService) {}

  @Post('sign-in/:configId')
  async create(@Param('configId') configId, @Body() body) {
    if (!configId) {
      throw new UnauthorizedException();
    }
    const result = await this.oauthService.signIn(body, configId);
    return result;
  }
}

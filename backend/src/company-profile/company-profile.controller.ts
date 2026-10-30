import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompanyProfileService } from './company-profile.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class CompanyProfileController {
  constructor(private readonly service: CompanyProfileService) {}

  @Public()
  @Get('company-profile/public')
  async getPublicProfile() {
    return this.service.getPublicProfile();
  }

  @Get('admin/company-profile')
  @Roles('admin')
  async getAdminProfile() {
    return this.service.getProfile();
  }

  @Patch('admin/company-profile')
  @Roles('admin')
  async updateProfile(
    @Body() dto: UpdateCompanyProfileDto,
    @Req() req: any,
  ) {
    return this.service.updateProfile(dto, req?.user);
  }

  @Get('admin/company-profile/documents')
  @Roles('admin')
  async getDocuments() {
    return this.service.getDocuments();
  }

  @Post('admin/company-profile/documents/upload')
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @Body('title') title: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.service.addDocument(title, file, req?.user);
  }

  @Delete('admin/company-profile/documents/:id')
  @Roles('admin')
  async deleteDocument(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteDocument(id, req?.user);
  }
}


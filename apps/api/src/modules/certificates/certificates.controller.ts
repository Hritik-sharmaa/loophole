import { Controller, Get, Param } from '@nestjs/common';
import type { CertificateSummary, PublicCertificate } from '@loophole/shared';
import type { AuthUser } from '../../integrations/supabase-auth.client.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { CertificatesService } from './certificates.service.js';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get()
  listMine(@CurrentUser() user: AuthUser): Promise<CertificateSummary[]> {
    return this.certificates.listMine(user.id);
  }

  // The shareable /c/:slug page reads this without logging in (FR-15).
  @Public()
  @Get(':slug')
  getPublic(@Param('slug') slug: string): Promise<PublicCertificate> {
    return this.certificates.getPublic(slug);
  }
}

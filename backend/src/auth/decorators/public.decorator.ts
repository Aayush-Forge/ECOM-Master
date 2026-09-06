import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../roles.constants';

/**
 * Custom decorator to mark a route handler or class as publicly accessible
 * with no authentication/roles required.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

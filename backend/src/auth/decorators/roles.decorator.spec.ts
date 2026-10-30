import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorator';
import { ROLES_KEY } from '../roles.constants';

describe('Roles Decorator', () => {
  it('should set metadata for roles', () => {
    class TestController {
      @Roles('admin', 'editor')
      testMethod() {}
    }

    const reflector = new Reflector();
    const metadata = reflector.get<string[]>(
      ROLES_KEY,
      TestController.prototype.testMethod,
    );

    expect(metadata).toEqual(['admin', 'editor']);
  });
});

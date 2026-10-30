import { Reflector } from '@nestjs/core';
import { Public } from './public.decorator';
import { IS_PUBLIC_KEY } from '../roles.constants';

describe('Public Decorator', () => {
  it('should set isPublic metadata to true on method', () => {
    class TestController {
      @Public()
      publicMethod() {}
    }

    const reflector = new Reflector();
    const isPublic = reflector.get<boolean>(
      IS_PUBLIC_KEY,
      TestController.prototype.publicMethod,
    );

    expect(isPublic).toBe(true);
  });

  it('should set isPublic metadata to true on class', () => {
    @Public()
    class TestController {}

    const reflector = new Reflector();
    const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, TestController);

    expect(isPublic).toBe(true);
  });
});

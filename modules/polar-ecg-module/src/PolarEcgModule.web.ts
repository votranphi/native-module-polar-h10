import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './PolarEcgModule.types';

type PolarEcgModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class PolarEcgModule extends NativeModule<PolarEcgModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(PolarEcgModule, 'PolarEcgModule');

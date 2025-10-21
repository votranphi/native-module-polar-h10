import { NativeModule, requireNativeModule } from 'expo';

import { PolarEcgModuleEvents } from './PolarEcgModule.types';

declare class PolarEcgModule extends NativeModule<PolarEcgModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<PolarEcgModule>('PolarEcgModule');
